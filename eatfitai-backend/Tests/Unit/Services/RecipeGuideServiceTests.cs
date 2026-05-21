using System.Net;
using System.Text;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class RecipeGuideServiceTests : IDisposable
{
    private readonly EatFitAIDbContext _context;
    private readonly IMemoryCache _cache = new MemoryCache(new MemoryCacheOptions());

    public RecipeGuideServiceTests()
    {
        var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new EatFitAIDbContext(options);
    }

    public void Dispose()
    {
        _context.Dispose();
        _cache.Dispose();
    }

    [Fact]
    public async Task GetCookingGuideAsync_ReturnsFreshStoredGuideWithoutCallingProvider()
    {
        var recipeId = await SeedRecipeAsync();
        var recipe = await _context.Recipes.SingleAsync();
        recipe.InstructionsJson = "[\"Sơ chế\", \"Áp chảo\", \"Hoàn thiện\"]";
        recipe.SourceUrlsJson = "[\"https://example.com/recipe\"]";
        recipe.VideoUrl = "https://www.youtube.com/watch?v=abc";
        recipe.EnhancedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var factory = new StubHttpClientFactory(_ => throw new InvalidOperationException("provider should not be called"));
        var service = CreateService(factory);

        var result = await service.GetCookingGuideAsync(recipeId);

        Assert.NotNull(result);
        Assert.Equal("stored", result!.GuideStatus);
        Assert.Equal(new[] { "Sơ chế", "Áp chảo", "Hoàn thiện" }, result.Steps);
        Assert.Equal("https://example.com/recipe", Assert.Single(result.SourceUrls));
    }

    [Fact]
    public async Task GetCookingGuideAsync_TreatsStoredGuideWithYoutubeSearchUrlAsSourceBackedWithoutVideo()
    {
        var recipeId = await SeedRecipeAsync();
        var recipe = await _context.Recipes.SingleAsync();
        recipe.InstructionsJson = "[\"Sơ chế\", \"Nấu\", \"Hoàn thiện\"]";
        recipe.SourceUrlsJson = "[\"https://example.com/recipe\"]";
        recipe.VideoUrl = "https://www.youtube.com/results?search_query=cach+nau+trung";
        recipe.EnhancedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var factory = new StubHttpClientFactory(_ => throw new InvalidOperationException("provider should not be called"));
        var service = CreateService(factory);

        var result = await service.GetCookingGuideAsync(recipeId);

        Assert.NotNull(result);
        Assert.Equal("stored", result!.GuideStatus);
        Assert.Null(result.YoutubeVideo);
        Assert.Equal("https://example.com/recipe", Assert.Single(result.SourceUrls));
    }

    [Fact]
    public async Task GetCookingGuideAsync_ParsesStructuredInstructionsJsonCorrectly()
    {
        var recipeId = await SeedRecipeAsync();
        var recipe = await _context.Recipes.SingleAsync();
        recipe.InstructionsJson = """
            {
              "steps": ["Băm tỏi", "Phi thơm tỏi", "Xào thịt bò chín tái"],
              "prepItems": ["Tỏi băm nhỏ", "Thịt bò thái mỏng"],
              "seasonings": ["1 thìa canh dầu hào", "1 thìa cà phê nước mắm"],
              "cookingMethod": "Xào",
              "tips": ["Xào lửa lớn để thịt bò không dai"]
            }
            """;
        recipe.SourceUrlsJson = "[\"https://example.com/recipe\"]";
        recipe.EnhancedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var factory = new StubHttpClientFactory(_ => throw new InvalidOperationException("provider should not be called"));
        var service = CreateService(factory);

        var result = await service.GetCookingGuideAsync(recipeId);

        Assert.NotNull(result);
        Assert.Equal("stored", result!.GuideStatus);
        Assert.Equal(new[] { "Băm tỏi", "Phi thơm tỏi", "Xào thịt bò chín tái" }, result.Steps);
        Assert.Equal(new[] { "Tỏi băm nhỏ", "Thịt bò thái mỏng" }, result.PrepItems);
        Assert.Equal(new[] { "1 thìa canh dầu hào", "1 thìa cà phê nước mắm" }, result.Seasonings);
        Assert.Equal("Xào", result.CookingMethod);
        Assert.Equal(new[] { "Xào lửa lớn để thịt bò không dai" }, result.Tips);
    }

    [Fact]
    public async Task GetCookingGuideAsync_ParsesLegacyInstructionsJsonCorrectly()
    {
        var recipeId = await SeedRecipeAsync();
        var recipe = await _context.Recipes.SingleAsync();
        recipe.InstructionsJson = "[\"Bước 1\", \"Bước 2\", \"Bước 3\"]";
        recipe.SourceUrlsJson = "[\"https://example.com/recipe\"]";
        recipe.EnhancedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var factory = new StubHttpClientFactory(_ => throw new InvalidOperationException("provider should not be called"));
        var service = CreateService(factory);

        var result = await service.GetCookingGuideAsync(recipeId);

        Assert.NotNull(result);
        Assert.Equal("stored", result!.GuideStatus);
        Assert.Equal(new[] { "Bước 1", "Bước 2", "Bước 3" }, result.Steps);
        Assert.Equal(new[] { "Bước 1", "Bước 2" }, result.PrepItems); // fallback should take first 2 steps
        Assert.Empty(result.Seasonings);
        Assert.Null(result.CookingMethod);
        Assert.Empty(result.Tips);
    }

    [Fact]
    public async Task GetCookingGuideAsync_AcceptsSourceBackedGeneratedGuideWithoutYoutubeVideo()
    {
        var recipeId = await SeedRecipeAsync();
        var factory = new StubHttpClientFactory(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """
                {
                  "prepItems": ["Cân trứng 100g", "Chuẩn bị 2g muối và 1 thìa cà phê dầu"],
                  "steps": ["Đánh trứng với muối", "Làm nóng chảo và áp chảo trứng", "Nêm lại rồi tắt bếp"],
                  "cookingTimeMinutes": 12,
                  "difficulty": "Dễ",
                  "tips": ["Dùng lửa vừa để trứng không khô"],
                  "sourceUrls": ["https://example.com/recipe"],
                  "youtubeVideo": null,
                  "guideStatus": "generated"
                }
                """,
                Encoding.UTF8,
                "application/json")
        });
        var service = CreateService(factory);

        var result = await service.GetCookingGuideAsync(recipeId);
        var recipe = await _context.Recipes.SingleAsync();

        Assert.NotNull(result);
        Assert.Equal("generated", result!.GuideStatus);
        Assert.Null(result.YoutubeVideo);
        Assert.Equal(12, result.CookingTimeMinutes);
        Assert.Null(recipe.VideoUrl);
        Assert.NotNull(recipe.EnhancedAt);
    }

    [Fact]
    public async Task GetCookingGuideAsync_PersistsProviderGuideWhenMissing()
    {
        var recipeId = await SeedRecipeAsync();
        var factory = new StubHttpClientFactory(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """
                {
                  "steps": ["Sơ chế", "Xào chín", "Hoàn thiện"],
                  "cookingTimeMinutes": 20,
                  "difficulty": "Dễ",
                  "tips": ["Nấu lửa vừa"],
                  "sourceUrls": ["https://example.com/recipe"],
                  "youtubeVideo": {
                    "videoId": "abc",
                    "title": "Cách nấu",
                    "channelTitle": "Trusted",
                    "url": "https://www.youtube.com/watch?v=abc"
                  },
                  "guideStatus": "generated"
                }
                """,
                Encoding.UTF8,
                "application/json")
        });
        var service = CreateService(factory);

        var result = await service.GetCookingGuideAsync(recipeId);
        var recipe = await _context.Recipes.SingleAsync();

        Assert.NotNull(result);
        Assert.Equal("generated", result!.GuideStatus);
        Assert.Equal(20, result.CookingTimeMinutes);
        Assert.Equal("https://www.youtube.com/watch?v=abc", result.YoutubeVideo!.Url);
        Assert.Equal("{\"steps\":[\"Sơ chế\",\"Xào chín\",\"Hoàn thiện\"],\"prepItems\":[],\"seasonings\":[],\"cookingMethod\":\"Khác\",\"tips\":[\"Nấu lửa vừa\"]}", recipe.InstructionsJson);
        Assert.Equal("https://www.youtube.com/watch?v=abc", recipe.VideoUrl);
        Assert.NotNull(recipe.EnhancedAt);
    }

    private RecipeGuideService CreateService(IHttpClientFactory factory)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AIProvider:VisionBaseUrl"] = "http://ai-provider.local",
                ["RecipeGuides:PersistedTtlHours"] = "168"
            })
            .Build();

        return new RecipeGuideService(
            _context,
            factory,
            configuration,
            _cache,
            NullLogger<RecipeGuideService>.Instance);
    }

    private async Task<int> SeedRecipeAsync()
    {
        var egg = new FoodItem
        {
            FoodName = "Trứng",
            FoodNameUnsigned = "trung",
            CaloriesPer100g = 155,
            ProteinPer100g = 13,
            CarbPer100g = 1.1m,
            FatPer100g = 11,
            IsActive = true,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var recipe = new Recipe
        {
            RecipeName = "Trứng áp chảo",
            Description = "Recipe guide fixture",
            CookTimeMinutes = 20,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.FoodItems.AddAsync(egg);
        await _context.Recipes.AddAsync(recipe);
        await _context.SaveChangesAsync();
        await _context.RecipeIngredients.AddAsync(new RecipeIngredient
        {
            RecipeId = recipe.RecipeId,
            FoodItemId = egg.FoodItemId,
            Grams = 100
        });
        await _context.SaveChangesAsync();
        return recipe.RecipeId;
    }

    private sealed class StubHttpClientFactory(Func<HttpRequestMessage, HttpResponseMessage> responder) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name)
        {
            return new HttpClient(new StubHttpMessageHandler(responder));
        }
    }

    private sealed class StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responder) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(responder(request));
        }
    }
}
