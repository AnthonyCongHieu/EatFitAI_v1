using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.MealDiary;
using EatFitAI.API.Tests.Integration;
using EatFitAI.DTOs;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;
using DbFoodItem = EatFitAI.API.DbScaffold.Models.FoodItem;
using VoiceMealType = EatFitAI.DTOs.MealType;

namespace EatFitAI.API.Tests.Integration.Controllers;

public class VoiceControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public VoiceControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = IntegrationTestHost.CreateFactory(
            factory,
            $"VoiceControllerTests_{Guid.NewGuid():N}");
    }

    [Fact]
    public async Task Commands_AdvertisesAllBackendSupportedVoiceIntents()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/voice/commands");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var intents = body
            .GetProperty("supportedIntents")
            .EnumerateArray()
            .Select(item => item.GetProperty("intent").GetString())
            .ToHashSet();

        Assert.Contains("ADD_FOOD", intents);
        Assert.Contains("LOG_WEIGHT", intents);
        Assert.Contains("ASK_CALORIES", intents);
        Assert.Contains("ASK_NUTRITION", intents);
        Assert.Contains("QUERY_MEAL", intents);
        Assert.Contains("REPEAT_MEAL", intents);
        Assert.Contains("ADD_NOTE", intents);
    }

    [Fact]
    public async Task TranscribeWithProvider_ObjectKeyBuildsScopedMediaUrl_ForProvider()
    {
        var userId = Guid.NewGuid();
        var objectKey = $"voice/{userId:N}/2026/04/30/{Guid.NewGuid():N}_audio.m4a";
        var httpClientFactory = new FakeHttpClientFactory(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """{"text":"xin chao","language":"vi","duration":0.1,"success":true}""",
                Encoding.UTF8,
                "application/json"),
        });

        using var factory = CreateFactoryWithHttpClient(httpClientFactory);
        using var client = CreateAuthorizedClient(factory, userId);

        var response = await client.PostAsJsonAsync("/api/voice/transcribe", new
        {
            ObjectKey = objectKey,
            UploadId = "upload-test"
        });

        response.EnsureSuccessStatusCode();

        Assert.Equal(1, httpClientFactory.CallCount);
        Assert.Contains(
            $"\"audio_url\":\"https://media.example.com/{objectKey}\"",
            httpClientFactory.LastRequestBody);
        Assert.Equal("test-token", httpClientFactory.LastInternalToken);
    }

    [Fact]
    public async Task TranscribeWithProvider_RejectsExternalAudioUrl_WithoutCallingProvider()
    {
        var httpClientFactory = new FakeHttpClientFactory(_ => throw new InvalidOperationException("External audio URL must not be proxied"));
        using var factory = CreateFactoryWithHttpClient(httpClientFactory);
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());

        var response = await client.PostAsJsonAsync("/api/voice/transcribe", new
        {
            AudioUrl = "https://evil.example.com/audio.m4a"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, httpClientFactory.CallCount);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("invalid_audio_reference", body.GetProperty("error").GetString());
    }

    [Fact]
    public async Task TranscribeWithProvider_RejectsObjectKeyForAnotherUser_WithoutCallingProvider()
    {
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var httpClientFactory = new FakeHttpClientFactory(_ => throw new InvalidOperationException("Cross-user object key must not be proxied"));
        using var factory = CreateFactoryWithHttpClient(httpClientFactory);
        using var client = CreateAuthorizedClient(factory, userId);

        var response = await client.PostAsJsonAsync("/api/voice/transcribe", new
        {
            ObjectKey = $"voice/{otherUserId:N}/2026/04/30/audio.m4a"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, httpClientFactory.CallCount);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("invalid_audio_reference", body.GetProperty("error").GetString());
    }

    [Fact]
    public async Task TranscribeWithProvider_LegacyAudioUrlMustResolveToScopedMediaObject()
    {
        var userId = Guid.NewGuid();
        var objectKey = $"voice/{userId:N}/2026/04/30/audio.mp3";
        var httpClientFactory = new FakeHttpClientFactory(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """{"text":"ok","language":"vi","duration":0.1,"success":true}""",
                Encoding.UTF8,
                "application/json"),
        });

        using var factory = CreateFactoryWithHttpClient(httpClientFactory);
        using var client = CreateAuthorizedClient(factory, userId);

        var response = await client.PostAsJsonAsync("/api/voice/transcribe", new
        {
            AudioUrl = $"https://media.example.com/{objectKey}"
        });

        response.EnsureSuccessStatusCode();

        Assert.Equal(1, httpClientFactory.CallCount);
        Assert.Contains(
            $"\"audio_url\":\"https://media.example.com/{objectKey}\"",
            httpClientFactory.LastRequestBody);
    }

    [Fact]
    public async Task ParseWithProvider_FallsBackToRuleParser_WhenProviderReturnsUnknown()
    {
        using var factory = CreateFactoryWithHttpClient(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """
                {
                  "intent": "UNKNOWN",
                  "confidence": 0.3,
                  "rawText": "ghi 1 banana vao bua sang"
                }
                """,
                Encoding.UTF8,
                "application/json"),
        });
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());

        var response = await client.PostAsJsonAsync("/api/voice/parse", new VoiceProcessRequest
        {
            Text = "ghi 1 banana vao bua sang",
            Language = "vi",
        });

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<ParsedVoiceCommand>();
        Assert.NotNull(body);
        Assert.Equal(VoiceIntent.ADD_FOOD, body.Intent);
        Assert.Equal("banana", body.Entities.FoodName);
        Assert.Equal("backend-rule-parser", body.Source);
        Assert.True(body.ReviewRequired);
        Assert.Contains("kiểm tra", body.ReviewReason, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ParseWithProvider_PreservesStructuredResult_AndMarksMutatingCommandForReview()
    {
        using var factory = CreateFactoryWithHttpClient(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """
                {
                  "intent": "ADD_FOOD",
                  "confidence": 0.96,
                  "rawText": "toi vua dung salad dac biet",
                  "source": "gemini-live",
                  "suggestedAction": "Them salad dac biet",
                  "entities": {
                    "foodName": "salad dac biet",
                    "quantity": 1,
                    "mealType": "Lunch"
                  }
                }
                """,
                Encoding.UTF8,
                "application/json"),
        });
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());

        var response = await client.PostAsJsonAsync("/api/voice/parse", new VoiceProcessRequest
        {
            Text = "toi vua dung salad dac biet",
            Language = "vi",
        });

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<ParsedVoiceCommand>();
        Assert.NotNull(body);
        Assert.Equal(VoiceIntent.ADD_FOOD, body.Intent);
        Assert.Equal("gemini-live", body.Source);
        Assert.True(body.ReviewRequired);
        Assert.Contains("kiểm tra", body.ReviewReason, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("salad dac biet", body.Entities.FoodName);
    }

    [Fact]
    public async Task ParseWithProvider_WhenProviderAuthFails_Returns503WithoutRuleFallback()
    {
        using var factory = CreateFactoryWithHttpClient(_ => new HttpResponseMessage(HttpStatusCode.Forbidden)
        {
            Content = new StringContent(
                """{"error":"forbidden"}""",
                Encoding.UTF8,
                "application/json"),
        });
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());

        var response = await client.PostAsJsonAsync("/api/voice/parse", new VoiceProcessRequest
        {
            Text = "toi vua dung salad dac biet",
            Language = "vi",
        });

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("voice_provider_auth_error", body.GetProperty("code").GetString());
        Assert.False(body.TryGetProperty("source", out _));
    }

    [Fact]
    public async Task ParseWithProvider_WhenProviderInternalAuthMissing_Returns503WithoutRuleFallback()
    {
        using var factory = CreateFactoryWithHttpClient(_ => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)
        {
            Content = new StringContent(
                """{"error":"service_unavailable"}""",
                Encoding.UTF8,
                "application/json"),
        });
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());

        var response = await client.PostAsJsonAsync("/api/voice/parse", new VoiceProcessRequest
        {
            Text = "toi vua dung salad dac biet",
            Language = "vi",
        });

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("voice_provider_auth_error", body.GetProperty("code").GetString());
        Assert.False(body.TryGetProperty("source", out _));
    }

    [Fact]
    public async Task ParseWithProvider_WhenProviderGatewayFails_ReturnsRuleFallbackWithReview()
    {
        using var factory = CreateFactoryWithHttpClient(_ => new HttpResponseMessage(HttpStatusCode.BadGateway)
        {
            Content = new StringContent(
                """{"error":"upstream temporarily unavailable"}""",
                Encoding.UTF8,
                "application/json"),
        });
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());

        var response = await client.PostAsJsonAsync("/api/voice/parse", new VoiceProcessRequest
        {
            Text = "toi vua dung salad dac biet",
            Language = "vi",
        });

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<ParsedVoiceCommand>();
        Assert.NotNull(body);
        Assert.Equal(VoiceIntent.UNKNOWN, body.Intent);
        Assert.Equal("backend-rule-fallback", body.Source);
        Assert.False(body.ReviewRequired);
    }

    [Fact]
    public async Task ParseWithProvider_UsesRuleParserBeforeProvider_ForWeightedMealCommand()
    {
        var httpClientFactory = new FakeHttpClientFactory(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"intent":"UNKNOWN","confidence":0.1}""", Encoding.UTF8, "application/json"),
        });
        using var factory = CreateFactoryWithHttpClient(httpClientFactory);
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());

        var response = await client.PostAsJsonAsync("/api/voice/parse", new VoiceProcessRequest
        {
            Text = "them 150g thit heo bua trua",
            Language = "vi",
        });

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var entities = body.GetProperty("entities");

        Assert.Equal(0, httpClientFactory.CallCount);
        Assert.Equal("ADD_FOOD", body.GetProperty("intent").GetString());
        Assert.Equal("backend-rule-parser", body.GetProperty("source").GetString());
        Assert.Equal("thit heo", entities.GetProperty("foodName").GetString());
        Assert.Equal(150m, entities.GetProperty("weight").GetDecimal());
        Assert.Equal("Lunch", entities.GetProperty("mealType").GetString());
        Assert.True(body.GetProperty("reviewRequired").GetBoolean());
    }

    [Fact]
    public async Task Execute_QueryMeal_ReturnsMealEntriesWithoutSaving()
    {
        var userId = Guid.NewGuid();
        using var client = CreateAuthorizedClient(_factory, userId);
        await IntegrationTestHost.EnsureAppUserAsync(
            _factory.Services,
            userId,
            $"voice_query_{userId:N}@example.com",
            "Voice Query User");
        var foodId = await SeedCatalogFoodAsync("Voice rice query", 200m, 5m, 40m, 2m);
        var queryDate = DateTime.Today.Date.AddDays(-1);
        await CreateDiaryEntryAsync(client, foodId, queryDate, mealTypeId: 2, grams: 150);

        var response = await client.PostAsJsonAsync("/api/voice/execute", new
        {
            intent = "QUERY_MEAL",
            rawText = "bua trua hom qua an gi",
            confidence = 0.9,
            entities = new
            {
                mealType = "Lunch",
                date = queryDate.ToString("yyyy-MM-dd")
            }
        });

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var action = body.GetProperty("executedAction");
        var data = action.GetProperty("data");

        Assert.True(body.GetProperty("success").GetBoolean());
        Assert.Equal("QUERY_MEAL", action.GetProperty("type").GetString());
        Assert.Equal(1, data.GetProperty("entryCount").GetInt32());
        Assert.Equal(300m, data.GetProperty("totalCalories").GetDecimal());
        Assert.Contains("Voice rice query", action.GetProperty("details").GetString());

        var readback = await client.GetFromJsonAsync<List<MealDiaryDto>>($"/api/meal-diary?date={DateTime.Today:yyyy-MM-dd}");
        Assert.Empty(readback!);
    }

    [Fact]
    public async Task ReviewAndCommit_RepeatMeal_CopiesSourceMealOnlyAfterConfirmation()
    {
        var userId = Guid.NewGuid();
        using var client = CreateAuthorizedClient(_factory, userId);
        await IntegrationTestHost.EnsureAppUserAsync(
            _factory.Services,
            userId,
            $"voice_repeat_{userId:N}@example.com",
            "Voice Repeat User");
        var foodId = await SeedCatalogFoodAsync("Voice repeat chicken", 180m, 20m, 5m, 4m);
        var sourceDate = DateTime.Today.Date.AddDays(-1);
        var targetDate = DateTime.Today.Date;
        await CreateDiaryEntryAsync(client, foodId, sourceDate, mealTypeId: 2, grams: 120);

        var reviewResponse = await client.PostAsJsonAsync("/api/voice/review", new
        {
            intent = "REPEAT_MEAL",
            rawText = "them lai bua trua hom qua vao hom nay",
            confidence = 0.92,
            reviewRequired = true,
            entities = new
            {
                mealType = "Lunch",
                sourceDate = sourceDate.ToString("yyyy-MM-dd"),
                targetDate = targetDate.ToString("yyyy-MM-dd")
            }
        });

        reviewResponse.EnsureSuccessStatusCode();
        var review = await reviewResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("REPEAT_MEAL", review.GetProperty("intent").GetString());
        Assert.True(review.GetProperty("canSave").GetBoolean());
        Assert.Single(review.GetProperty("items").EnumerateArray());

        var beforeCommit = await client.GetFromJsonAsync<List<MealDiaryDto>>($"/api/meal-diary?date={targetDate:yyyy-MM-dd}");
        Assert.Empty(beforeCommit!);

        var commitResponse = await client.PostAsJsonAsync("/api/voice/commit", review);
        commitResponse.EnsureSuccessStatusCode();
        var commit = await commitResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(commit.GetProperty("success").GetBoolean());
        Assert.Equal("REPEAT_MEAL", commit.GetProperty("executedAction").GetProperty("type").GetString());

        var readback = await client.GetFromJsonAsync<List<MealDiaryDto>>($"/api/meal-diary?date={targetDate:yyyy-MM-dd}");
        var entry = Assert.Single(readback!);
        Assert.Equal(foodId, entry.FoodItemId);
        Assert.Equal(120m, entry.Grams);
        Assert.Equal("voice_repeat", entry.SourceMethod);
    }

    [Fact]
    public async Task ReviewAndCommit_AddMealNote_UsesMealDayMarker()
    {
        var userId = Guid.NewGuid();
        using var client = CreateAuthorizedClient(_factory, userId);
        await IntegrationTestHost.EnsureAppUserAsync(
            _factory.Services,
            userId,
            $"voice_note_{userId:N}@example.com",
            "Voice Note User");
        var noteDate = DateTime.Today.Date;

        var reviewResponse = await client.PostAsJsonAsync("/api/voice/review", new
        {
            intent = "ADD_NOTE",
            rawText = "ghi chu bua trua hoi nhieu dau",
            confidence = 0.9,
            reviewRequired = true,
            entities = new
            {
                mealType = "Lunch",
                date = noteDate.ToString("yyyy-MM-dd"),
                noteText = "hoi nhieu dau"
            }
        });

        reviewResponse.EnsureSuccessStatusCode();
        var review = await reviewResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ADD_NOTE", review.GetProperty("intent").GetString());
        Assert.True(review.GetProperty("canSave").GetBoolean());
        Assert.Equal("hoi nhieu dau", review.GetProperty("note").GetProperty("noteText").GetString());

        var commitResponse = await client.PostAsJsonAsync("/api/voice/commit", review);
        commitResponse.EnsureSuccessStatusCode();

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
        var marker = await context.MealDayMarkers.SingleAsync(item =>
            item.UserId == userId &&
            item.LocalDate == DateOnly.FromDateTime(noteDate) &&
            item.MealTypeId == 2 &&
            item.MarkerType == "meal_note" &&
            !item.IsDeleted);
        Assert.Equal("hoi nhieu dau", marker.Reason);
    }

    [Fact]
    public async Task Review_AddFood_ReturnsEditableDraftWithCandidate_WithoutSaving()
    {
        var userId = Guid.NewGuid();
        using var client = CreateAuthorizedClient(_factory, userId);
        await IntegrationTestHost.EnsureAppUserAsync(
            _factory.Services,
            userId,
            $"voice_review_{userId:N}@example.com",
            "Voice Review User");
        var foodId = await SeedCatalogFoodAsync("Phở bò kiểm thử voice", 450m, 24m, 55m, 12m);

        var response = await client.PostAsJsonAsync("/api/voice/review", new ParsedVoiceCommand
        {
            Intent = VoiceIntent.ADD_FOOD,
            RawText = "Thêm 1 bát phở bò bữa trưa",
            Confidence = 0.92,
            ReviewRequired = true,
            Source = "ai-provider-proxy",
            Entities = new VoiceCommandEntities
            {
                FoodName = "Phở bò kiểm thử voice",
                Quantity = 1,
                Unit = "bát",
                MealType = VoiceMealType.Lunch
            }
        });

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ADD_FOOD", body.GetProperty("intent").GetString());
        Assert.True(body.GetProperty("canSave").GetBoolean());
        Assert.Equal("Lunch", body.GetProperty("mealType").GetString());

        var item = body.GetProperty("items")[0];
        Assert.Equal("Phở bò kiểm thử voice", item.GetProperty("foodName").GetString());
        Assert.Equal(100m, item.GetProperty("grams").GetDecimal());
        Assert.Equal(foodId, item.GetProperty("selectedCandidate").GetProperty("id").GetInt32());
        Assert.Equal("catalog", item.GetProperty("selectedCandidate").GetProperty("source").GetString());
        Assert.Equal(450m, body.GetProperty("totals").GetProperty("calories").GetDecimal());

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
        Assert.False(await context.MealDiaries.AnyAsync(entry => entry.UserId == userId));
    }

    [Fact]
    public async Task Commit_AddFood_RevalidatesDraftAndSavesDiaryEntry()
    {
        var userId = Guid.NewGuid();
        using var client = CreateAuthorizedClient(_factory, userId);
        await IntegrationTestHost.EnsureAppUserAsync(
            _factory.Services,
            userId,
            $"voice_commit_{userId:N}@example.com",
            "Voice Commit User");
        var foodId = await SeedCatalogFoodAsync("Cơm gà kiểm thử voice", 210m, 12m, 32m, 6m);

        var response = await client.PostAsJsonAsync("/api/voice/commit", new
        {
            intent = "ADD_FOOD",
            rawText = "Thêm 150g cơm gà bữa trưa",
            source = "ai-provider-proxy",
            confidence = 0.91,
            mealType = "Lunch",
            date = "2026-05-16",
            items = new[]
            {
                new
                {
                    clientId = "item-1",
                    heardText = "cơm gà kiểm thử voice",
                    foodName = "Cơm gà kiểm thử voice",
                    grams = 150,
                    selectedCandidate = new
                    {
                        id = foodId,
                        source = "catalog",
                        name = "Cơm gà kiểm thử voice",
                        caloriesPer100 = 999,
                        proteinPer100 = 999,
                        carbPer100 = 999,
                        fatPer100 = 999,
                        matchScore = 1
                    }
                }
            }
        });

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("success").GetBoolean());
        Assert.Equal("ADD_FOOD", body.GetProperty("executedAction").GetProperty("type").GetString());

        var readback = await client.GetFromJsonAsync<List<MealDiaryDto>>("/api/meal-diary?date=2026-05-16");
        var entry = Assert.Single(readback!);
        Assert.Equal(foodId, entry.FoodItemId);
        Assert.Equal(150m, entry.Grams);
        Assert.Equal(315m, entry.Calories);
        Assert.Equal(18m, entry.Protein);
        Assert.Equal("voice", entry.SourceMethod);
    }

    [Fact]
    public async Task Commit_AddFood_RejectsInvalidGramWithoutSaving()
    {
        var userId = Guid.NewGuid();
        using var client = CreateAuthorizedClient(_factory, userId);
        await IntegrationTestHost.EnsureAppUserAsync(
            _factory.Services,
            userId,
            $"voice_invalid_{userId:N}@example.com",
            "Voice Invalid User");
        var foodId = await SeedCatalogFoodAsync("Bún kiểm thử voice", 190m, 7m, 38m, 3m);

        var response = await client.PostAsJsonAsync("/api/voice/commit", new
        {
            intent = "ADD_FOOD",
            rawText = "Thêm bún",
            mealType = "Lunch",
            date = "2026-05-16",
            items = new[]
            {
                new
                {
                    clientId = "item-1",
                    foodName = "Bún kiểm thử voice",
                    grams = 0,
                    selectedCandidate = new
                    {
                        id = foodId,
                        source = "catalog",
                        name = "Bún kiểm thử voice"
                    }
                }
            }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
        Assert.False(await context.MealDiaries.AnyAsync(entry => entry.UserId == userId));
    }

    [Fact]
    public async Task Review_LogWeight_ReturnsDraftAndCommitSavesAfterConfirmation()
    {
        var userId = Guid.NewGuid();
        using var client = CreateAuthorizedClient(_factory, userId);
        await IntegrationTestHost.EnsureAppUserAsync(
            _factory.Services,
            userId,
            $"voice_weight_{userId:N}@example.com",
            "Voice Weight User");

        var reviewResponse = await client.PostAsJsonAsync("/api/voice/review", new ParsedVoiceCommand
        {
            Intent = VoiceIntent.LOG_WEIGHT,
            RawText = "Cân nặng 70 kg",
            Confidence = 0.93,
            ReviewRequired = true,
            Entities = new VoiceCommandEntities
            {
                Weight = 70
            }
        });

        reviewResponse.EnsureSuccessStatusCode();
        var review = await reviewResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(review.GetProperty("canSave").GetBoolean());
        Assert.Equal(70m, review.GetProperty("weight").GetProperty("newWeight").GetDecimal());

        var commitResponse = await client.PostAsJsonAsync("/api/voice/commit", review);
        commitResponse.EnsureSuccessStatusCode();
        var commit = await commitResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(commit.GetProperty("success").GetBoolean());
        Assert.Equal("LOG_WEIGHT", commit.GetProperty("executedAction").GetProperty("type").GetString());
    }

    private WebApplicationFactory<Program> CreateFactoryWithHttpClient(
        Func<HttpRequestMessage, HttpResponseMessage> responseFactory)
    {
        return CreateFactoryWithHttpClient(new FakeHttpClientFactory(responseFactory));
    }

    private WebApplicationFactory<Program> CreateFactoryWithHttpClient(
        FakeHttpClientFactory httpClientFactory)
    {
        return _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["AIProvider:VisionBaseUrl"] = "https://voice-provider.test",
                    ["AIProvider:VoiceBaseUrl"] = "https://voice-provider.test",
                    ["AIProvider:InternalToken"] = "test-token",
                    ["Media:PublicBaseUrl"] = "https://media.example.com",
                });
            });

            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IHttpClientFactory>();
                services.AddSingleton<IHttpClientFactory>(httpClientFactory);
            });
        });
    }

    private static HttpClient CreateAuthorizedClient(WebApplicationFactory<Program> factory, Guid userId)
    {
        var client = factory.CreateClient();
        var token = IntegrationTestHost.CreateJwtToken(
            factory.Services,
            userId,
            $"voice_{userId:N}@example.com",
            "Voice User");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private async Task<int> SeedCatalogFoodAsync(
        string foodName,
        decimal caloriesPer100,
        decimal proteinPer100,
        decimal carbPer100,
        decimal fatPer100)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
        var food = new DbFoodItem
        {
            FoodName = foodName,
            FoodNameUnsigned = foodName,
            CaloriesPer100g = caloriesPer100,
            ProteinPer100g = proteinPer100,
            CarbPer100g = carbPer100,
            FatPer100g = fatPer100,
            IsActive = true,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            NutrientCompletenessScore = 100
        };
        await context.FoodItems.AddAsync(food);
        await context.SaveChangesAsync();
        return food.FoodItemId;
    }

    private static async Task CreateDiaryEntryAsync(
        HttpClient client,
        int foodId,
        DateTime date,
        int mealTypeId,
        decimal grams)
    {
        var response = await client.PostAsJsonAsync("/api/meal-diary", new
        {
            eatenDate = date.ToString("yyyy-MM-dd"),
            mealTypeId,
            foodItemId = foodId,
            grams,
            calories = 0,
            protein = 0,
            carb = 0,
            fat = 0,
            sourceMethod = "manual"
        });

        response.EnsureSuccessStatusCode();
    }

    private sealed class FakeHttpClientFactory : IHttpClientFactory
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responseFactory;

        public FakeHttpClientFactory(Func<HttpRequestMessage, HttpResponseMessage> responseFactory)
        {
            _responseFactory = responseFactory;
        }

        public int CallCount { get; private set; }
        public string? LastInternalToken { get; private set; }
        public string? LastRequestBody { get; private set; }

        public HttpClient CreateClient(string name)
        {
            return new HttpClient(new FakeHttpMessageHandler(async request =>
            {
                CallCount++;
                LastInternalToken = request.Headers.TryGetValues("X-Internal-Token", out var values)
                    ? values.SingleOrDefault()
                    : null;
                LastRequestBody = request.Content == null
                    ? null
                    : await request.Content.ReadAsStringAsync();
                return _responseFactory(request);
            }))
            {
                BaseAddress = new Uri("https://voice-provider.test"),
            };
        }
    }

    private sealed class FakeHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, Task<HttpResponseMessage>> _responseFactory;

        public FakeHttpMessageHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> responseFactory)
        {
            _responseFactory = responseFactory;
        }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            return await _responseFactory(request);
        }
    }
}
