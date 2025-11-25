using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Services;
using EatFitAI.API.DTOs.AI;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace EatFitAI.API.Tests.Unit.Services
{
    public class RecipeSuggestionServiceTests : IDisposable
    {
        private readonly EatFitAIDbContext _context;
        private readonly Mock<ILogger<RecipeSuggestionService>> _loggerMock;
        private readonly RecipeSuggestionService _service;

        public RecipeSuggestionServiceTests()
        {
            // Setup In-Memory Database
            var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new EatFitAIDbContext(options);

            _loggerMock = new Mock<ILogger<RecipeSuggestionService>>();

            _service = new RecipeSuggestionService(_context, _loggerMock.Object);
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
    }
}
