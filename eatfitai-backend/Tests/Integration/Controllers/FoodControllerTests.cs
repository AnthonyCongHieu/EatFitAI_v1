using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.Food;
using EatFitAI.API.DTOs.MealDiary;
using EatFitAI.API.Tests.Integration;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace EatFitAI.API.Tests.Integration.Controllers
{
    public class FoodControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public FoodControllerTests(WebApplicationFactory<Program> factory)
        {
            _factory = IntegrationTestHost.CreateFactory(
                factory,
                $"FoodControllerTests_{Guid.NewGuid():N}");
        }

        [Fact]
        public async Task SearchFood_ValidQuery_ReturnsResults()
        {
            var client = _factory.CreateClient();

            var response = await client.GetAsync("/api/food/search?q=Banana");

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<List<FoodItemDto>>();
            Assert.NotNull(result);
            Assert.NotEmpty(result);
        }

        [Fact]
        public async Task SearchFood_EmptyQuery_ReturnsBadRequest()
        {
            var client = _factory.CreateClient();

            var response = await client.GetAsync("/api/food/search?q=");

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task SearchFood_WithLimit_RespectsLimit()
        {
            var client = _factory.CreateClient();

            var response = await client.GetAsync("/api/food/search?q=a&limit=3");

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<List<FoodItemDto>>();
            Assert.NotNull(result);
            Assert.InRange(result.Count, 1, 3);
        }

        [Fact]
        public async Task SearchFood_WithoutAuth_StillReturnsResults()
        {
            var client = _factory.CreateClient();

            var response = await client.GetAsync("/api/food/search?q=Chicken");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task SearchFood_AccentInsensitiveQuery_ReturnsVietnameseResults()
        {
            await SeedCatalogFoodAsync("Cơm trắng kiểm thử");
            var client = _factory.CreateClient();

            var response = await client.GetAsync("/api/food/search?q=com");

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<List<FoodItemDto>>();
            Assert.NotNull(result);
            Assert.Contains(result, item => item.FoodName.Contains("Cơm trắng kiểm thử", StringComparison.OrdinalIgnoreCase));
        }

        [Fact]
        public async Task SearchFood_EnglishQuery_ReturnsTranslatedResults()
        {
            await SeedCatalogFoodAsync("Ức gà kiểm thử", "Chicken breast test");
            var client = _factory.CreateClient();

            var response = await client.GetAsync("/api/food/search?q=chicken");

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<List<FoodItemDto>>();
            Assert.NotNull(result);
            Assert.Contains(result, item => item.FoodName.Contains("Ức gà kiểm thử", StringComparison.OrdinalIgnoreCase));
        }

        [Fact]
        public async Task GetFoodById_ValidId_ReturnsFood()
        {
            var client = _factory.CreateClient();
            var foodItemId = await GetAnyFoodItemIdAsync();

            var response = await client.GetAsync($"/api/food/{foodItemId}");

            response.EnsureSuccessStatusCode();
        }

        [Fact]
        public async Task GetFoodById_InvalidId_ReturnsNotFound()
        {
            var client = _factory.CreateClient();

            var response = await client.GetAsync("/api/food/99999");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task GetFoodByBarcode_LocalMatch_ReturnsFood()
        {
            await SeedCatalogFoodAsync("Sữa chua barcode test", barcode: "8938505974198");
            var client = _factory.CreateClient();

            var response = await client.GetAsync("/api/food/barcode/8938505974198");

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<BarcodeLookupResultDto>();
            Assert.NotNull(result);
            Assert.Equal("8938505974198", result.Barcode);
            Assert.Equal("catalog", result.Source);
            Assert.NotNull(result.FoodItem);
        }

        [Fact]
        public async Task GetFoodByBarcode_WhenProviderIsUnavailable_ReturnsServiceUnavailable()
        {
            var factory = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureAppConfiguration((_, config) =>
                {
                    config.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["FoodBarcodeProvider:TemplateUrl"] = "https://provider.test/api/{barcode}",
                        ["FoodBarcodeProvider:Name"] = "provider-test",
                    });
                });

                builder.ConfigureServices(services =>
                {
                    services.RemoveAll<IHttpClientFactory>();
                    services.AddSingleton<IHttpClientFactory>(
                        new StubHttpClientFactory(
                            HttpStatusCode.ServiceUnavailable,
                            JsonContent.Create(new { message = "provider unavailable" })));
                });
            });
            var client = factory.CreateClient();

            var response = await client.GetAsync("/api/food/barcode/9988776655443");

            Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        }

        [Fact]
        public async Task SearchAll_CombinesCatalogAndUserFoods()
        {
            var userId = Guid.NewGuid();
            var client = await CreateAuthenticatedClientAsync(userId);
            await SeedUserFoodItemAsync(userId, "Banana Shake");

            var response = await client.GetAsync("/api/food/search-all?q=Banana");

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<List<FoodSearchResultDto>>();
            Assert.NotNull(result);
            Assert.Contains(result, item => item.Source == "catalog");
            Assert.Contains(result, item => item.Source == "user");
        }

        [Fact]
        public async Task SearchAll_WhenCatalogHasNoMatches_ReturnsUserFoodsOnly()
        {
            var userId = Guid.NewGuid();
            var client = await CreateAuthenticatedClientAsync(userId);
            var uniqueFoodName = $"Manual search only {Guid.NewGuid():N}";
            var userFoodItemId = await SeedUserFoodItemAsync(userId, uniqueFoodName);

            var response = await client.GetAsync($"/api/food/search-all?q={Uri.EscapeDataString(uniqueFoodName)}");

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<List<FoodSearchResultDto>>();
            Assert.NotNull(result);
            var matched = Assert.Single(result);
            Assert.Equal("user", matched.Source);
            Assert.Equal(userFoodItemId, matched.Id);
            Assert.Equal(uniqueFoodName, matched.FoodName);
        }

        [Fact]
        public async Task GetRecentFoods_AfterDiaryWrites_ReturnsMostRecentUniqueFoods()
        {
            var userId = Guid.NewGuid();
            var client = await CreateAuthenticatedClientAsync(userId);
            var mealTypeId = await GetAnyMealTypeIdAsync();
            var firstFoodItemId = await SeedCatalogFoodAsync("Recent Food Alpha");
            var secondFoodItemId = await SeedCatalogFoodAsync("Recent Food Beta");

            await client.PostAsJsonAsync("/api/meal-diary", new CreateMealDiaryRequest
            {
                EatenDate = DateTime.Today,
                MealTypeId = mealTypeId,
                FoodItemId = firstFoodItemId,
                Grams = 120
            });

            await client.PostAsJsonAsync("/api/meal-diary", new CreateMealDiaryRequest
            {
                EatenDate = DateTime.Today,
                MealTypeId = mealTypeId,
                FoodItemId = secondFoodItemId,
                Grams = 150
            });

            await client.PostAsJsonAsync("/api/meal-diary", new CreateMealDiaryRequest
            {
                EatenDate = DateTime.Today,
                MealTypeId = mealTypeId,
                FoodItemId = firstFoodItemId,
                Grams = 180
            });

            var response = await client.GetAsync("/api/food/recent?limit=5");

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<List<FoodSearchResultDto>>();
            Assert.NotNull(result);
            Assert.Equal(2, result.Count);
            Assert.Equal(firstFoodItemId, result[0].Id);
            Assert.Equal(secondFoodItemId, result[1].Id);

            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
            var trackedFood = await context.UserRecentFoods
                .SingleAsync(item => item.UserId == userId && item.FoodItemId == firstFoodItemId);
            Assert.Equal(2, trackedFood.UsedCount);
        }

        [Fact]
        public async Task GetRecentFoods_AfterUserFoodDiaryWrites_ReturnsRecentUserFoods()
        {
            var userId = Guid.NewGuid();
            var client = await CreateAuthenticatedClientAsync(userId);
            var mealTypeId = await GetAnyMealTypeIdAsync();
            var userFoodItemId = await SeedUserFoodItemAsync(userId, "Recent User Food");

            await client.PostAsJsonAsync("/api/meal-diary", new CreateMealDiaryRequest
            {
                EatenDate = DateTime.Today,
                MealTypeId = mealTypeId,
                UserFoodItemId = userFoodItemId,
                Grams = 95
            });

            var response = await client.GetAsync("/api/food/recent?limit=5");

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<List<FoodSearchResultDto>>();
            Assert.NotNull(result);
            Assert.Contains(result, item =>
                item.Source == "user" &&
                item.Id == userFoodItemId &&
                item.FoodName == "Recent User Food");
        }

        [Fact]
        public async Task GetRecentFoods_WithoutAuth_ReturnsUnauthorized()
        {
            var client = _factory.CreateClient();

            var response = await client.GetAsync("/api/food/recent");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        private async Task<HttpClient> CreateAuthenticatedClientAsync(Guid? userId = null)
        {
            var effectiveUserId = userId ?? Guid.NewGuid();
            await EnsureUserExistsAsync(effectiveUserId);

            var client = _factory.CreateClient();
            var token = IntegrationTestHost.CreateJwtToken(
                _factory.Services,
                effectiveUserId,
                $"foodtest_{effectiveUserId:N}@example.com",
                "Food Test User");
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            return client;
        }

        private async Task<int> GetAnyFoodItemIdAsync()
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
            return await context.FoodItems
                .Where(x => x.IsActive && !x.IsDeleted)
                .Select(x => x.FoodItemId)
                .FirstAsync();
        }

        private async Task<int> GetAnyMealTypeIdAsync()
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
            return await context.MealTypes
                .Select(x => x.MealTypeId)
                .FirstAsync();
        }

        private async Task EnsureUserExistsAsync(Guid userId)
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();

            if (await context.Users.AnyAsync(x => x.UserId == userId))
            {
                return;
            }

            await context.Users.AddAsync(new User
            {
                UserId = userId,
                Email = $"foodtest_{userId:N}@example.com",
                DisplayName = "Food Test User",
                PasswordHash = "test",
                CreatedAt = DateTime.UtcNow,
                EmailVerified = true
            });
            await context.SaveChangesAsync();
        }

        private async Task<int> SeedUserFoodItemAsync(Guid userId, string foodName)
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();

            var userFoodItem = new UserFoodItem
            {
                UserId = userId,
                FoodName = foodName,
                UnitType = "g",
                CaloriesPer100 = 120,
                ProteinPer100 = 3,
                CarbPer100 = 20,
                FatPer100 = 2,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await context.UserFoodItems.AddAsync(userFoodItem);
            await context.SaveChangesAsync();
            return userFoodItem.UserFoodItemId;
        }

        private async Task<int> SeedCatalogFoodAsync(string foodName, string? foodNameEn = null, string? barcode = null)
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();

            var existingId = await context.FoodItems
                .Where(x => x.FoodName == foodName)
                .Select(x => (int?)x.FoodItemId)
                .FirstOrDefaultAsync();
            if (existingId.HasValue)
            {
                return existingId.Value;
            }

            var foodItem = new FoodItem
            {
                FoodName = foodName,
                FoodNameEn = foodNameEn,
                CaloriesPer100g = 120,
                ProteinPer100g = 10,
                CarbPer100g = 15,
                FatPer100g = 2,
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Barcode = barcode,
            };

            await context.FoodItems.AddAsync(foodItem);
            await context.SaveChangesAsync();
            return foodItem.FoodItemId;
        }

        private sealed class StubHttpClientFactory : IHttpClientFactory
        {
            private readonly HttpStatusCode _statusCode;
            private readonly HttpContent? _content;

            public StubHttpClientFactory(HttpStatusCode statusCode, HttpContent? content = null)
            {
                _statusCode = statusCode;
                _content = content;
            }

            public HttpClient CreateClient(string name)
            {
                return new HttpClient(
                    new StubHttpMessageHandler(_statusCode, _content),
                    disposeHandler: true);
            }
        }

        private sealed class StubHttpMessageHandler : HttpMessageHandler
        {
            private readonly HttpStatusCode _statusCode;
            private readonly HttpContent? _content;

            public StubHttpMessageHandler(HttpStatusCode statusCode, HttpContent? content)
            {
                _statusCode = statusCode;
                _content = content;
            }

            protected override Task<HttpResponseMessage> SendAsync(
                HttpRequestMessage request,
                CancellationToken cancellationToken)
            {
                return Task.FromResult(new HttpResponseMessage(_statusCode)
                {
                    Content = _content,
                });
            }
        }
    }
}
