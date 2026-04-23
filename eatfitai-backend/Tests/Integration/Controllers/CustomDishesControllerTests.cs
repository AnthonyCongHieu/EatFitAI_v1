using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.Food;
using EatFitAI.API.DTOs.MealDiary;
using EatFitAI.API.Tests.Integration;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace EatFitAI.API.Tests.Integration.Controllers
{
    public class CustomDishesControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public CustomDishesControllerTests(WebApplicationFactory<Program> factory)
        {
            _factory = IntegrationTestHost.CreateFactory(
                factory,
                $"CustomDishesControllerTests_{Guid.NewGuid():N}");
        }

        [Fact]
        public async Task CreateAndListCustomDishes_ReturnsTemplateSummary()
        {
            var userId = Guid.NewGuid();
            var client = await CreateAuthenticatedClientAsync(userId);
            var foodItemIds = await GetAnyFoodItemIdsAsync(2);

            var createResponse = await client.PostAsJsonAsync("/api/custom-dishes", new CustomDishDto
            {
                DishName = "Breakfast Power Bowl",
                Description = "Template for busy mornings",
                Ingredients = new List<CustomDishIngredientDto>
                {
                    new() { FoodItemId = foodItemIds[0], Grams = 100 },
                    new() { FoodItemId = foodItemIds[1], Grams = 80 },
                }
            });

            createResponse.EnsureSuccessStatusCode();

            var listResponse = await client.GetAsync("/api/custom-dishes");

            listResponse.EnsureSuccessStatusCode();
            var templates = await listResponse.Content.ReadFromJsonAsync<List<CustomDishSummaryDto>>();
            Assert.NotNull(templates);
            Assert.Contains(templates, template =>
                template.DishName == "Breakfast Power Bowl" &&
                template.IngredientCount == 2 &&
                template.DefaultGrams == 180);
        }

        [Fact]
        public async Task UpdateCustomDish_PersistsLatestTemplateDefinition()
        {
            var userId = Guid.NewGuid();
            var client = await CreateAuthenticatedClientAsync(userId);
            var foodItemIds = await GetAnyFoodItemIdsAsync(2);
            var customDishId = await CreateCustomDishAsync(client, "Lunch Prep", foodItemIds);

            var updateResponse = await client.PutAsJsonAsync($"/api/custom-dishes/{customDishId}", new CustomDishDto
            {
                DishName = "Lunch Prep Updated",
                Description = "Updated template",
                Ingredients = new List<CustomDishIngredientDto>
                {
                    new() { FoodItemId = foodItemIds[1], Grams = 125 },
                }
            });

            updateResponse.EnsureSuccessStatusCode();

            var detailResponse = await client.GetAsync($"/api/custom-dishes/{customDishId}");

            detailResponse.EnsureSuccessStatusCode();
            var detail = await detailResponse.Content.ReadFromJsonAsync<CustomDishResponseDto>();
            Assert.NotNull(detail);
            Assert.Equal("Lunch Prep Updated", detail.DishName);
            Assert.Single(detail.Ingredients);
            Assert.Equal(125, detail.Ingredients[0].Grams);
        }

        [Fact]
        public async Task GetCustomDish_ReturnsIngredientMetadataForEditor()
        {
            var userId = Guid.NewGuid();
            var client = await CreateAuthenticatedClientAsync(userId);
            var foodItemIds = await GetAnyFoodItemIdsAsync(2);
            var customDishId = await CreateCustomDishAsync(client, "Editor Ready Template", foodItemIds);

            var detailResponse = await client.GetAsync($"/api/custom-dishes/{customDishId}");

            detailResponse.EnsureSuccessStatusCode();
            using var payload = JsonDocument.Parse(await detailResponse.Content.ReadAsStringAsync());
            var root = payload.RootElement;
            var ingredients = root.GetProperty("ingredients");
            Assert.True(ingredients.GetArrayLength() >= 2);

            var firstIngredient = ingredients[0];
            Assert.True(firstIngredient.TryGetProperty("foodName", out var foodName));
            Assert.False(string.IsNullOrWhiteSpace(foodName.GetString()));
            Assert.True(firstIngredient.TryGetProperty("caloriesPer100g", out var calories));
            Assert.True(calories.ValueKind == JsonValueKind.Number);
        }

        [Fact]
        public async Task ApplyCustomDish_CreatesMealDiaryEntry()
        {
            var userId = Guid.NewGuid();
            var client = await CreateAuthenticatedClientAsync(userId);
            var foodItemIds = await GetAnyFoodItemIdsAsync(2);
            var mealTypeId = await GetAnyMealTypeIdAsync();
            var targetDate = new DateTime(2026, 4, 24);
            var customDishId = await CreateCustomDishAsync(client, "Dinner Template", foodItemIds);

            var applyResponse = await client.PostAsJsonAsync($"/api/custom-dishes/{customDishId}/apply", new ApplyCustomDishRequest
            {
                TargetDate = targetDate,
                MealTypeId = mealTypeId,
            });

            applyResponse.EnsureSuccessStatusCode();
            var appliedEntry = await applyResponse.Content.ReadFromJsonAsync<MealDiaryDto>();
            Assert.NotNull(appliedEntry);
            Assert.Equal(customDishId, appliedEntry.UserDishId);
            Assert.Equal("Dinner Template", appliedEntry.UserDishName);
            Assert.Equal(targetDate.Date, appliedEntry.EatenDate.Date);

            var readbackResponse = await client.GetAsync($"/api/meal-diary?date={targetDate:yyyy-MM-dd}");

            readbackResponse.EnsureSuccessStatusCode();
            var readback = await readbackResponse.Content.ReadFromJsonAsync<List<MealDiaryDto>>();
            Assert.NotNull(readback);
            Assert.Contains(readback, item => item.UserDishId == customDishId);
        }

        [Fact]
        public async Task DeleteCustomDish_RemovesItFromActiveList()
        {
            var userId = Guid.NewGuid();
            var client = await CreateAuthenticatedClientAsync(userId);
            var foodItemIds = await GetAnyFoodItemIdsAsync(2);
            var customDishId = await CreateCustomDishAsync(client, "Weekend Template", foodItemIds);

            var deleteResponse = await client.DeleteAsync($"/api/custom-dishes/{customDishId}");

            Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

            var listResponse = await client.GetAsync("/api/custom-dishes");
            var detailResponse = await client.GetAsync($"/api/custom-dishes/{customDishId}");

            listResponse.EnsureSuccessStatusCode();
            var templates = await listResponse.Content.ReadFromJsonAsync<List<CustomDishSummaryDto>>();
            Assert.NotNull(templates);
            Assert.DoesNotContain(templates, template => template.UserDishId == customDishId);
            Assert.Equal(HttpStatusCode.NotFound, detailResponse.StatusCode);
        }

        private async Task<HttpClient> CreateAuthenticatedClientAsync(Guid? userId = null)
        {
            var effectiveUserId = userId ?? Guid.NewGuid();
            await EnsureUserExistsAsync(effectiveUserId);

            var client = _factory.CreateClient();
            var token = IntegrationTestHost.CreateJwtToken(
                _factory.Services,
                effectiveUserId,
                $"customdish_{effectiveUserId:N}@example.com",
                "Custom Dish Test User");
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            return client;
        }

        private async Task<int> CreateCustomDishAsync(HttpClient client, string dishName, IReadOnlyList<int> foodItemIds)
        {
            var response = await client.PostAsJsonAsync("/api/custom-dishes", new CustomDishDto
            {
                DishName = dishName,
                Ingredients = new List<CustomDishIngredientDto>
                {
                    new() { FoodItemId = foodItemIds[0], Grams = 100 },
                    new() { FoodItemId = foodItemIds[1], Grams = 50 },
                }
            });

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                throw new InvalidOperationException($"Create custom dish failed: {(int)response.StatusCode} {body}");
            }
            var created = await response.Content.ReadFromJsonAsync<CustomDishResponseDto>();
            Assert.NotNull(created);
            return created.UserDishId;
        }

        private async Task<List<int>> GetAnyFoodItemIdsAsync(int count)
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
            return await context.FoodItems
                .Where(item => item.IsActive && !item.IsDeleted)
                .OrderBy(item => item.FoodItemId)
                .Select(item => item.FoodItemId)
                .Take(count)
                .ToListAsync();
        }

        private async Task<int> GetAnyMealTypeIdAsync()
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
            return await context.MealTypes
                .OrderBy(item => item.MealTypeId)
                .Select(item => item.MealTypeId)
                .FirstAsync();
        }

        private async Task EnsureUserExistsAsync(Guid userId)
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();

            if (await context.Users.AnyAsync(item => item.UserId == userId))
            {
                return;
            }

            await context.Users.AddAsync(new User
            {
                UserId = userId,
                Email = $"customdish_{userId:N}@example.com",
                DisplayName = "Custom Dish Test User",
                PasswordHash = "test",
                CreatedAt = DateTime.UtcNow,
                EmailVerified = true
            });
            await context.SaveChangesAsync();
        }
    }
}
