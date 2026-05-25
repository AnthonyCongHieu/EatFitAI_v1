using System.Net.Http;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Helpers;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace EatFitAI.API.Services;

public sealed class RecipeGuideService : IRecipeGuideService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    private readonly EatFitAIDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IMemoryCache _cache;
    private readonly ILogger<RecipeGuideService> _logger;

    public RecipeGuideService(
        EatFitAIDbContext db,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IMemoryCache cache,
        ILogger<RecipeGuideService> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _cache = cache;
        _logger = logger;
    }

    public async Task<RecipeCookingGuideDto?> GetCookingGuideAsync(
        int recipeId,
        CancellationToken cancellationToken = default)
    {
        return await GetCookingGuideCoreAsync(recipeId, cancellationToken, beforeGenerateAsync: null);
    }

    public async Task<RecipeCookingGuideDto?> GetCookingGuideAsync(
        int recipeId,
        CancellationToken cancellationToken,
        Func<CancellationToken, Task> beforeGenerateAsync)
    {
        return await GetCookingGuideCoreAsync(recipeId, cancellationToken, beforeGenerateAsync);
    }

    private async Task<RecipeCookingGuideDto?> GetCookingGuideCoreAsync(
        int recipeId,
        CancellationToken cancellationToken,
        Func<CancellationToken, Task>? beforeGenerateAsync)
    {
        var recipe = await _db.Recipes
            .Include(item => item.RecipeIngredients)
            .ThenInclude(item => item.FoodItem)
            .FirstOrDefaultAsync(item => item.RecipeId == recipeId, cancellationToken);
        if (recipe == null)
        {
            return null;
        }

        var cacheKey = $"RecipeCookingGuide:{recipeId}:{recipe.UpdatedAt:O}";
        if (_cache.TryGetValue(cacheKey, out RecipeCookingGuideDto? cached) && cached != null)
        {
            return cached;
        }

        var stored = BuildStoredGuide(recipe);
        bool isCurated = recipe.CredibilityScore >= 74 && stored != null && stored.SourceUrls.Count > 0;
        if (stored != null && (IsFresh(recipe.EnhancedAt) || isCurated) && IsUsableStoredGuide(stored))
        {
            stored.GuideStatus = "stored";
            _cache.Set(cacheKey, stored, TimeSpan.FromHours(6));
            return stored;
        }

        if (beforeGenerateAsync != null)
        {
            await beforeGenerateAsync(cancellationToken);
        }

        var generated = await TryGenerateGuideAsync(recipe, cancellationToken);
        if (generated != null)
        {
            PersistGuide(recipe, generated);
            await _db.SaveChangesAsync(cancellationToken);
            _cache.Set(cacheKey, generated, TimeSpan.FromHours(6));
            return generated;
        }

        if (stored != null)
        {
            stored.GuideStatus = "stale";
            return stored;
        }

        return BuildFallbackGuide(recipe);
    }

    private async Task<RecipeCookingGuideDto?> TryGenerateGuideAsync(
        Recipe recipe,
        CancellationToken cancellationToken)
    {
        var aiProviderUrl = AiProviderUrlResolver.GetVisionBaseUrl(_configuration);
        using var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(60);

        var payload = new
        {
            recipeName = recipe.RecipeName,
            description = recipe.Description ?? string.Empty,
            ingredients = recipe.RecipeIngredients
                .Where(item => item.FoodItem != null && !item.FoodItem.IsDeleted && item.FoodItem.IsActive)
                .Select(item => new
                {
                    foodName = item.FoodItem.FoodName,
                    grams = item.Grams
                })
                .ToList()
        };

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"{aiProviderUrl}/cooking-guide")
        {
            Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json")
        };
        AiProviderRequestHelper.AddInternalTokenHeader(request, _configuration, _logger);

        try
        {
            using var response = await client.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "AI provider cooking guide request failed with status {StatusCode}",
                    response.StatusCode);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var guide = JsonSerializer.Deserialize<RecipeCookingGuideDto>(json, JsonOptions);
            if (!IsUsableGeneratedGuide(guide))
            {
                _logger.LogWarning("AI provider cooking guide response was missing required grounded fields");
                return null;
            }

            guide!.RecipeId = recipe.RecipeId;
            guide.GuideStatus = string.IsNullOrWhiteSpace(guide.GuideStatus)
                ? "generated"
                : guide.GuideStatus;
            return guide;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(ex, "AI provider cooking guide request failed");
            return null;
        }
    }

    private RecipeCookingGuideDto? BuildStoredGuide(Recipe recipe)
    {
        if (string.IsNullOrWhiteSpace(recipe.InstructionsJson))
        {
            return null;
        }

        List<string> steps = [];
        List<string> prepItems = [];
        List<string> seasonings = [];
        string? cookingMethod = null;
        List<string> tips = [];

        try
        {
            var trimmed = recipe.InstructionsJson.Trim();
            if (trimmed.StartsWith('{'))
            {
                var parsed = JsonSerializer.Deserialize<StoredInstructionsJsonDto>(trimmed, JsonOptions);
                steps = parsed?.Steps ?? [];
                prepItems = parsed?.PrepItems ?? [];
                seasonings = parsed?.Seasonings ?? [];
                cookingMethod = parsed?.CookingMethod;
                tips = parsed?.Tips ?? [];
            }
            else
            {
                steps = JsonSerializer.Deserialize<List<string>>(trimmed, JsonOptions) ?? [];
                prepItems = steps.Take(2).ToList();
            }
        }
        catch (JsonException)
        {
            steps = recipe.InstructionsJson
                .Split(new[] { "\r\n", "\n", "\r" }, StringSplitOptions.RemoveEmptyEntries)
                .Select(item => item.Trim())
                .Where(item => !string.IsNullOrWhiteSpace(item))
                .ToList();
            prepItems = steps.Take(2).ToList();
        }

        if (steps.Count == 0)
        {
            return null;
        }

        return new RecipeCookingGuideDto
        {
            RecipeId = recipe.RecipeId,
            Steps = steps,
            CookingTimeMinutes = recipe.CookTimeMinutes,
            Difficulty = recipe.Difficulty,
            SourceUrls = ParseStringList(recipe.SourceUrlsJson),
            YoutubeVideo = !IsDirectYoutubeVideoUrl(recipe.VideoUrl)
                ? null
                : new RecipeYoutubeVideoDto { Url = recipe.VideoUrl },
            PrepItems = prepItems,
            Seasonings = seasonings,
            CookingMethod = cookingMethod,
            Tips = tips
        };
    }

    private RecipeCookingGuideDto BuildFallbackGuide(Recipe recipe)
    {
        var ingredientNames = recipe.RecipeIngredients
            .Where(item => item.FoodItem != null && !item.FoodItem.IsDeleted && item.FoodItem.IsActive)
            .Select(item => item.FoodItem.FoodName)
            .Take(4)
            .ToList();
        var ingredientText = ingredientNames.Count == 0
            ? "các nguyên liệu đã chuẩn bị"
            : string.Join(", ", ingredientNames);

        return new RecipeCookingGuideDto
        {
            RecipeId = recipe.RecipeId,
            CookingTimeMinutes = recipe.CookTimeMinutes,
            Difficulty = recipe.Difficulty ?? "Dễ",
            Steps =
            [
                $"Sơ chế và cân định lượng {ingredientText}.",
                $"Làm nóng chảo hoặc nồi, sau đó nấu món {recipe.RecipeName} ở lửa vừa.",
                "Nếm lại, điều chỉnh gia vị và hoàn thiện món ăn trước khi dùng."
            ],
            PrepItems =
            [
                $"Chuẩn bị {ingredientText}.",
                "Rửa sạch, để ráo và cắt thái trước khi nấu."
            ],
            GuideStatus = "fallback"
        };
    }

    private static bool IsUsableGeneratedGuide(RecipeCookingGuideDto? guide)
    {
        return IsSourceBackedGuide(guide);
    }

    private static bool IsUsableStoredGuide(RecipeCookingGuideDto guide)
    {
        return IsSourceBackedGuide(guide);
    }

    private static bool IsSourceBackedGuide(RecipeCookingGuideDto? guide)
    {
        if (guide is not { Steps.Count: >= 3, SourceUrls.Count: > 0 })
        {
            return false;
        }

        return string.IsNullOrWhiteSpace(guide.YoutubeVideo?.Url)
            || IsDirectYoutubeVideoUrl(guide.YoutubeVideo.Url);
    }

    private bool IsFresh(DateTime? enhancedAt)
    {
        if (!enhancedAt.HasValue)
        {
            return false;
        }

        var ttlHours = _configuration.GetValue<int?>("RecipeGuides:PersistedTtlHours") ?? 168;
        return enhancedAt.Value >= DateTime.UtcNow.AddHours(-ttlHours);
    }

    private static void PersistGuide(Recipe recipe, RecipeCookingGuideDto guide)
    {
        var instructionsObj = new
        {
            steps = guide.Steps,
            prepItems = guide.PrepItems,
            seasonings = guide.Seasonings,
            cookingMethod = guide.CookingMethod ?? "Khác",
            tips = guide.Tips
        };
        recipe.InstructionsJson = JsonSerializer.Serialize(instructionsObj, JsonOptions);
        recipe.CookTimeMinutes = guide.CookingTimeMinutes ?? recipe.CookTimeMinutes;
        recipe.Difficulty = guide.Difficulty ?? recipe.Difficulty;
        recipe.SourceUrlsJson = JsonSerializer.Serialize(guide.SourceUrls, JsonOptions);
        recipe.VideoUrl = IsDirectYoutubeVideoUrl(guide.YoutubeVideo?.Url)
            ? guide.YoutubeVideo!.Url
            : null;
        recipe.EnhancedAt = DateTime.UtcNow;
        recipe.UpdatedAt = DateTime.UtcNow;
    }

    private static bool IsDirectYoutubeVideoUrl(string? url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)
            || uri.Scheme != Uri.UriSchemeHttps)
        {
            return false;
        }

        var host = uri.Host.StartsWith("www.", StringComparison.OrdinalIgnoreCase)
            ? uri.Host[4..]
            : uri.Host;
        var path = uri.AbsolutePath.Trim('/');

        if (host.Equals("youtu.be", StringComparison.OrdinalIgnoreCase))
        {
            return IsPlausibleYoutubeVideoId(path);
        }

        if (!host.Equals("youtube.com", StringComparison.OrdinalIgnoreCase)
            && !host.Equals("m.youtube.com", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (path.Equals("watch", StringComparison.OrdinalIgnoreCase))
        {
            return IsPlausibleYoutubeVideoId(GetQueryParameter(uri, "v"));
        }

        if (path.StartsWith("embed/", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("shorts/", StringComparison.OrdinalIgnoreCase))
        {
            var videoId = path.Split('/', StringSplitOptions.RemoveEmptyEntries).Skip(1).FirstOrDefault();
            return IsPlausibleYoutubeVideoId(videoId);
        }

        return false;
    }

    private static string? GetQueryParameter(Uri uri, string name)
    {
        var query = uri.Query.TrimStart('?');
        if (string.IsNullOrWhiteSpace(query))
        {
            return null;
        }

        foreach (var pair in query.Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var parts = pair.Split('=', 2);
            var key = Uri.UnescapeDataString(parts[0].Replace("+", " "));
            if (!key.Equals(name, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            return parts.Length == 2
                ? Uri.UnescapeDataString(parts[1].Replace("+", " "))
                : string.Empty;
        }

        return null;
    }

    private static bool IsPlausibleYoutubeVideoId(string? videoId)
    {
        if (string.IsNullOrWhiteSpace(videoId) || videoId.Length < 3)
        {
            return false;
        }

        if (videoId.StartsWith("F5D4X3R9", StringComparison.OrdinalIgnoreCase) ||
            videoId.StartsWith("F5E4X3R9", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return videoId.All(ch => char.IsLetterOrDigit(ch) || ch is '_' or '-');
    }

    private static List<string> ParseStringList(string? rawValue)
    {
        if (string.IsNullOrWhiteSpace(rawValue))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<List<string>>(rawValue, JsonOptions)?
                .Select(item => item?.Trim())
                .Where(item => !string.IsNullOrWhiteSpace(item))
                .Select(item => item!)
                .ToList() ?? [];
        }
        catch (JsonException)
        {
            return rawValue
                .Split(new[] { "\r\n", "\n", "\r" }, StringSplitOptions.RemoveEmptyEntries)
                .Select(item => item.Trim())
                .Where(item => !string.IsNullOrWhiteSpace(item))
                .ToList();
        }
    }

    private class StoredInstructionsJsonDto
    {
        public List<string> Steps { get; set; } = new();
        public List<string> PrepItems { get; set; } = new();
        public List<string> Seasonings { get; set; } = new();
        public string? CookingMethod { get; set; }
        public List<string> Tips { get; set; } = new();
    }
}
