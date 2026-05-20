using EatFitAI.API.DbScaffold.Data; // FIX: Đổi sang EatFitAIDbContext
using EatFitAI.API.DbScaffold.Models; // FIX: Đổi sang scaffolded Models
using EatFitAI.API.Data;
using EatFitAI.API.Services;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.DTOs.User;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Moq;
using System.Net;
using System.Net.Http;
using Xunit;
using System;
using System.Collections.Generic;
using System.Text.Json;
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
        private readonly Mock<IRecipeGuideService> _recipeGuideMock;
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
            _recipeGuideMock = new Mock<IRecipeGuideService>();

            // Mock default response for user preference
            _userPreferenceMock.Setup(s => s.GetUserPreferenceAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new UserPreferenceDto 
                { 
                    DietaryRestrictions = new List<string>(), 
                    Allergies = new List<string>() 
                });

            _recipeGuideMock
                .Setup(s => s.GetCookingGuideAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((int recipeId, CancellationToken _) => BuildProductionGuide(recipeId));

            _service = new RecipeSuggestionService(
                _context,
                _loggerMock.Object,
                _cache,
                _userPreferenceMock.Object,
                _recipeGuideMock.Object);
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
                ImageUrl = "recipe-images/v1/thumb/trung-xao-ca-chua.webp",
                InstructionsJson = JsonSerializer.Serialize(new List<string>
                {
                    "Sơ chế trứng và cà chua",
                    "Xào cà chua rồi cho trứng vào",
                    "Nêm vừa ăn và hoàn thiện"
                }),
                SourceUrlsJson = JsonSerializer.Serialize(new List<string>
                {
                    "https://monngonmoingay.com/cong-thuc/trung-xao-ca-chua"
                }),
                EnhancedAt = DateTime.UtcNow,
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
            Assert.Equal(new[] { "Trứng", "Cà chua", "Hành tây" }, suggestion.RequiredIngredients);
            Assert.Empty(suggestion.ExtraIngredients);
            Assert.Contains("tham khảo", suggestion.Disclaimer, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task SuggestRecipesAsync_IngredientListDoesNotCallCookingGuideProvider()
        {
            await SeedDatabaseAsync();

            var result = await _service.SuggestRecipesAsync(new RecipeSuggestionRequest
            {
                Mode = "ingredient_combo",
                AvailableIngredients = new List<string> { "Trứng", "Cà chua" },
                MaxResults = 5
            });

            Assert.Single(result);
            _recipeGuideMock.Verify(
                service => service.GetCookingGuideAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()),
                Times.Never);
        }

        [Fact]
        public async Task SuggestRecipesAsync_AutoWithoutIngredientsReturnsDailySuggestionsWithSafetyMetadata()
        {
            await SeedDatabaseAsync();

            var result = await _service.SuggestRecipesAsync(new RecipeSuggestionRequest
            {
                Mode = "auto",
                MaxResults = 5
            });

            var suggestion = Assert.Single(result);
            Assert.Equal("dailyRecommendation", suggestion.SuggestionGroup);
            Assert.False(suggestion.CanCookNow);
            Assert.Equal(0, suggestion.MatchedIngredientsCount);
            Assert.Equal(new[] { "Trứng", "Cà chua", "Hành tây" }, suggestion.RequiredIngredients);
            Assert.Equal(new[] { "Trứng", "Cà chua", "Hành tây" }, suggestion.MissingIngredients);
            Assert.Empty(suggestion.ExtraIngredients);
            Assert.Contains("không phải khuyến nghị của chuyên gia", suggestion.Disclaimer);
        }

        [Fact]
        public async Task SuggestRecipesAsync_ManualAndScanInputsReportTheSameRequiredMissingAndExtraIngredients()
        {
            await SeedDatabaseAsync();
            _context.FoodItems.Add(new FoodItem
            {
                FoodItemId = 4,
                FoodName = "Tỏi",
                FoodNameUnsigned = "toi",
                FoodNameEn = "garlic",
                CaloriesPer100g = 149,
                ProteinPer100g = 6.4m,
                CarbPer100g = 33,
                FatPer100g = 0.5m,
                IsActive = true,
                IsDeleted = false
            });
            await _context.SaveChangesAsync();

            var manualResult = await _service.SuggestRecipesAsync(new RecipeSuggestionRequest
            {
                Mode = "ingredient_combo",
                AvailableIngredients = new List<string> { "Trứng", "Tỏi" },
                MinMatchedIngredients = 1,
                MaxResults = 5
            });

            var scanResult = await _service.SuggestRecipesAsync(new RecipeSuggestionRequest
            {
                Mode = "ingredient_combo",
                AvailableFoodItemIds = new List<int> { 1, 4 },
                IngredientHints = new List<RecipeIngredientHintDto>
                {
                    new() { FoodItemId = 1, Name = "Trứng", Confidence = 0.95m },
                    new() { FoodItemId = 4, Name = "Tỏi", Confidence = 0.92m }
                },
                MinMatchedIngredients = 1,
                MaxResults = 5
            });

            var manual = Assert.Single(manualResult);
            var scan = Assert.Single(scanResult);
            Assert.Equal(manual.RecipeId, scan.RecipeId);
            Assert.Equal(manual.RequiredIngredients, scan.RequiredIngredients);
            Assert.Equal(new[] { "Cà chua", "Hành tây" }, manual.MissingIngredients);
            Assert.Equal(manual.MissingIngredients, scan.MissingIngredients);
            Assert.Equal(new[] { "Tỏi" }, manual.ExtraIngredients);
            Assert.Equal(manual.ExtraIngredients, scan.ExtraIngredients);
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
        public async Task SuggestRecipesAsync_VietnameseChickenSeed_ReturnsProductionReadyChickenRecipe()
        {
            await SeedVietnameseChickenRecipeFromCatalogAsync("ga-kho-gung");
            var service = CreateServiceWithRealRecipeGuide();

            var result = await service.SuggestRecipesAsync(new RecipeSuggestionRequest
            {
                Mode = "auto",
                AvailableIngredients = new List<string> { "Gà" },
                IngredientHints = new List<RecipeIngredientHintDto>
                {
                    new() { Name = "Gà", FoodItemId = null, Confidence = null }
                },
                MaxResults = 12
            });

            var chickenRecipe = Assert.Single(result, item => item.RecipeName == "Gà kho gừng");
            Assert.NotEqual("fallback", chickenRecipe.GuideStatus, StringComparer.OrdinalIgnoreCase);
            Assert.Contains("Thịt gà", chickenRecipe.MatchedIngredients);
            Assert.NotNull(chickenRecipe.ImageVariants);
            Assert.Equal("food-images/v2/thumb/chicken.webp", chickenRecipe.ImageUrl);
            Assert.Equal("food-images/v2/medium/chicken.webp", chickenRecipe.ImageVariants!.MediumUrl);
            Assert.Contains(chickenRecipe.SourceUrls, IsTrustedHttpsUrl);
            Assert.NotNull(chickenRecipe.YoutubeVideo);
            Assert.True(IsDirectYoutubeVideoUrl(chickenRecipe.YoutubeVideo!.Url));
        }

        [Fact]
        public async Task SuggestRecipesAsync_SeededRecipeWithoutVerifiedVideo_ReturnsSourceBackedSuggestion()
        {
            await SeedVietnameseEggRecipeWithSearchVideoFromCatalogAsync();
            var service = CreateServiceWithRealRecipeGuide();

            var result = await service.SuggestRecipesAsync(new RecipeSuggestionRequest
            {
                Mode = "auto",
                AvailableIngredients = new List<string> { "Trứng" },
                IngredientHints = new List<RecipeIngredientHintDto>
                {
                    new() { Name = "Trứng", FoodItemId = null, Confidence = null }
                },
                MaxResults = 12
            });

            var eggRecipe = Assert.Single(result, item => item.RecipeName == "Trứng chiên cà chua");
            Assert.Equal("stale", eggRecipe.GuideStatus);
            Assert.Contains("Trứng", eggRecipe.MatchedIngredients);
            Assert.Contains(eggRecipe.SourceUrls, IsTrustedHttpsUrl);
            Assert.Null(eggRecipe.YoutubeVideo);
            Assert.NotEmpty(eggRecipe.PrepItems);
        }

        [Fact]
        public async Task SuggestRecipesAsync_SourceBackedPhoGaWithoutImageStillReturnsWithSpecificNoodleDisplay()
        {
            await SeedVietnamesePhoGaWithoutImageAsync();
            var service = CreateServiceWithRealRecipeGuide();

            var result = await service.SuggestRecipesAsync(new RecipeSuggestionRequest
            {
                Mode = "auto",
                AvailableIngredients = new List<string> { "Gà" },
                IngredientHints = new List<RecipeIngredientHintDto>
                {
                    new() { Name = "Gà", FoodItemId = null, Confidence = null }
                },
                MaxResults = 12
            });

            var phoGa = Assert.Single(result, item => item.RecipeName == "Phở gà");
            Assert.Equal("food-images/v2/thumb/pho.webp", phoGa.ImageUrl);
            Assert.Equal("food-images/v2/medium/pho.webp", phoGa.ImageVariants!.MediumUrl);
            Assert.Contains("Thịt gà", phoGa.AvailableIngredients);
            Assert.Contains("Bánh phở", phoGa.RequiredIngredients);
            Assert.Contains("Bánh phở", phoGa.MissingIngredients);
            Assert.DoesNotContain("Mì/bún/phở", phoGa.RequiredIngredients);
            Assert.DoesNotContain("Mì/bún/phở", phoGa.MissingIngredients);
            Assert.Contains(phoGa.SourceUrls, IsTrustedHttpsUrl);
        }

        [Fact]
        public async Task GetRecipeDetailAsync_NormalizesPhoGaGenericNoodlesToBanhPho()
        {
            var recipe = await SeedVietnamesePhoGaWithoutImageAsync();
            var service = CreateServiceWithRealRecipeGuide();

            var result = await service.GetRecipeDetailAsync(recipe.RecipeId);

            Assert.NotNull(result);
            Assert.Contains(result!.Ingredients, ingredient => ingredient.FoodName == "Bánh phở");
            Assert.DoesNotContain(result.Ingredients, ingredient => ingredient.FoodName == "Mì/bún/phở");
            Assert.Contains("Bánh phở", result.RequiredIngredients);
            Assert.DoesNotContain("Mì/bún/phở", result.RequiredIngredients);
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
                    ImageUrl = "recipe-images/v1/thumb/trung-hap-nhanh.webp",
                    InstructionsJson = JsonSerializer.Serialize(new List<string> { "Sơ chế", "Hấp nhanh", "Hoàn thiện" }),
                    SourceUrlsJson = JsonSerializer.Serialize(new List<string> { "https://monngonmoingay.com/cong-thuc/trung-hap-nhanh" }),
                    EnhancedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Recipe
                {
                    RecipeId = 3,
                    RecipeName = "Trứng om chậm",
                    Description = "Chậm",
                    CookTimeMinutes = 45,
                    ImageUrl = "recipe-images/v1/thumb/trung-om-cham.webp",
                    InstructionsJson = JsonSerializer.Serialize(new List<string> { "Sơ chế", "Om chậm", "Hoàn thiện" }),
                    SourceUrlsJson = JsonSerializer.Serialize(new List<string> { "https://monngonmoingay.com/cong-thuc/trung-om-cham" }),
                    EnhancedAt = DateTime.UtcNow,
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
                    ImageUrl = "recipe-images/v1/thumb/trung-ca-chua-vua-kcal.webp",
                    InstructionsJson = JsonSerializer.Serialize(new List<string> { "Sơ chế", "Xào vừa chín", "Hoàn thiện" }),
                    SourceUrlsJson = JsonSerializer.Serialize(new List<string> { "https://monngonmoingay.com/cong-thuc/trung-ca-chua-vua-kcal" }),
                    EnhancedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Recipe
                {
                    RecipeId = 3,
                    RecipeName = "Trứng cà chua nhiều kcal",
                    CookTimeMinutes = 20,
                    ImageUrl = "recipe-images/v1/thumb/trung-ca-chua-nhieu-kcal.webp",
                    InstructionsJson = JsonSerializer.Serialize(new List<string> { "Sơ chế", "Xào phần lớn", "Hoàn thiện" }),
                    SourceUrlsJson = JsonSerializer.Serialize(new List<string> { "https://monngonmoingay.com/cong-thuc/trung-ca-chua-nhieu-kcal" }),
                    EnhancedAt = DateTime.UtcNow,
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
        public async Task SuggestRecipesAsync_SplitsReadyNowAndNeedsMoreGroups()
        {
            await SeedDatabaseAsync();
            var egg = await _context.FoodItems.SingleAsync(item => item.FoodItemId == 1);
            var tomato = await _context.FoodItems.SingleAsync(item => item.FoodItemId == 2);

            _context.Recipes.Add(new Recipe
            {
                RecipeId = 2,
                RecipeName = "Trứng cà chua đủ nguyên liệu",
                ImageUrl = "recipe-images/v1/thumb/trung-ca-chua-du-nguyen-lieu.webp",
                InstructionsJson = JsonSerializer.Serialize(new List<string> { "Sơ chế", "Xào trứng cà chua", "Hoàn thiện" }),
                SourceUrlsJson = JsonSerializer.Serialize(new List<string> { "https://monngonmoingay.com/cong-thuc/trung-ca-chua-du-nguyen-lieu" }),
                EnhancedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            _context.RecipeIngredients.AddRange(
                new RecipeIngredient { RecipeId = 2, FoodItemId = egg.FoodItemId, Grams = 100 },
                new RecipeIngredient { RecipeId = 2, FoodItemId = tomato.FoodItemId, Grams = 100 });
            await _context.SaveChangesAsync();

            var result = await _service.SuggestRecipesAsync(new RecipeSuggestionRequest
            {
                Mode = "ingredient_combo",
                AvailableIngredients = new List<string> { "Trứng", "Cà chua" },
                MaxResults = 5
            });

            Assert.Contains(result, item => item.RecipeName == "Trứng cà chua đủ nguyên liệu"
                && item.CanCookNow
                && item.SuggestionGroup == "readyNow");
            Assert.Contains(result, item => item.RecipeName == "Trứng xào cà chua"
                && !item.CanCookNow
                && item.SuggestionGroup == "needsMore"
                && item.MissingIngredients.Contains("Hành tây"));
        }

        [Fact]
        public async Task SuggestRecipesAsync_IngredientComboIgnoresFinishedDishClasses()
        {
            await SeedDatabaseAsync();

            var result = await _service.SuggestRecipesAsync(new RecipeSuggestionRequest
            {
                Mode = "ingredient_combo",
                AvailableIngredients = new List<string> { "Phở" },
                MaxResults = 5
            });

            Assert.Empty(result);
        }

        [Fact]
        public async Task SuggestRecipesAsync_AutoUsesDailyRecommendationForFinishedDishInput()
        {
            await SeedDatabaseAsync();

            var result = await _service.SuggestRecipesAsync(new RecipeSuggestionRequest
            {
                Mode = "auto",
                AvailableIngredients = new List<string> { "Phở" },
                MaxResults = 5
            });

            var suggestion = Assert.Single(result);
            Assert.Equal("dailyRecommendation", suggestion.SuggestionGroup);
            Assert.False(suggestion.CanCookNow);
            Assert.Equal(0, suggestion.MatchedIngredientsCount);
        }

        [Fact]
        public async Task SuggestRecipesAsync_AutoUsesDailyRecommendationForFinishedDishFoodItemIdInput()
        {
            await SeedDatabaseAsync();
            _context.FoodItems.Add(new FoodItem
            {
                FoodItemId = 9,
                FoodName = "Phở",
                FoodNameUnsigned = "pho",
                CaloriesPer100g = 180,
                ProteinPer100g = 9,
                CarbPer100g = 24,
                FatPer100g = 5,
                IsActive = true,
                IsDeleted = false
            });
            await _context.SaveChangesAsync();

            var result = await _service.SuggestRecipesAsync(new RecipeSuggestionRequest
            {
                Mode = "auto",
                AvailableFoodItemIds = new List<int> { 9 },
                MaxResults = 5
            });

            var suggestion = Assert.Single(result);
            Assert.Equal("dailyRecommendation", suggestion.SuggestionGroup);
            Assert.False(suggestion.CanCookNow);
            Assert.Equal(0, suggestion.MatchedIngredientsCount);
        }

        [Fact]
        public async Task SuggestRecipesAsync_FiltersDietaryAndAllergyIdsFromPreferences()
        {
            await SeedDatabaseAsync();
            var pork = new FoodItem
            {
                FoodItemId = 4,
                FoodName = "Thịt heo",
                FoodNameUnsigned = "thit heo",
                FoodNameEn = "pork",
                CaloriesPer100g = 242,
                ProteinPer100g = 27,
                CarbPer100g = 0,
                FatPer100g = 14,
                IsActive = true,
                IsDeleted = false
            };
            _context.FoodItems.Add(pork);
            _context.Recipes.Add(new Recipe
            {
                RecipeId = 2,
                RecipeName = "Thịt heo cà chua",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            _context.RecipeIngredients.AddRange(
                new RecipeIngredient { RecipeId = 2, FoodItemId = pork.FoodItemId, Grams = 120 },
                new RecipeIngredient { RecipeId = 2, FoodItemId = 2, Grams = 100 });
            await _context.SaveChangesAsync();

            _userPreferenceMock
                .Setup(s => s.GetUserPreferenceAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new UserPreferenceDto
                {
                    DietaryRestrictions = new List<string> { "halal", "no-pork" },
                    Allergies = new List<string> { "egg" }
                });

            var result = await _service.SuggestRecipesAsync(new RecipeSuggestionRequest
            {
                UserId = Guid.NewGuid(),
                Mode = "ingredient_combo",
                AvailableIngredients = new List<string> { "Thịt heo", "Trứng", "Cà chua" },
                MinMatchedIngredients = 1,
                MaxResults = 10
            });

            Assert.DoesNotContain(result, item => item.AllIngredients.Contains("Thịt heo"));
            Assert.DoesNotContain(result, item => item.AllIngredients.Contains("Trứng"));
        }

        [Fact]
        public async Task SuggestRecipesAsync_HidesRecipesWithoutSourceBackedStoredGuide()
        {
            await SeedDatabaseAsync();
            var recipe = await _context.Recipes.SingleAsync(item => item.RecipeId == 1);
            recipe.SourceUrlsJson = "[]";
            await _context.SaveChangesAsync();

            var result = await _service.SuggestRecipesAsync(new RecipeSuggestionRequest
            {
                Mode = "ingredient_combo",
                AvailableIngredients = new List<string> { "Trứng", "Cà chua" },
                MaxResults = 5
            });

            Assert.Empty(result);
        }

        [Fact]
        public async Task SuggestRecipesAsync_StoredGuideWithYoutubeSearchUrlReturnsSuggestionWithoutVideo()
        {
            await SeedDatabaseAsync();
            var recipe = await _context.Recipes.SingleAsync(item => item.RecipeId == 1);
            recipe.VideoUrl = "https://www.youtube.com/results?search_query=c%C3%A1ch+n%E1%BA%A5u+Tr%E1%BB%A9ng+x%C3%A0o+c%C3%A0+chua";
            await _context.SaveChangesAsync();

            var result = await _service.SuggestRecipesAsync(new RecipeSuggestionRequest
            {
                Mode = "ingredient_combo",
                AvailableIngredients = new List<string> { "Trứng", "Cà chua" },
                MaxResults = 5
            });

            var suggestion = Assert.Single(result);
            Assert.NotEqual("fallback", suggestion.GuideStatus, StringComparer.OrdinalIgnoreCase);
            Assert.Null(suggestion.YoutubeVideo);
        }

        [Fact]
        public async Task SuggestRecipesAsync_VietnameseSeededIngredientsReturnOnlyRecipeSuggestions()
        {
            var databaseRoot = new InMemoryDatabaseRoot();
            var databaseName = Guid.NewGuid().ToString();
            var services = new ServiceCollection();
            services.AddDbContext<EatFitAIDbContext>(options =>
                options.UseInMemoryDatabase(databaseName, databaseRoot));
            services.AddSingleton<IHostEnvironment>(new TestHostEnvironment());

            await using var provider = services.BuildServiceProvider();
            await DatabaseSeeder.SeedAsync(provider);

            using var scope = provider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
            using var cache = new MemoryCache(new MemoryCacheOptions());
            var service = new RecipeSuggestionService(
                context,
                NullLogger<RecipeSuggestionService>.Instance,
                cache,
                _userPreferenceMock.Object,
                _recipeGuideMock.Object);

            var seededFoodNames = await context.FoodItems
                .Select(food => food.FoodName)
                .ToListAsync();
            Assert.Contains("Thịt gà", seededFoodNames);
            var chickenFood = await context.FoodItems.SingleAsync(food => food.FoodName == "Thịt gà");
            Assert.True(RecipeIngredientEligibility.IsIngredientFood(chickenFood));
            Assert.True(await context.Recipes
                .Include(recipe => recipe.RecipeIngredients)
                .ThenInclude(ingredient => ingredient.FoodItem)
                .AnyAsync(recipe => recipe.ImageUrl != null
                    && recipe.SourceUrlsJson != null
                    && recipe.InstructionsJson != null
                    && recipe.RecipeIngredients.Any(ingredient => ingredient.FoodItem!.FoodName == "Thịt gà")));

            var representativeIngredients = new[]
            {
                "Gà",
                "Trứng",
                "Thịt bò",
                "Tôm",
                "Cá",
                "Rau muống",
                "Bí đỏ",
                "Cà chua"
            };

            foreach (var ingredient in representativeIngredients)
            {
                var suggestions = await service.SuggestRecipesAsync(new RecipeSuggestionRequest
                {
                    Mode = "ingredient_combo",
                    AvailableIngredients = new List<string> { ingredient },
                    MaxResults = 10
                });

                Assert.True(
                    suggestions.Count > 0,
                    $"Expected at least one source-backed recipe suggestion for ingredient '{ingredient}'.");
                Assert.DoesNotContain(
                    suggestions,
                    suggestion => string.Equals(suggestion.RecipeName, ingredient, StringComparison.OrdinalIgnoreCase));
                Assert.All(suggestions, suggestion =>
                {
                    Assert.True(suggestion.MatchedIngredientsCount > 0);
                    Assert.NotEqual("fallback", suggestion.GuideStatus, StringComparer.OrdinalIgnoreCase);
                    if (!string.IsNullOrWhiteSpace(suggestion.ImageUrl))
                    {
                        Assert.NotNull(suggestion.ImageVariants);
                    }
                    Assert.Contains(suggestion.SourceUrls, IsTrustedHttpsUrl);
                });
            }
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
            recipe.InstructionsJson = "[\"Chuẩn bị\", \"Xào chín\", \"Nêm lại\"]";
            await _context.SaveChangesAsync();

            // Act
            var result = await _service.GetRecipeDetailAsync(recipe.RecipeId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(18, result!.CookTimeMinutes);
            Assert.Equal("Dễ", result.Difficulty);
            Assert.Equal(2, result.ServingCount);
            Assert.Equal("food-images/v2/thumb/egg.webp", result.ImageUrl);
            Assert.Equal("food-images/v2/medium/egg.webp", result.ImageVariants!.MediumUrl);
            Assert.Equal(new[] { "Chuẩn bị", "Xào chín", "Nêm lại" }, result.Instructions);
            Assert.Equal(new[] { "Trứng", "Cà chua", "Hành tây" }, result.RequiredIngredients);
            Assert.Equal("stored", result.GuideStatus);
            Assert.Contains(result.SourceUrls, IsTrustedHttpsUrl);
            Assert.Contains("không phải khuyến nghị của chuyên gia", result.Disclaimer);
        }

        private RecipeSuggestionService CreateServiceWithRealRecipeGuide()
        {
            var guideService = new RecipeGuideService(
                _context,
                new StubHttpClientFactory(_ => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)),
                new ConfigurationBuilder()
                    .AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["AIProvider:VisionBaseUrl"] = "http://ai-provider.local",
                        ["RecipeGuides:PersistedTtlHours"] = "168"
                    })
                    .Build(),
                _cache,
                NullLogger<RecipeGuideService>.Instance);

            return new RecipeSuggestionService(
                _context,
                _loggerMock.Object,
                _cache,
                _userPreferenceMock.Object,
                guideService);
        }

        private async Task SeedVietnameseChickenRecipeFromCatalogAsync(string slug)
        {
            var seed = Assert.Single(VietnameseFoodCatalog.LoadRecipeSeeds(), item => item.Slug == slug);
            var chicken = new FoodItem
            {
                FoodName = "Thịt gà",
                FoodNameUnsigned = "thit ga ga chicken",
                FoodNameEn = "chicken",
                CaloriesPer100g = 165,
                ProteinPer100g = 31,
                CarbPer100g = 0,
                FatPer100g = 3.6m,
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            var ginger = new FoodItem
            {
                FoodName = "Gừng",
                FoodNameUnsigned = "gung ginger",
                FoodNameEn = "ginger",
                CaloriesPer100g = 80,
                ProteinPer100g = 1.8m,
                CarbPer100g = 18,
                FatPer100g = 0.8m,
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _context.FoodItems.AddRangeAsync(chicken, ginger);

            var recipe = new Recipe
            {
                RecipeName = seed.RecipeName,
                Description = seed.Description,
                ImageUrl = seed.ImageKey,
                CookTimeMinutes = seed.CookTimeMinutes,
                Difficulty = seed.Difficulty,
                ServingCount = seed.ServingCount,
                CredibilityScore = seed.CredibilityScore,
                InstructionsJson = JsonSerializer.Serialize(seed.Instructions),
                SourceUrlsJson = JsonSerializer.Serialize(seed.SourceUrls),
                VideoUrl = seed.VideoUrl,
                EnhancedAt = DateTime.UtcNow,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _context.Recipes.AddAsync(recipe);
            await _context.SaveChangesAsync();

            await _context.RecipeIngredients.AddRangeAsync(
                new RecipeIngredient
                {
                    RecipeId = recipe.RecipeId,
                    FoodItemId = chicken.FoodItemId,
                    Grams = 150
                },
                new RecipeIngredient
                {
                    RecipeId = recipe.RecipeId,
                    FoodItemId = ginger.FoodItemId,
                    Grams = 12
                });
            await _context.SaveChangesAsync();
        }

        private async Task SeedVietnameseEggRecipeWithSearchVideoFromCatalogAsync()
        {
            var seed = Assert.Single(VietnameseFoodCatalog.LoadRecipeSeeds(), item => item.Slug == "trung-chien-ca-chua");
            var egg = new FoodItem
            {
                FoodName = "Trứng",
                FoodNameUnsigned = "trung egg",
                FoodNameEn = "egg",
                CaloriesPer100g = 155,
                ProteinPer100g = 13,
                CarbPer100g = 1.1m,
                FatPer100g = 11,
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            var garlic = new FoodItem
            {
                FoodName = "Tỏi",
                FoodNameUnsigned = "toi garlic",
                FoodNameEn = "garlic",
                CaloriesPer100g = 149,
                ProteinPer100g = 6.4m,
                CarbPer100g = 33,
                FatPer100g = 0.5m,
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            var tomato = new FoodItem
            {
                FoodName = "Cà chua",
                FoodNameUnsigned = "ca chua tomato",
                FoodNameEn = "tomato",
                CaloriesPer100g = 18,
                ProteinPer100g = 0.9m,
                CarbPer100g = 3.9m,
                FatPer100g = 0.2m,
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _context.FoodItems.AddRangeAsync(egg, garlic, tomato);

            var recipe = new Recipe
            {
                RecipeName = seed.RecipeName,
                Description = seed.Description,
                ImageUrl = seed.ImageKey,
                CookTimeMinutes = seed.CookTimeMinutes,
                Difficulty = seed.Difficulty,
                ServingCount = seed.ServingCount,
                CredibilityScore = seed.CredibilityScore,
                InstructionsJson = JsonSerializer.Serialize(seed.Instructions),
                SourceUrlsJson = JsonSerializer.Serialize(seed.SourceUrls),
                VideoUrl = seed.VideoUrl,
                EnhancedAt = null,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _context.Recipes.AddAsync(recipe);
            await _context.SaveChangesAsync();

            await _context.RecipeIngredients.AddRangeAsync(
                new RecipeIngredient
                {
                    RecipeId = recipe.RecipeId,
                    FoodItemId = egg.FoodItemId,
                    Grams = 100
                },
                new RecipeIngredient
                {
                    RecipeId = recipe.RecipeId,
                    FoodItemId = garlic.FoodItemId,
                    Grams = 8
                },
                new RecipeIngredient
                {
                    RecipeId = recipe.RecipeId,
                    FoodItemId = tomato.FoodItemId,
                    Grams = 100
                });
            await _context.SaveChangesAsync();
        }

        private async Task<Recipe> SeedVietnamesePhoGaWithoutImageAsync()
        {
            var seed = Assert.Single(VietnameseFoodCatalog.LoadRecipeSeeds(), item => item.Slug == "pho-ga");
            var noodles = new FoodItem
            {
                FoodName = "Mì/bún/phở",
                FoodNameUnsigned = "mi bun pho noodles",
                FoodNameEn = "noodles",
                CaloriesPer100g = 138,
                ProteinPer100g = 4.5m,
                CarbPer100g = 25,
                FatPer100g = 2,
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            var chicken = new FoodItem
            {
                FoodName = "Thịt gà",
                FoodNameUnsigned = "thit ga ga chicken",
                FoodNameEn = "chicken",
                CaloriesPer100g = 165,
                ProteinPer100g = 31,
                CarbPer100g = 0,
                FatPer100g = 3.6m,
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _context.FoodItems.AddRangeAsync(noodles, chicken);

            var recipe = new Recipe
            {
                RecipeName = seed.RecipeName,
                Description = seed.Description,
                ImageUrl = null,
                CookTimeMinutes = seed.CookTimeMinutes,
                Difficulty = seed.Difficulty,
                ServingCount = seed.ServingCount,
                CredibilityScore = seed.CredibilityScore,
                InstructionsJson = JsonSerializer.Serialize(seed.Instructions),
                SourceUrlsJson = JsonSerializer.Serialize(seed.SourceUrls),
                VideoUrl = null,
                EnhancedAt = null,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _context.Recipes.AddAsync(recipe);
            await _context.SaveChangesAsync();

            await _context.RecipeIngredients.AddRangeAsync(
                new RecipeIngredient
                {
                    RecipeId = recipe.RecipeId,
                    FoodItemId = noodles.FoodItemId,
                    Grams = 180
                },
                new RecipeIngredient
                {
                    RecipeId = recipe.RecipeId,
                    FoodItemId = chicken.FoodItemId,
                    Grams = 150
                });
            await _context.SaveChangesAsync();

            return recipe;
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

            return (host.Equals("youtube.com", StringComparison.OrdinalIgnoreCase)
                    || host.Equals("m.youtube.com", StringComparison.OrdinalIgnoreCase))
                && path.Equals("watch", StringComparison.OrdinalIgnoreCase)
                && IsPlausibleYoutubeVideoId(GetQueryParameter(uri, "v"));
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

        private static RecipeCookingGuideDto BuildProductionGuide(int recipeId) => new()
        {
            RecipeId = recipeId,
            Steps = new List<string> { "Sơ chế nguyên liệu", "Nấu chín trên lửa vừa", "Nêm lại và hoàn thiện" },
            CookingTimeMinutes = 20,
            Difficulty = "Dễ",
            Tips = new List<string> { "Nấu lửa vừa để không cháy" },
            SourceUrls = new List<string> { "https://monngonmoingay.com/cong-thuc-demo" },
            YoutubeVideo = new RecipeYoutubeVideoDto
            {
                VideoId = "abc",
                Title = "Cách nấu món demo",
                ChannelTitle = "Trusted",
                Url = "https://www.youtube.com/watch?v=abc",
                ThumbnailUrl = "https://i.ytimg.com/vi/abc/hqdefault.jpg"
            },
            GuideStatus = "stored"
        };

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

        private sealed class TestHostEnvironment : IHostEnvironment
        {
            public string EnvironmentName { get; set; } = Environments.Production;
            public string ApplicationName { get; set; } = "EatFitAI.API.Tests";
            public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
            public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        }
    }
}
