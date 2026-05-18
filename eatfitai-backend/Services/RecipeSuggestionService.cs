using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using EatFitAI.API.Data;
using EatFitAI.API.DbScaffold.Data; // FIX: Using EatFitAIDbContext (scaffolded)
using EatFitAI.API.DbScaffold.Models; // FIX: Using scaffolded Models
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Services.Interfaces;
using EatFitAI.API.DTOs.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace EatFitAI.API.Services
{
    /// <summary>
    /// Database-only recipe suggestion service with caching
    /// Finds recipes that match available ingredients and user preferences
    /// </summary>
    public class RecipeSuggestionService : IRecipeSuggestionService
    {
        private readonly EatFitAIDbContext _db; // FIX: Đổi sang EatFitAIDbContext
        private readonly ILogger<RecipeSuggestionService> _logger;
        private readonly IMemoryCache _cache;
        private readonly IUserPreferenceService _userPreferenceService;
        private readonly IRecipeGuideService? _recipeGuideService;
        
        // Cache configuration
        private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(10);
        private const string AllRecipesCacheKey = "AllRecipesWithIngredients";
        private const string RecipeDisclaimer =
            "Gợi ý do EatFitAI và AI hỗ trợ tổng hợp, chỉ mang tính tham khảo; không phải khuyến nghị của chuyên gia dinh dưỡng, bác sĩ hoặc đầu bếp chuyên nghiệp.";

        public RecipeSuggestionService(
            EatFitAIDbContext db, // FIX: Đổi sang EatFitAIDbContext
            ILogger<RecipeSuggestionService> logger,
            IMemoryCache cache,
            IUserPreferenceService userPreferenceService,
            IRecipeGuideService? recipeGuideService = null)
        {
            _db = db;
            _logger = logger;
            _cache = cache;
            _userPreferenceService = userPreferenceService;
            _recipeGuideService = recipeGuideService;
        }

        public async Task<List<RecipeSuggestionDto>> SuggestRecipesAsync(
            RecipeSuggestionRequest request,
            CancellationToken cancellationToken = default)
        {
            var query = BuildIngredientQuery(request);
            var mode = NormalizeMode(request.Mode);
            var rawInputKeys = BuildRawInputKeys(request);
            var hasFinishedDishInput = rawInputKeys.Any(RecipeIngredientEligibility.IsFinishedDishKey);
            var hasFinishedDishFoodItemInput = mode == "auto" && !hasFinishedDishInput
                && await HasFinishedDishFoodItemInputAsync(query, cancellationToken);
            var useDailyRecommendation = mode == "daily_recommendation"
                || (mode == "auto" && (hasFinishedDishInput
                    || hasFinishedDishFoodItemInput
                    || (query.NameKeys.Count == 0 && query.FoodItemIds.Count == 0)));

            if (!useDailyRecommendation && query.NameKeys.Count == 0 && query.FoodItemIds.Count == 0)
            {
                return new List<RecipeSuggestionDto>();
            }

            // Get user preferences for filtering (with error handling)
            // NOTE: UserPreferenceService dùng ApplicationDbContext, có thể fail
            UserPreferenceDto? userPrefs = null;
            if (request.UserId.HasValue)
            {
                try
                {
                    userPrefs = await _userPreferenceService.GetUserPreferenceAsync(request.UserId.Value, cancellationToken);
                }
                catch (Exception ex)
                {
                    // Log warning nhưng không crash - recipe suggestion vẫn hoạt động
                    _logger.LogWarning(ex, "Failed to get user preferences for UserId {UserId}, continuing without dietary restrictions", request.UserId.Value);
                }
            }

            var forbiddenKeywords = GetForbiddenIngredientKeys(userPrefs);
            var minMatchedIngredients = Math.Max(1, request.MinMatchedIngredients ?? 1);
            var maxResults = Math.Clamp(request.MaxResults, 1, 20);
            var inputFoodItemNames = await LoadInputFoodItemNamesAsync(query.FoodItemIds, cancellationToken);
            var inputIngredientNames = BuildInputIngredientDisplayNames(request, inputFoodItemNames);
            if (useDailyRecommendation && request.UserId.HasValue)
            {
                await PopulateRemainingNutritionAsync(request, request.UserId.Value, cancellationToken);
            }

            _logger.LogInformation("Searching recipes (User: {UserId}, Forbidden keywords: {ForbiddenCount})", 
                request.UserId, forbiddenKeywords.Count);

            var recipesWithIngredients = await _cache.GetOrCreateAsync(
                AllRecipesCacheKey,
                async entry =>
                {
                    entry.AbsoluteExpirationRelativeToNow = CacheDuration;
                    return await _db.Recipes
                        .Include(r => r.RecipeIngredients)
                        .ThenInclude(ri => ri.FoodItem)
                        .AsNoTracking()
                        .ToListAsync(cancellationToken);
                }) ?? new List<Recipe>();

            var recipeSuggestions = new List<RecipeSuggestionDto>();

            foreach (var recipe in recipesWithIngredients)
            {
                if (request.MaxCookingTimeMinutes.HasValue
                    && (!recipe.CookTimeMinutes.HasValue
                        || recipe.CookTimeMinutes.Value > request.MaxCookingTimeMinutes.Value))
                {
                    continue;
                }

                var recipeIngredients = recipe.RecipeIngredients
                    .Where(ri => ri.FoodItem != null
                        && !ri.FoodItem.IsDeleted
                        && ri.FoodItem.IsActive
                        && RecipeIngredientEligibility.IsIngredientFood(ri.FoodItem))
                    .ToList();

                if (recipeIngredients.Count == 0) continue;

                // 1. Dietary/Allergy Filtering
                if (forbiddenKeywords.Any())
                {
                    var isForbidden = recipeIngredients.Any(ingredient =>
                        GetIngredientKeys(ingredient.FoodItem).Any(forbiddenKeywords.Contains));
                    if (isForbidden) continue;
                }

                // 2. Ingredient Matching
                var matchedIngredients = useDailyRecommendation
                    ? new List<IngredientMatchCandidate>()
                    : recipeIngredients
                        .Select(ingredient => new
                        {
                            Ingredient = ingredient,
                            Match = MatchIngredient(ingredient, query)
                        })
                        .Where(item => item.Match != null)
                        .Select(item => new IngredientMatchCandidate(item.Ingredient, item.Match!))
                        .ToList();

                var matchCount = matchedIngredients.Count;

                if (!useDailyRecommendation && matchCount < minMatchedIngredients) continue;

                var (calories, protein, carbs, fat) = CalculateRecipeNutrition(recipeIngredients);
                var totalGrams = CalculateTotalGrams(recipeIngredients);
                var matchedIngredientIds = matchedIngredients
                    .Select(item => item.Ingredient.FoodItemId)
                    .ToHashSet();
                var missingIngredients = recipeIngredients
                    .Where(ingredient => !matchedIngredientIds.Contains(ingredient.FoodItemId))
                    .Select(ingredient => ingredient.FoodItem.FoodName)
                    .ToList();
                var matchedIngredientKeys = matchedIngredients
                    .SelectMany(item => GetIngredientKeys(item.Ingredient.FoodItem))
                    .ToHashSet(StringComparer.Ordinal);
                var extraIngredients = useDailyRecommendation
                    ? new List<string>()
                    : inputIngredientNames
                        .Where(inputName => !InputNameMatchesIngredientKeys(inputName, matchedIngredientKeys))
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .ToList();
                var requiredIngredients = recipeIngredients
                    .Select(ingredient => ingredient.FoodItem.FoodName)
                    .ToList();
                var matchPercentage = !useDailyRecommendation && recipeIngredients.Count > 0
                    ? ((decimal)matchCount / recipeIngredients.Count) * 100m
                    : 0m;
                var score = useDailyRecommendation
                    ? CalculateDailyRecommendationScore(request, recipe, calories, protein, carbs, fat)
                    : CalculateMatchScore(
                        request,
                        recipe,
                        recipeIngredients,
                        matchedIngredients.Select(item => item.Match!).ToList(),
                        calories,
                        protein,
                        carbs,
                        fat);
                var canCookNow = !useDailyRecommendation && missingIngredients.Count == 0;

                recipeSuggestions.Add(new RecipeSuggestionDto
                {
                    RecipeId = recipe.RecipeId,
                    RecipeName = recipe.RecipeName,
                    Description = recipe.Description,
                    TotalCalories = calories,
                    TotalProtein = protein,
                    TotalCarbs = carbs,
                    TotalFat = fat,
                    TotalGrams = totalGrams,
                    ImageUrl = recipe.ImageUrl,
                    ImageVariants = MediaVariantHelper.FromThumbUrl(recipe.ImageUrl),
                    CookTimeMinutes = recipe.CookTimeMinutes,
                    Difficulty = recipe.Difficulty,
                    ServingCount = recipe.ServingCount,
                    MatchedIngredientsCount = matchCount,
                    TotalIngredientsCount = recipeIngredients.Count,
                    MatchPercentage = matchPercentage,
                    MatchScore = score.Total,
                    MissingIngredientCount = missingIngredients.Count,
                    ScoreReasons = score.Reasons,
                    SuggestionGroup = useDailyRecommendation
                        ? "dailyRecommendation"
                        : canCookNow ? "readyNow" : "needsMore",
                    CanCookNow = canCookNow,
                    AvailableIngredients = matchedIngredients
                        .Select(item => item.Ingredient.FoodItem.FoodName)
                        .ToList(),
                    MatchedIngredients = matchedIngredients
                        .Select(item => item.Ingredient.FoodItem.FoodName)
                        .ToList(),
                    MissingIngredients = missingIngredients,
                    ExtraIngredients = extraIngredients,
                    RequiredIngredients = requiredIngredients,
                    AllIngredients = requiredIngredients,
                    Disclaimer = RecipeDisclaimer
                });
            }

            var sortedSuggestions = recipeSuggestions
                .OrderByDescending(r => r.MatchScore)
                .ThenByDescending(r => r.MatchPercentage)
                .ThenBy(r => r.TotalIngredientsCount)
                .ToList();

            return await EnrichWithProductionGuidesAsync(
                sortedSuggestions,
                maxResults,
                cancellationToken);
        }

        private async Task PopulateRemainingNutritionAsync(
            RecipeSuggestionRequest request,
            Guid userId,
            CancellationToken cancellationToken)
        {
            if (request.RemainingCalories.HasValue
                || request.RemainingProtein.HasValue
                || request.RemainingCarbs.HasValue
                || request.RemainingFat.HasValue)
            {
                return;
            }

            var date = ParseRequestDate(request.Date);
            var target = await _db.NutritionTargets
                .Where(item => item.UserId == userId
                    && item.EffectiveFrom <= date
                    && (item.EffectiveTo == null || item.EffectiveTo >= date))
                .OrderByDescending(item => item.EffectiveFrom)
                .FirstOrDefaultAsync(cancellationToken);
            if (target == null)
            {
                return;
            }

            var totals = await _db.MealDiaries
                .Where(item => item.UserId == userId && item.EatenDate == date && !item.IsDeleted)
                .GroupBy(_ => 1)
                .Select(group => new
                {
                    Calories = group.Sum(item => item.Calories),
                    Protein = group.Sum(item => item.Protein),
                    Carbs = group.Sum(item => item.Carb),
                    Fat = group.Sum(item => item.Fat)
                })
                .FirstOrDefaultAsync(cancellationToken);

            request.RemainingCalories = Math.Max(0m, target.TargetCalories - (totals?.Calories ?? 0m));
            request.RemainingProtein = Math.Max(0m, target.TargetProtein - (totals?.Protein ?? 0m));
            request.RemainingCarbs = Math.Max(0m, target.TargetCarb - (totals?.Carbs ?? 0m));
            request.RemainingFat = Math.Max(0m, target.TargetFat - (totals?.Fat ?? 0m));
        }

        private static DateOnly ParseRequestDate(string? rawDate)
        {
            return DateOnly.TryParse(rawDate, out var date)
                ? date
                : DateOnly.FromDateTime(DateTime.UtcNow);
        }

        private async Task<List<RecipeSuggestionDto>> EnrichWithProductionGuidesAsync(
            IReadOnlyList<RecipeSuggestionDto> suggestions,
            int maxResults,
            CancellationToken cancellationToken)
        {
            if (_recipeGuideService == null)
            {
                return suggestions.Take(maxResults).ToList();
            }

            var result = new List<RecipeSuggestionDto>();
            foreach (var suggestion in suggestions)
            {
                var guide = await _recipeGuideService.GetCookingGuideAsync(suggestion.RecipeId, cancellationToken);
                if (!IsProductionGuide(guide))
                {
                    continue;
                }

                suggestion.GuideStatus = guide!.GuideStatus;
                suggestion.SourceUrls = guide.SourceUrls;
                suggestion.YoutubeVideo = guide.YoutubeVideo;
                suggestion.PrepItems = guide.PrepItems.Count > 0 ? guide.PrepItems : guide.Tips;
                result.Add(suggestion);

                if (result.Count >= maxResults)
                {
                    break;
                }
            }

            return result;
        }

        private static bool IsProductionGuide(RecipeCookingGuideDto? guide)
        {
            if (guide == null || guide.Steps.Count < 3)
            {
                return false;
            }

            if (string.Equals(guide.GuideStatus, "fallback", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            var hasSource = guide.SourceUrls.Any(IsTrustedHttpsUrl);
            var hasVideo = IsDirectYoutubeVideoUrl(guide.YoutubeVideo?.Url);

            return hasSource && hasVideo;
        }

        private static bool IsTrustedHttpsUrl(string? url)
        {
            return Uri.TryCreate(url, UriKind.Absolute, out var uri)
                && uri.Scheme == Uri.UriSchemeHttps
                && !string.IsNullOrWhiteSpace(uri.Host);
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
            return !string.IsNullOrWhiteSpace(videoId)
                && videoId.Length >= 3
                && videoId.All(ch => char.IsLetterOrDigit(ch) || ch is '_' or '-');
        }

        public async Task<RecipeDetailDto?> GetRecipeDetailAsync(
            int recipeId,
            CancellationToken cancellationToken = default)
        {
            var recipe = await _db.Recipes
                .Where(r => r.RecipeId == recipeId)
                .Include(r => r.RecipeIngredients)
                .ThenInclude(ri => ri.FoodItem)
                .FirstOrDefaultAsync(cancellationToken);

            if (recipe == null) return null;

            var (totalCalories, totalProtein, totalCarbs, totalFat) = 
                CalculateRecipeNutrition(recipe.RecipeIngredients.ToList());
            var totalGrams = CalculateTotalGrams(recipe.RecipeIngredients.ToList());

            var ingredientDetails = recipe.RecipeIngredients
                .Where(ri => ri.FoodItem != null && !ri.FoodItem.IsDeleted)
                .Select(ri =>
                {
                    var factor = ri.Grams / 100m;
                    return new RecipeIngredientDetailDto
                    {
                        FoodItemId = ri.FoodItemId,
                        FoodName = ri.FoodItem.FoodName,
                        Grams = ri.Grams,
                        Calories = ri.FoodItem.CaloriesPer100g * factor,
                        Protein = ri.FoodItem.ProteinPer100g * factor,
                        Carbs = ri.FoodItem.CarbPer100g * factor,
                        Fat = ri.FoodItem.FatPer100g * factor
                    };
                })
                .ToList();

            var guide = _recipeGuideService == null
                ? null
                : await _recipeGuideService.GetCookingGuideAsync(recipe.RecipeId, cancellationToken);
            var instructions = guide?.Steps is { Count: > 0 }
                ? guide.Steps
                : ParseInstructions(recipe.InstructionsJson) ?? TryGetRecipeInstructions(recipe);
            var sourceUrls = guide?.SourceUrls is { Count: > 0 }
                ? guide.SourceUrls
                : ParseInstructions(recipe.SourceUrlsJson) ?? new List<string>();
            var rawVideoUrl = guide?.YoutubeVideo?.Url ?? recipe.VideoUrl ?? TryGetRecipeVideoUrl(recipe);
            var videoUrl = IsDirectYoutubeVideoUrl(rawVideoUrl) ? rawVideoUrl : null;
            var youtubeVideo = videoUrl == null
                ? null
                : guide?.YoutubeVideo ?? new RecipeYoutubeVideoDto { Url = videoUrl };
            var requiredIngredients = ingredientDetails
                .Select(ingredient => ingredient.FoodName)
                .ToList();

            return new RecipeDetailDto
            {
                RecipeId = recipe.RecipeId,
                RecipeName = recipe.RecipeName,
                Description = recipe.Description,
                TotalCalories = totalCalories,
                TotalProtein = totalProtein,
                TotalCarbs = totalCarbs,
                TotalFat = totalFat,
                TotalGrams = totalGrams,
                ImageUrl = recipe.ImageUrl,
                ImageVariants = MediaVariantHelper.FromThumbUrl(recipe.ImageUrl),
                CookTimeMinutes = recipe.CookTimeMinutes,
                Difficulty = recipe.Difficulty,
                ServingCount = recipe.ServingCount,
                CredibilityScore = recipe.CredibilityScore,
                Instructions = instructions,
                VideoUrl = videoUrl,
                YoutubeVideo = youtubeVideo,
                GuideStatus = guide?.GuideStatus,
                SourceUrls = sourceUrls,
                Ingredients = ingredientDetails,
                RequiredIngredients = requiredIngredients,
                Disclaimer = RecipeDisclaimer
            };
        }

        private (decimal calories, decimal protein, decimal carbs, decimal fat) CalculateRecipeNutrition(
            List<RecipeIngredient> ingredients)
        {
            decimal totalCals = 0m, totalP = 0m, totalC = 0m, totalF = 0m;
            foreach (var ingredient in ingredients.Where(i => i.FoodItem != null && !i.FoodItem.IsDeleted))
            {
                var factor = ingredient.Grams / 100m;
                totalCals += ingredient.FoodItem.CaloriesPer100g * factor;
                totalP += ingredient.FoodItem.ProteinPer100g * factor;
                totalC += ingredient.FoodItem.CarbPer100g * factor;
                totalF += ingredient.FoodItem.FatPer100g * factor;
            }
            return (totalCals, totalP, totalC, totalF);
        }

        private static decimal CalculateTotalGrams(List<RecipeIngredient> ingredients)
        {
            return ingredients
                .Where(i => i.FoodItem != null && !i.FoodItem.IsDeleted && i.FoodItem.IsActive)
                .Sum(i => i.Grams);
        }

        private static IngredientQuery BuildIngredientQuery(RecipeSuggestionRequest request)
        {
            var nameKeys = new HashSet<string>(StringComparer.Ordinal);
            foreach (var ingredient in request.AvailableIngredients ?? new List<string>())
            {
                AddNameKey(nameKeys, ingredient);
            }

            foreach (var hint in request.IngredientHints ?? new List<RecipeIngredientHintDto>())
            {
                AddNameKey(nameKeys, hint.Name);
            }

            ExpandAliasKeys(nameKeys);
            nameKeys.RemoveWhere(key => !RecipeIngredientEligibility.IsIngredientKey(key));

            var hints = request.IngredientHints ?? new List<RecipeIngredientHintDto>();
            var hasHints = hints.Count > 0;
            var foodItemIds = hasHints
                ? new HashSet<int>()
                : new HashSet<int>(request.AvailableFoodItemIds ?? new List<int>());
            foreach (var hint in hints)
            {
                if (hint.FoodItemId.HasValue && hint.FoodItemId.Value > 0)
                {
                    foodItemIds.Add(hint.FoodItemId.Value);
                }
            }

            var confidenceByFoodItemId = hints
                .Where(hint => hint.FoodItemId.HasValue && hint.FoodItemId.Value > 0)
                .GroupBy(hint => hint.FoodItemId!.Value)
                .ToDictionary(
                    group => group.Key,
                    group => ClampConfidence(group.Max(hint => hint.Confidence ?? 1m)));

            var confidenceByNameKey = hints
                .Where(hint => !string.IsNullOrWhiteSpace(hint.Name))
                .Select(hint => new
                {
                    Key = AiVisionLabelCatalog.NormalizeKey(hint.Name),
                    Confidence = ClampConfidence(hint.Confidence ?? 1m)
                })
                .Where(item => !string.IsNullOrWhiteSpace(item.Key)
                    && RecipeIngredientEligibility.IsIngredientKey(item.Key))
                .GroupBy(item => item.Key, StringComparer.Ordinal)
                .ToDictionary(
                    group => group.Key,
                    group => group.Max(item => item.Confidence),
                    StringComparer.Ordinal);

            return new IngredientQuery(nameKeys, foodItemIds, confidenceByFoodItemId, confidenceByNameKey);
        }

        private static HashSet<string> BuildRawInputKeys(RecipeSuggestionRequest request)
        {
            var keys = new HashSet<string>(StringComparer.Ordinal);
            foreach (var ingredient in request.AvailableIngredients ?? new List<string>())
            {
                AddNameKey(keys, ingredient);
            }

            foreach (var hint in request.IngredientHints ?? new List<RecipeIngredientHintDto>())
            {
                AddNameKey(keys, hint.Name);
            }

            ExpandAliasKeys(keys);
            return keys;
        }

        private static string NormalizeMode(string? mode)
        {
            var normalized = (mode ?? "auto").Trim().ToLowerInvariant();
            return normalized is "ingredient_combo" or "daily_recommendation"
                ? normalized
                : "auto";
        }

        private async Task<bool> HasFinishedDishFoodItemInputAsync(
            IngredientQuery query,
            CancellationToken cancellationToken)
        {
            if (query.FoodItemIds.Count == 0)
            {
                return false;
            }

            var foodItems = await _db.FoodItems
                .Where(item => query.FoodItemIds.Contains(item.FoodItemId)
                    && !item.IsDeleted
                    && item.IsActive)
                .ToListAsync(cancellationToken);

            return foodItems.Any(RecipeIngredientEligibility.IsFinishedDishFood);
        }

        private async Task<Dictionary<int, string>> LoadInputFoodItemNamesAsync(
            IReadOnlyCollection<int> foodItemIds,
            CancellationToken cancellationToken)
        {
            if (foodItemIds.Count == 0)
            {
                return new Dictionary<int, string>();
            }

            var foodItems = await _db.FoodItems
                .AsNoTracking()
                .Where(item => foodItemIds.Contains(item.FoodItemId)
                    && !item.IsDeleted
                    && item.IsActive)
                .ToListAsync(cancellationToken);

            return foodItems
                .Where(RecipeIngredientEligibility.IsIngredientFood)
                .ToDictionary(item => item.FoodItemId, item => item.FoodName);
        }

        private static List<string> BuildInputIngredientDisplayNames(
            RecipeSuggestionRequest request,
            IReadOnlyDictionary<int, string> foodItemNames)
        {
            var displayNames = new List<string>();
            var seenKeys = new HashSet<string>(StringComparer.Ordinal);

            void AddDisplayName(string? value)
            {
                var trimmed = value?.Trim();
                if (string.IsNullOrWhiteSpace(trimmed))
                {
                    return;
                }

                var key = AiVisionLabelCatalog.NormalizeKey(trimmed);
                if (string.IsNullOrWhiteSpace(key)
                    || RecipeIngredientEligibility.IsFinishedDishKey(key)
                    || !seenKeys.Add(key))
                {
                    return;
                }

                displayNames.Add(trimmed);
            }

            foreach (var ingredient in request.AvailableIngredients ?? new List<string>())
            {
                AddDisplayName(ingredient);
            }

            foreach (var hint in request.IngredientHints ?? new List<RecipeIngredientHintDto>())
            {
                AddDisplayName(hint.Name);
                if (hint.FoodItemId.HasValue
                    && foodItemNames.TryGetValue(hint.FoodItemId.Value, out var foodName))
                {
                    AddDisplayName(foodName);
                }
            }

            foreach (var foodItemId in request.AvailableFoodItemIds ?? new List<int>())
            {
                if (foodItemNames.TryGetValue(foodItemId, out var foodName))
                {
                    AddDisplayName(foodName);
                }
            }

            return displayNames;
        }

        private static bool InputNameMatchesIngredientKeys(
            string inputName,
            IReadOnlySet<string> ingredientKeys)
        {
            var inputKeys = new HashSet<string>(StringComparer.Ordinal);
            AddNameKey(inputKeys, inputName);
            ExpandAliasKeys(inputKeys);

            return inputKeys.Any(ingredientKeys.Contains);
        }

        private static void AddNameKey(HashSet<string> keys, string? value)
        {
            var key = AiVisionLabelCatalog.NormalizeKey(value);
            if (!string.IsNullOrWhiteSpace(key))
            {
                keys.Add(key);
            }
        }

        private static void ExpandAliasKeys(HashSet<string> keys)
        {
            var matchedEntries = AiVisionLabelCatalog.Entries
                .Where(entry =>
                    keys.Contains(AiVisionLabelCatalog.NormalizeKey(entry.DisplayNameVi))
                    || entry.Aliases.Any(alias => keys.Contains(AiVisionLabelCatalog.NormalizeKey(alias))))
                .ToList();

            foreach (var entry in matchedEntries)
            {
                AddNameKey(keys, entry.DisplayNameVi);
                AddNameKey(keys, entry.Label);
                foreach (var alias in entry.Aliases)
                {
                    AddNameKey(keys, alias);
                }
            }
        }

        private static IngredientMatch? MatchIngredient(RecipeIngredient ingredient, IngredientQuery query)
        {
            if (query.FoodItemIds.Contains(ingredient.FoodItemId))
            {
                return new IngredientMatch(
                    ingredient.FoodItemId,
                    true,
                    query.ConfidenceByFoodItemId.GetValueOrDefault(ingredient.FoodItemId, 1m));
            }

            var matchedKey = GetIngredientKeys(ingredient.FoodItem)
                .FirstOrDefault(query.NameKeys.Contains);
            if (matchedKey == null)
            {
                return null;
            }

            return new IngredientMatch(
                ingredient.FoodItemId,
                false,
                query.ConfidenceByNameKey.GetValueOrDefault(matchedKey, 0.9m));
        }

        private static HashSet<string> GetIngredientKeys(FoodItem food)
        {
            var keys = new HashSet<string>(StringComparer.Ordinal);
            AddNameKey(keys, food.FoodName);
            AddNameKey(keys, food.FoodNameUnsigned);
            AddNameKey(keys, food.FoodNameEn);
            ExpandAliasKeys(keys);
            return keys;
        }

        private static RecipeScore CalculateMatchScore(
            RecipeSuggestionRequest request,
            Recipe recipe,
            IReadOnlyCollection<RecipeIngredient> ingredients,
            IReadOnlyCollection<IngredientMatch> matches,
            decimal calories,
            decimal protein,
            decimal carbs,
            decimal fat)
        {
            var coverageRatio = ingredients.Count == 0 ? 0m : (decimal)matches.Count / ingredients.Count;
            var coverageScore = coverageRatio * 60m;
            var averageConfidence = matches.Count == 0 ? 0m : matches.Average(match => match.Confidence);
            var confidenceScore = averageConfidence * 10m;
            var exactMatchBonus = matches.Count == 0
                ? 0m
                : ((decimal)matches.Count(match => match.IsExactFoodItemId) / matches.Count) * 5m;
            var nutritionScore = CalculateNutritionFitScore(request, calories, protein, carbs, fat);
            var trustScore = Math.Clamp(recipe.CredibilityScore, 0, 100) / 100m * 10m;
            var timeScore = CalculateTimeScore(request.MaxCookingTimeMinutes, recipe.CookTimeMinutes);

            var reasons = new List<string>
            {
                $"Khớp {matches.Count}/{ingredients.Count} nguyên liệu"
            };

            if (matches.Any(match => match.IsExactFoodItemId))
            {
                reasons.Add("Có nguyên liệu khớp chính xác từ giỏ quét");
            }

            if (nutritionScore > 0m && request.RemainingCalories.HasValue)
            {
                reasons.Add("Phù hợp mục tiêu dinh dưỡng còn lại");
            }

            if (recipe.CookTimeMinutes.HasValue)
            {
                reasons.Add($"Khoảng {recipe.CookTimeMinutes.Value} phút");
            }

            return new RecipeScore(
                Math.Round(coverageScore + confidenceScore + exactMatchBonus + nutritionScore + trustScore + timeScore, 2),
                reasons);
        }

        private static RecipeScore CalculateDailyRecommendationScore(
            RecipeSuggestionRequest request,
            Recipe recipe,
            decimal calories,
            decimal protein,
            decimal carbs,
            decimal fat)
        {
            var nutritionScore = CalculateNutritionFitScore(request, calories, protein, carbs, fat);
            var trustScore = Math.Clamp(recipe.CredibilityScore, 0, 100) / 100m * 15m;
            var timeScore = CalculateTimeScore(request.MaxCookingTimeMinutes, recipe.CookTimeMinutes);
            var reasons = new List<string>
            {
                "Gợi ý món phù hợp cho hôm nay"
            };

            if (nutritionScore > 0m)
            {
                reasons.Add("Phù hợp mục tiêu dinh dưỡng còn lại");
            }

            if (recipe.CookTimeMinutes.HasValue)
            {
                reasons.Add($"Khoảng {recipe.CookTimeMinutes.Value} phút");
            }

            return new RecipeScore(
                Math.Round(nutritionScore + trustScore + timeScore, 2),
                reasons);
        }

        private static decimal CalculateNutritionFitScore(
            RecipeSuggestionRequest request,
            decimal calories,
            decimal protein,
            decimal carbs,
            decimal fat)
        {
            var score = 0m;
            score += CalculateTargetScore(request.RemainingCalories, calories, 12m);
            score += CalculateTargetScore(request.RemainingProtein, protein, 4m);
            score += CalculateTargetScore(request.RemainingCarbs, carbs, 2m);
            score += CalculateTargetScore(request.RemainingFat, fat, 2m);
            return score;
        }

        private static decimal CalculateTargetScore(decimal? target, decimal actual, decimal maxScore)
        {
            if (!target.HasValue || target.Value <= 0m)
            {
                return 0m;
            }

            var ratio = Math.Min(1m, Math.Abs(actual - target.Value) / target.Value);
            return Math.Round((1m - ratio) * maxScore, 2);
        }

        private static decimal CalculateTimeScore(int? maxMinutes, int? cookTimeMinutes)
        {
            if (!maxMinutes.HasValue || !cookTimeMinutes.HasValue || maxMinutes.Value <= 0)
            {
                return 0m;
            }

            var ratio = Math.Clamp((decimal)cookTimeMinutes.Value / maxMinutes.Value, 0m, 1m);
            return Math.Round((1m - ratio) * 3m, 2);
        }

        private static decimal ClampConfidence(decimal confidence)
        {
            return Math.Clamp(confidence, 0m, 1m);
        }

        private List<string> GetForbiddenIngredientKeys(UserPreferenceDto? prefs)
        {
            var keywords = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (prefs == null) return keywords.ToList();

            if (prefs.DietaryRestrictions != null)
            {
                foreach (var diet in prefs.DietaryRestrictions)
                {
                    var d = diet.Trim().ToLowerInvariant();
                    if (d.Contains("vegetarian") || d.Contains("vegan") || d.Contains("chay"))
                    {
                        keywords.UnionWith(new[] { "thịt", "bò", "heo", "gà", "cá", "tôm", "mực", "cua", "pork", "beef", "chicken", "fish", "shrimp", "squid", "crab" });
                    }
                    if (d.Contains("halal") || d.Contains("no-pork") || d.Contains("no pork") || d.Contains("không ăn heo") || d.Contains("không ăn thịt heo"))
                    {
                        keywords.UnionWith(new[] { "heo", "thịt heo", "thịt lợn", "pork" });
                    }
                    if (d.Contains("no-beef") || d.Contains("no beef") || d.Contains("không ăn bò") || d.Contains("không ăn thịt bò"))
                    {
                        keywords.UnionWith(new[] { "bò", "thịt bò", "beef" });
                    }
                }
            }

            if (prefs.Allergies != null)
            {
                foreach (var allergy in prefs.Allergies)
                {
                    var a = allergy.Trim().ToLowerInvariant();
                    if (a.Contains("seafood") || a.Contains("hải sản"))
                    {
                        keywords.UnionWith(new[] { "tôm", "cá", "mực", "cua", "shrimp", "fish" });
                    }
                    if (a.Contains("peanut") || a.Contains("peanuts") || a.Contains("đậu phộng") || a.Contains("lạc"))
                    {
                        keywords.UnionWith(new[] { "lạc", "đậu phộng", "peanut" });
                    }
                    if (a.Contains("dairy") || a.Contains("sữa"))
                    {
                        keywords.UnionWith(new[] { "sữa", "phô mai", "cheese", "milk" });
                    }
                    if (a.Contains("egg") || a.Contains("eggs") || a.Contains("trứng"))
                    {
                        keywords.UnionWith(new[] { "trứng", "egg" });
                    }
                    if (a.Contains("wheat") || a.Contains("gluten") || a.Contains("lúa mì"))
                    {
                        keywords.UnionWith(new[] { "bánh mì", "mì", "wheat", "gluten" });
                    }
                    if (a.Contains("soy") || a.Contains("đậu nành"))
                    {
                        keywords.UnionWith(new[] { "đậu hũ", "đậu phụ", "đậu nành", "tofu", "soy" });
                    }
                }
            }
            return keywords
                .Select(AiVisionLabelCatalog.NormalizeKey)
                .Where(keyword => !string.IsNullOrWhiteSpace(keyword))
                .ToList();
        }

        private static List<string>? ParseInstructions(string? instructionsJson)
        {
            if (string.IsNullOrWhiteSpace(instructionsJson))
            {
                return null;
            }

            try
            {
                var parsed = System.Text.Json.JsonSerializer.Deserialize<List<string>>(instructionsJson);
                var steps = parsed?
                    .Select(step => step?.Trim())
                    .Where(step => !string.IsNullOrWhiteSpace(step))
                    .Select(step => step!)
                    .ToList();
                return steps is { Count: > 0 } ? steps : null;
            }
            catch (System.Text.Json.JsonException)
            {
                var steps = instructionsJson
                    .Split(new[] { "\r\n", "\n", "\r" }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(step => step.Trim())
                    .Where(step => !string.IsNullOrWhiteSpace(step))
                    .ToList();
                return steps.Count > 0 ? steps : null;
            }
        }

        private static List<string>? TryGetRecipeInstructions(Recipe recipe)
        {
            var rawValue = GetOptionalPropertyValue(recipe, "Instructions");
            if (rawValue is null)
            {
                return null;
            }

            if (rawValue is string instructionText)
            {
                var lines = instructionText
                    .Split(new[] { "\r\n", "\n", "\r" }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(line => line.Trim())
                    .Where(line => !string.IsNullOrWhiteSpace(line))
                    .ToList();

                return lines.Count > 0 ? lines : null;
            }

            if (rawValue is IEnumerable<string> stringSteps)
            {
                var steps = stringSteps
                    .Select(step => step?.Trim())
                    .Where(step => !string.IsNullOrWhiteSpace(step))
                    .Select(step => step!)
                    .ToList();

                return steps.Count > 0 ? steps : null;
            }

            if (rawValue is System.Collections.IEnumerable enumerable)
            {
                var steps = new List<string>();
                foreach (var item in enumerable)
                {
                    var step = item?.ToString()?.Trim();
                    if (!string.IsNullOrWhiteSpace(step))
                    {
                        steps.Add(step);
                    }
                }

                return steps.Count > 0 ? steps : null;
            }

            return null;
        }

        private static string? TryGetRecipeVideoUrl(Recipe recipe)
        {
            var rawValue = GetOptionalPropertyValue(recipe, "VideoUrl");
            return rawValue as string;
        }

        private static object? GetOptionalPropertyValue(object source, string propertyName)
        {
            var property = source.GetType().GetProperty(
                propertyName,
                BindingFlags.Instance | BindingFlags.Public | BindingFlags.IgnoreCase);

            return property?.GetValue(source);
        }

        private sealed record IngredientQuery(
            HashSet<string> NameKeys,
            HashSet<int> FoodItemIds,
            Dictionary<int, decimal> ConfidenceByFoodItemId,
            Dictionary<string, decimal> ConfidenceByNameKey);

        private sealed record IngredientMatchCandidate(RecipeIngredient Ingredient, IngredientMatch Match);

        private sealed record IngredientMatch(int FoodItemId, bool IsExactFoodItemId, decimal Confidence);

        private sealed record RecipeScore(decimal Total, List<string> Reasons);
    }
}
