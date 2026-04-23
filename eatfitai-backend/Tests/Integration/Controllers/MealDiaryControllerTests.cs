using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.MealDiary;
using EatFitAI.API.Tests.Integration;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace EatFitAI.API.Tests.Integration.Controllers
{
    public class MealDiaryControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public MealDiaryControllerTests(WebApplicationFactory<Program> factory)
        {
            _factory = IntegrationTestHost.CreateFactory(
                factory,
                $"MealDiaryControllerTests_{Guid.NewGuid():N}");
        }

        [Fact]
        public async Task GetMealDiaries_WithValidToken_ReturnsOk()
        {
            var client = await CreateAuthenticatedClientAsync();

            var response = await client.GetAsync("/api/meal-diary");

            response.EnsureSuccessStatusCode();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task GetMealDiaries_WithoutToken_ReturnsUnauthorized()
        {
            var client = _factory.CreateClient();

            var response = await client.GetAsync("/api/meal-diary");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task GetMealDiaries_WithDateFilter_ReturnsFilteredResults()
        {
            var userId = Guid.NewGuid();
            var client = await CreateAuthenticatedClientAsync(userId);
            var targetDate = new DateTime(2026, 3, 20);

            await SeedMealDiaryAsync(userId, targetDate, 1);
            await SeedMealDiaryAsync(userId, targetDate.AddDays(-1), 2);

            var response = await client.GetAsync($"/api/meal-diary?date={targetDate:yyyy-MM-dd}");

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<List<MealDiaryDto>>();
            Assert.NotNull(result);
            Assert.Single(result);
            Assert.All(result, item => Assert.Equal(targetDate.Date, item.EatenDate.Date));
        }

        [Fact]
        public async Task CreateMealDiary_ValidRequest_ReturnsCreated()
        {
            var client = await CreateAuthenticatedClientAsync();
            var createRequest = new CreateMealDiaryRequest
            {
                EatenDate = DateTime.Today,
                MealTypeId = await GetAnyMealTypeIdAsync(),
                FoodItemId = await GetAnyFoodItemIdAsync(),
                Grams = 200
            };

            var response = await client.PostAsJsonAsync("/api/meal-diary", createRequest);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        [Fact]
        public async Task GetMealDiaries_InvalidDate_ReturnsBadRequest()
        {
            var client = await CreateAuthenticatedClientAsync();

            var response = await client.GetAsync("/api/meal-diary?date=not-a-date");

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task CreateMealDiary_WithoutAuth_ReturnsUnauthorized()
        {
            var client = _factory.CreateClient();
            var createRequest = new CreateMealDiaryRequest
            {
                EatenDate = DateTime.Today,
                MealTypeId = await GetAnyMealTypeIdAsync(),
                FoodItemId = await GetAnyFoodItemIdAsync(),
                Grams = 100
            };

            var response = await client.PostAsJsonAsync("/api/meal-diary", createRequest);

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task UpdateMealDiary_NonExistentId_ReturnsNotFound()
        {
            var client = await CreateAuthenticatedClientAsync();
            var updateRequest = new UpdateMealDiaryRequest
            {
                Grams = 300
            };

            var response = await client.PutAsJsonAsync("/api/meal-diary/99999", updateRequest);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task DeleteMealDiary_NonExistentId_ReturnsNotFound()
        {
            var client = await CreateAuthenticatedClientAsync();

            var response = await client.DeleteAsync("/api/meal-diary/99999");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task DeleteMealDiary_WithoutAuth_ReturnsUnauthorized()
        {
            var client = _factory.CreateClient();

            var response = await client.DeleteAsync("/api/meal-diary/1");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task DeleteMealDiary_DeletedEntryIsExcludedFromDateReadback()
        {
            var client = await CreateAuthenticatedClientAsync();
            var eatenDate = DateTime.Today;
            var createRequest = new CreateMealDiaryRequest
            {
                EatenDate = eatenDate,
                MealTypeId = await GetAnyMealTypeIdAsync(),
                FoodItemId = await GetAnyFoodItemIdAsync(),
                Grams = 180
            };

            var createResponse = await client.PostAsJsonAsync("/api/meal-diary", createRequest);

            createResponse.EnsureSuccessStatusCode();
            var created = await createResponse.Content.ReadFromJsonAsync<MealDiaryDto>();
            Assert.NotNull(created);

            var deleteResponse = await client.DeleteAsync($"/api/meal-diary/{created!.MealDiaryId}");

            Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

            var readbackResponse = await client.GetAsync($"/api/meal-diary?date={eatenDate:yyyy-MM-dd}");

            readbackResponse.EnsureSuccessStatusCode();
            var readback = await readbackResponse.Content.ReadFromJsonAsync<List<MealDiaryDto>>();
            Assert.NotNull(readback);
            Assert.DoesNotContain(readback, item => item.MealDiaryId == created.MealDiaryId);
        }

        [Fact]
        public async Task CopyPreviousDay_WithoutMealTypeId_CopiesAllEntriesFromPreviousDay()
        {
            var userId = Guid.NewGuid();
            var client = await CreateAuthenticatedClientAsync(userId);
            var targetDate = new DateTime(2026, 3, 21);
            var previousDate = targetDate.AddDays(-1);
            var mealTypeIds = await GetMealTypeIdsAsync(2);

            await SeedMealDiaryAsync(userId, previousDate, mealTypeIds[0]);
            await SeedMealDiaryAsync(userId, previousDate, mealTypeIds[1]);

            var response = await client.PostAsJsonAsync("/api/meal-diary/copy-previous-day", new
            {
                targetDate,
            });

            response.EnsureSuccessStatusCode();
            var copied = await response.Content.ReadFromJsonAsync<List<MealDiaryDto>>();
            Assert.NotNull(copied);
            Assert.Equal(2, copied.Count);
            Assert.All(copied, item => Assert.Equal(targetDate.Date, item.EatenDate.Date));
            Assert.Equal(mealTypeIds.OrderBy(x => x), copied.Select(x => x.MealTypeId).OrderBy(x => x));
        }

        [Fact]
        public async Task CopyPreviousDay_WithMealTypeId_CopiesOnlyRequestedMealGroup()
        {
            var userId = Guid.NewGuid();
            var client = await CreateAuthenticatedClientAsync(userId);
            var targetDate = new DateTime(2026, 3, 23);
            var previousDate = targetDate.AddDays(-1);
            var mealTypeIds = await GetMealTypeIdsAsync(2);

            await SeedMealDiaryAsync(userId, previousDate, mealTypeIds[0]);
            await SeedMealDiaryAsync(userId, previousDate, mealTypeIds[1]);

            var response = await client.PostAsJsonAsync("/api/meal-diary/copy-previous-day", new
            {
                targetDate,
                mealTypeId = mealTypeIds[0],
            });

            response.EnsureSuccessStatusCode();
            var copied = await response.Content.ReadFromJsonAsync<List<MealDiaryDto>>();
            Assert.NotNull(copied);
            Assert.Single(copied);
            Assert.Equal(mealTypeIds[0], copied[0].MealTypeId);

            var readbackResponse = await client.GetAsync($"/api/meal-diary?date={targetDate:yyyy-MM-dd}");

            readbackResponse.EnsureSuccessStatusCode();
            var readback = await readbackResponse.Content.ReadFromJsonAsync<List<MealDiaryDto>>();
            Assert.NotNull(readback);
            Assert.Single(readback);
            Assert.Equal(mealTypeIds[0], readback[0].MealTypeId);
        }

        [Fact]
        public async Task CopyPreviousDay_WithNullBody_ReturnsBadRequest()
        {
            var client = await CreateAuthenticatedClientAsync();
            using var content = new StringContent("null", Encoding.UTF8, "application/json");

            var response = await client.PostAsync("/api/meal-diary/copy-previous-day", content);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        private async Task<HttpClient> CreateAuthenticatedClientAsync(Guid? userId = null)
        {
            var effectiveUserId = userId ?? Guid.NewGuid();
            await EnsureUserExistsAsync(effectiveUserId);

            var client = _factory.CreateClient();
            var token = IntegrationTestHost.CreateJwtToken(
                _factory.Services,
                effectiveUserId,
                $"mealtest_{effectiveUserId:N}@example.com",
                "Meal Diary Test User");
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            return client;
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
                Email = $"mealtest_{userId:N}@example.com",
                DisplayName = "Meal Diary Test User",
                PasswordHash = "test",
                CreatedAt = DateTime.UtcNow,
                EmailVerified = true
            });
            await context.SaveChangesAsync();
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

        private async Task<List<int>> GetMealTypeIdsAsync(int count)
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
            return await context.MealTypes
                .OrderBy(x => x.MealTypeId)
                .Select(x => x.MealTypeId)
                .Take(count)
                .ToListAsync();
        }

        private async Task SeedMealDiaryAsync(Guid userId, DateTime eatenDate, int mealTypeId)
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
            var foodItemId = await context.FoodItems
                .Where(x => x.IsActive && !x.IsDeleted)
                .Select(x => x.FoodItemId)
                .FirstAsync();

            await context.MealDiaries.AddAsync(new MealDiary
            {
                UserId = userId,
                EatenDate = DateOnly.FromDateTime(eatenDate),
                MealTypeId = mealTypeId,
                FoodItemId = foodItemId,
                Grams = 100,
                Calories = 120,
                Protein = 10,
                Carb = 10,
                Fat = 2,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsDeleted = false,
                SourceMethod = "catalog"
            });
            await context.SaveChangesAsync();
        }
    }
}
