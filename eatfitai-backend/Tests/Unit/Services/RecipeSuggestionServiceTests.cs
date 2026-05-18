using EatFitAI.API.DbScaffold.Data; // FIX: Đổi sang EatFitAIDbContext
using EatFitAI.API.DbScaffold.Models; // FIX: Đổi sang scaffolded Models
using EatFitAI.API.Services;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.DTOs.User;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using Moq;
using Xunit;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace EatFitAI.API.Tests.Unit.Services
{
    public class RecipeSuggestionServiceTests : IDisposable
    {
        private readonly EatFitAIDbContext _context; // FIX: Đổi sang EatFitAIDbContext
        private readonly Mock<ILogger<RecipeSuggestionService>> _loggerMock;
        private readonly IMemoryCache _cache;
        private readonly Mock<IUserPreferenceService> _userPreferenceMock;
        private readonly RecipeSuggestionService _service;

        public RecipeSuggestionServiceTests()
        {
            // Setup In-Memory Database
            var options = new DbContextOptionsBuilder<EatFitAIDbContext>() // FIX: Đổi sang EatFitAIDbContext
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new EatFitAIDbContext(options); // FIX: Đổi sang EatFitAIDbContext

            _loggerMock = new Mock<ILogger<RecipeSuggestionService>>();
            _cache = new MemoryCache(new MemoryCacheOptions());
            _userPreferenceMock = new Mock<IUserPreferenceService>();

            // Mock default response for user preference
            _userPreferenceMock.Setup(s => s.GetUserPreferenceAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new UserPreferenceDto 
                { 
                    DietaryRestrictions = new List<string>(), 
                    Allergies = new List<string>() 
                });

            _service = new RecipeSuggestionService(_context, _loggerMock.Object, _cache, _userPreferenceMock.Object);
        }

        public void Dispose()
        {
            _context.Dispose();
        }

        private async Task SeedDatabaseAsync()
        {
            // Create FoodItems (Ingredients)
            var egg = new FoodItem { FoodItemId = 1, FoodName = "Trứng", CaloriesPer100g = 155, ProteinPer100g = 13, CarbPer100g = 1.1m, FatPer100g = 11, IsActive = true, IsDeleted = false };
            var tomato = new FoodItem { FoodItemId = 2, FoodName = "Cà chua", CaloriesPer100g = 18, ProteinPer100g = 0.9m, CarbPer100g = 3.9m, FatPer100g = 0.2m, IsActive = true, IsDeleted = false };
            var onion = new FoodItem { FoodItemId = 3, FoodName = "Hành tây", CaloriesPer100g = 40, ProteinPer100g = 1.1m, CarbPer100g = 9, FatPer100g = 0.1m, IsActive = true, IsDeleted = false };

            _context.FoodItems.AddRange(egg, tomato, onion);

            // Create Recipe: Trứng xào cà chua
            var recipe = new Recipe
            {
                RecipeId = 1,
                RecipeName = "Trứng xào cà chua",
                Description = "Món ăn đơn giản, dễ làm",
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Recipes.Add(recipe);

            // Link Ingredients to Recipe
            _context.RecipeIngredients.AddRange(
                new RecipeIngredient { RecipeId = 1, FoodItemId = 1, Grams = 100 }, // Trứng
                new RecipeIngredient { RecipeId = 1, FoodItemId = 2, Grams = 200 }, // Cà chua
                new RecipeIngredient { RecipeId = 1, FoodItemId = 3, Grams = 50 }   // Hành tây
            );

            await _context.SaveChangesAsync();
        }

        [Fact]
        public async Task SuggestRecipesAsync_ValidIngredients_ReturnsMatches()
        {
            // Arrange
            await SeedDatabaseAsync();
            var request = new RecipeSuggestionRequest
            {
                AvailableIngredients = new List<string> { "Trứng", "Cà chua" },
                MinMatchedIngredients = 1,
                MaxResults = 5
            };

            // Act
            var result = await _service.SuggestRecipesAsync(request);

            // Assert
            Assert.NotNull(result);
            Assert.Single(result); // Should find 1 recipe
            var suggestion = result[0];
            Assert.Equal("Trứng xào cà chua", suggestion.RecipeName);
            Assert.Equal(2, suggestion.MatchedIngredientsCount); // Trứng, Cà chua
            Assert.Equal(3, suggestion.TotalIngredientsCount); // Trứng, Cà chua, Hành tây
            Assert.Contains("Hành tây", suggestion.MissingIngredients);
        }

        [Fact]
        public async Task SuggestRecipesAsync_NoMatchingIngredients_ReturnsEmpty()
        {
            // Arrange
            await SeedDatabaseAsync();
            var request = new RecipeSuggestionRequest
            {
                AvailableIngredients = new List<string> { "Thịt bò" }, // Not in DB
                MinMatchedIngredients = 1,
                MaxResults = 5
            };

            // Act
            var result = await _service.SuggestRecipesAsync(request);

            // Assert
            Assert.NotNull(result);
            Assert.Empty(result);
        }

        [Fact]
        public async Task SuggestRecipesAsync_UsesFoodItemIdAndUnsignedAliasForMatching()
        {
            // Arrange
            await SeedDatabaseAsync();
            var egg = await _context.FoodItems.SingleAsync(item => item.FoodItemId == 1);
            var tomato = await _context.FoodItems.SingleAsync(item => item.FoodItemId == 2);
            egg.FoodNameUnsigned = "trung";
            tomato.FoodNameUnsigned = "ca chua";
            await _context.SaveChangesAsync();

            var request = new RecipeSuggestionRequest
            {
                AvailableIngredients = new List<string> { "ca chua" },
                AvailableFoodItemIds = new List<int> { 1 },
                IngredientHints = new List<RecipeIngredientHintDto>
                {
                    new RecipeIngredientHintDto
                    {
                        FoodItemId = 1,
                        Name = "Trứng",
                        Confidence = 0.98m
                    }
                },
                MinMatchedIngredients = 1,
                MaxResults = 5
            };

            // Act
            var result = await _service.SuggestRecipesAsync(request);

            // Assert
            var suggestion = Assert.Single(result);
            Assert.Equal(2, suggestion.MatchedIngredientsCount);
            Assert.Contains("Trứng", suggestion.MatchedIngredients);
            Assert.Contains("Cà chua", suggestion.MatchedIngredients);
            Assert.True(suggestion.MatchScore > 0);
        }

        [Fact]
        public async Task SuggestRecipesAsync_FiltersCookingTimeAndClampsMaxResults()
        {
            // Arrange
            await SeedDatabaseAsync();
            var egg = await _context.FoodItems.SingleAsync(item => item.FoodItemId == 1);
            var tomato = await _context.FoodItems.SingleAsync(item => item.FoodItemId == 2);

            _context.Recipes.AddRange(
                new Recipe
                {
                    RecipeId = 2,
                    RecipeName = "Trứng hấp nhanh",
                    Description = "Nhanh",
                    CookTimeMinutes = 15,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Recipe
                {
                    RecipeId = 3,
                    RecipeName = "Trứng om chậm",
                    Description = "Chậm",
                    CookTimeMinutes = 45,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            _context.RecipeIngredients.AddRange(
                new RecipeIngredient { RecipeId = 2, FoodItemId = egg.FoodItemId, Grams = 100 },
                new RecipeIngredient { RecipeId = 2, FoodItemId = tomato.FoodItemId, Grams = 100 },
                new RecipeIngredient { RecipeId = 3, FoodItemId = egg.FoodItemId, Grams = 100 },
                new RecipeIngredient { RecipeId = 3, FoodItemId = tomato.FoodItemId, Grams = 100 });
            await _context.SaveChangesAsync();

            var request = new RecipeSuggestionRequest
            {
                AvailableIngredients = new List<string> { "Trứng", "Cà chua" },
                MaxCookingTimeMinutes = 30,
                MaxResults = 99
            };

            // Act
            var result = await _service.SuggestRecipesAsync(request);

            // Assert
            Assert.Single(result);
            Assert.All(result, suggestion => Assert.True(suggestion.CookTimeMinutes <= 30));
        }

        [Fact]
        public async Task SuggestRecipesAsync_PrefersNutritionFitWhenCoverageIsEqual()
        {
            // Arrange
            await SeedDatabaseAsync();
            var egg = await _context.FoodItems.SingleAsync(item => item.FoodItemId == 1);
            var tomato = await _context.FoodItems.SingleAsync(item => item.FoodItemId == 2);

            _context.Recipes.AddRange(
                new Recipe
                {
                    RecipeId = 2,
                    RecipeName = "Trứng cà chua vừa kcal",
                    CookTimeMinutes = 20,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Recipe
                {
                    RecipeId = 3,
                    RecipeName = "Trứng cà chua nhiều kcal",
                    CookTimeMinutes = 20,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            _context.RecipeIngredients.AddRange(
                new RecipeIngredient { RecipeId = 2, FoodItemId = egg.FoodItemId, Grams = 100 },
                new RecipeIngredient { RecipeId = 2, FoodItemId = tomato.FoodItemId, Grams = 200 },
                new RecipeIngredient { RecipeId = 3, FoodItemId = egg.FoodItemId, Grams = 300 },
                new RecipeIngredient { RecipeId = 3, FoodItemId = tomato.FoodItemId, Grams = 300 });
            await _context.SaveChangesAsync();

            var request = new RecipeSuggestionRequest
            {
                AvailableIngredients = new List<string> { "Trứng", "Cà chua" },
                RemainingCalories = 210,
                MaxResults = 5
            };

            // Act
            var result = await _service.SuggestRecipesAsync(request);

            // Assert
            Assert.Equal("Trứng cà chua vừa kcal", result[0].RecipeName);
            Assert.True(result[0].MatchScore > result[1].MatchScore);
        }

        [Fact]
        public async Task GetRecipeDetailAsync_ReturnsRecipeMetadataAndImageVariants()
        {
            // Arrange
            await SeedDatabaseAsync();
            var recipe = await _context.Recipes.SingleAsync(item => item.RecipeId == 1);
            recipe.ImageUrl = "recipe-images/v1/thumb/trung-xao-ca-chua.webp";
            recipe.CookTimeMinutes = 18;
            recipe.Difficulty = "Dễ";
            recipe.ServingCount = 2;
            recipe.InstructionsJson = "[\"Chuẩn bị\", \"Xào chín\"]";
            await _context.SaveChangesAsync();

            // Act
            var result = await _service.GetRecipeDetailAsync(recipe.RecipeId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(18, result!.CookTimeMinutes);
            Assert.Equal("Dễ", result.Difficulty);
            Assert.Equal(2, result.ServingCount);
            Assert.Equal("recipe-images/v1/thumb/trung-xao-ca-chua.webp", result.ImageUrl);
            Assert.Equal("recipe-images/v1/medium/trung-xao-ca-chua.webp", result.ImageVariants!.MediumUrl);
            Assert.Equal(new[] { "Chuẩn bị", "Xào chín" }, result.Instructions);
        }
    }
}
