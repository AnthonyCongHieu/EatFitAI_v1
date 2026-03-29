using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.Food;
using EatFitAI.API.Tests.Integration;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
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
        public async Task SearchAll_CombinesCatalogAndUserFoods()
        {
            var userId = Guid.NewGuid();
            await EnsureUserExistsAsync(userId);
            await SeedUserFoodItemAsync(userId, "Banana Shake");

            var client = _factory.CreateClient();
            var token = IntegrationTestHost.CreateJwtToken(
                _factory.Services,
                userId,
                $"foodtest_{userId:N}@example.com",
                "Food Test User");
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync("/api/food/search-all?q=Banana");

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<List<FoodSearchResultDto>>();
            Assert.NotNull(result);
            Assert.Contains(result, item => item.Source == "catalog");
            Assert.Contains(result, item => item.Source == "user");
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

        private async Task SeedUserFoodItemAsync(Guid userId, string foodName)
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();

            await context.UserFoodItems.AddAsync(new UserFoodItem
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
            });
            await context.SaveChangesAsync();
        }

        private async Task SeedCatalogFoodAsync(string foodName, string? foodNameEn = null)
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();

            if (await context.FoodItems.AnyAsync(x => x.FoodName == foodName))
            {
                return;
            }

            await context.FoodItems.AddAsync(new FoodItem
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
            });
            await context.SaveChangesAsync();
        }
    }
}
