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
                InstructionsJson = "[\"Sơ chế\", \"Xào trứng\", \"Hoàn thiện\"]",
                SourceUrlsJson = "[\"https://monngonmoingay.com/cong-thuc-demo\"]",
                VideoUrl = "https://www.youtube.com/results?search_query=c%C3%A1ch+n%E1%BA%A5u+Tr%E1%BB%A9ng+x%C3%A0o+c%C3%A0+chua",
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
                    ImageUrl = "recipe-images/v1/thumb/trung-hap-nhanh.webp",
                    CookTimeMinutes = 15,
                    InstructionsJson = "[\"Sơ chế\", \"Hấp chín\", \"Hoàn thiện\"]",
                    SourceUrlsJson = "[\"https://monngonmoingay.com/trung-hap-nhanh\"]",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Recipe
                {
                    RecipeId = 3,
                    RecipeName = "Trứng om chậm",
                    Description = "Chậm",
                    ImageUrl = "recipe-images/v1/thumb/trung-om-cham.webp",
                    CookTimeMinutes = 45,
                    InstructionsJson = "[\"Sơ chế\", \"Om chậm\", \"Hoàn thiện\"]",
                    SourceUrlsJson = "[\"https://monngonmoingay.com/trung-om-cham\"]",
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
                    ImageUrl = "recipe-images/v1/thumb/trung-ca-chua-vua-kcal.webp",
                    CookTimeMinutes = 20,
                    InstructionsJson = "[\"Sơ chế\", \"Xào chín\", \"Hoàn thiện\"]",
                    SourceUrlsJson = "[\"https://monngonmoingay.com/trung-ca-chua-vua\"]",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Recipe
                {
                    RecipeId = 3,
                    RecipeName = "Trứng cà chua nhiều kcal",
                    ImageUrl = "recipe-images/v1/thumb/trung-ca-chua-nhieu-kcal.webp",
                    CookTimeMinutes = 20,
                    InstructionsJson = "[\"Sơ chế\", \"Xào nhiều\", \"Hoàn thiện\"]",
                    SourceUrlsJson = "[\"https://monngonmoingay.com/trung-ca-chua-nhieu\"]",
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
                InstructionsJson = "[\"Sơ chế\", \"Xào chín\", \"Hoàn thiện\"]",
                SourceUrlsJson = "[\"https://monngonmoingay.com/trung-ca-chua-du\"]",
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
        public async Task SuggestRecipesAsync_HidesRecipesWithoutProductionGuide()
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
        public async Task SuggestRecipesAsync_AllowsSourceBackedGuideWhenVideoIsUnavailable()
        {
            await SeedDatabaseAsync();

            var result = await _service.SuggestRecipesAsync(new RecipeSuggestionRequest
            {
                Mode = "ingredient_combo",
                AvailableIngredients = new List<string> { "Trứng", "Cà chua" },
                MaxResults = 5
            });

            var suggestion = Assert.Single(result);
            Assert.Equal("Trứng xào cà chua", suggestion.RecipeName);
            Assert.Null(suggestion.YoutubeVideo);
            Assert.Equal(new[] { "https://monngonmoingay.com/cong-thuc-demo" }, suggestion.SourceUrls);
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
            Assert.Equal(new[] { "Sơ chế nguyên liệu", "Nấu chín trên lửa vừa", "Nêm lại và hoàn thiện" }, result.Instructions);
            Assert.Equal(new[] { "https://monngonmoingay.com/cong-thuc-demo" }, result.SourceUrls);
            Assert.Equal("https://www.youtube.com/watch?v=abc", result.VideoUrl);
            Assert.Equal("https://www.youtube.com/watch?v=abc", result.YoutubeVideo!.Url);
            Assert.Equal("stored", result.GuideStatus);
            Assert.Equal(new[] { "Trứng", "Cà chua", "Hành tây" }, result.RequiredIngredients);
            Assert.Contains("không phải khuyến nghị của chuyên gia", result.Disclaimer);
        }

        [Fact]
        public async Task GetRecipeDetailAsync_NormalizesGenericIngredientAliasesForDisplay()
        {
            var pho = new FoodItem
            {
                FoodItemId = 20,
                FoodName = "Phở",
                FoodNameUnsigned = "pho",
                CaloriesPer100g = 138,
                ProteinPer100g = 4,
                CarbPer100g = 26,
                FatPer100g = 1,
                IsActive = true,
                IsDeleted = false
            };
            var beef = new FoodItem
            {
                FoodItemId = 21,
                FoodName = "Bò",
                FoodNameUnsigned = "bo",
                FoodNameEn = "beef",
                CaloriesPer100g = 187,
                ProteinPer100g = 26,
                CarbPer100g = 0,
                FatPer100g = 9,
                IsActive = true,
                IsDeleted = false
            };
            var recipe = new Recipe
            {
                RecipeId = 20,
                RecipeName = "Phở bò",
                ImageUrl = "recipe-images/v1/thumb/pho-bo.webp",
                InstructionsJson = "[\"Sơ chế\", \"Nấu\", \"Hoàn thiện\"]",
                SourceUrlsJson = "[\"https://monngonmoingay.com/cong-thuc-demo\"]",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsDeleted = false
            };

            _context.FoodItems.AddRange(pho, beef);
            _context.Recipes.Add(recipe);
            _context.RecipeIngredients.AddRange(
                new RecipeIngredient { RecipeId = 20, FoodItemId = pho.FoodItemId, Grams = 180 },
                new RecipeIngredient { RecipeId = 20, FoodItemId = beef.FoodItemId, Grams = 150 });
            await _context.SaveChangesAsync();

            var result = await _service.GetRecipeDetailAsync(recipe.RecipeId);

            Assert.NotNull(result);
            Assert.Equal(new[] { "Bánh phở", "Thịt bò" }, result!.RequiredIngredients);
            Assert.Equal(new[] { "Bánh phở", "Thịt bò" }, result.Ingredients.Select(item => item.FoodName));
        }

        [Fact]
        public async Task SuggestRecipesAsync_UsesNutritionProxyWithoutDisplayingItAsIngredient()
        {
            var chili = new FoodItem
            {
                FoodItemId = 10,
                FoodName = "Ớt",
                CaloriesPer100g = 40,
                ProteinPer100g = 1.9m,
                CarbPer100g = 9,
                FatPer100g = 0.4m,
                IsActive = true,
                IsDeleted = false
            };
            var greenOnion = new FoodItem
            {
                FoodItemId = 11,
                FoodName = "Hành lá",
                CaloriesPer100g = 32,
                ProteinPer100g = 1.8m,
                CarbPer100g = 7.3m,
                FatPer100g = 0.2m,
                IsActive = true,
                IsDeleted = false
            };
            var nutritionProxy = new FoodItem
            {
                FoodItemId = 12,
                FoodName = "Bánh khọt",
                CaloriesPer100g = 245,
                ProteinPer100g = 6,
                CarbPer100g = 38,
                FatPer100g = 8,
                VerificationStatus = "estimated",
                IsActive = true,
                IsDeleted = false
            };
            var recipe = new Recipe
            {
                RecipeId = 10,
                RecipeName = "Bánh khọt",
                Description = "Công thức dùng estimate món hoàn chỉnh",
                ImageUrl = "recipe-images/v1/thumb/banh-khot.webp",
                InstructionsJson = "[\"Sơ chế\", \"Nấu\", \"Hoàn thiện\"]",
                SourceUrlsJson = "[\"https://monngonmoingay.com/cong-thuc-demo\"]",
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.FoodItems.AddRange(chili, greenOnion, nutritionProxy);
            _context.Recipes.Add(recipe);
            _context.RecipeIngredients.AddRange(
                new RecipeIngredient { RecipeId = 10, FoodItemId = chili.FoodItemId, Grams = 6 },
                new RecipeIngredient { RecipeId = 10, FoodItemId = greenOnion.FoodItemId, Grams = 20 },
                new RecipeIngredient { RecipeId = 10, FoodItemId = nutritionProxy.FoodItemId, Grams = 116.4m });
            await _context.SaveChangesAsync();

            var suggestions = await _service.SuggestRecipesAsync(new RecipeSuggestionRequest
            {
                Mode = "ingredient_combo",
                AvailableIngredients = new List<string> { "Ớt" },
                MaxResults = 5
            });

            var suggestion = Assert.Single(suggestions);
            Assert.Equal("Bánh khọt", suggestion.RecipeName);
            Assert.InRange(suggestion.TotalCalories, 293m, 295m);
            Assert.Equal(2, suggestion.TotalIngredientsCount);
            Assert.DoesNotContain("Bánh khọt", suggestion.RequiredIngredients);

            var detail = await _service.GetRecipeDetailAsync(recipe.RecipeId);
            Assert.NotNull(detail);
            Assert.InRange(detail!.TotalCalories, 293m, 295m);
            Assert.DoesNotContain(detail.Ingredients, ingredient => ingredient.FoodName == "Bánh khọt");
            Assert.DoesNotContain("Bánh khọt", detail.RequiredIngredients);
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
    }
}
