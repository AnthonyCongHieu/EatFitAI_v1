using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EatFitAI.API.Data; // Using ApplicationDbContext
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Services.Interfaces;
using EatFitAI.API.DTOs.User;
using EatFitAI.API.Models; // Using standard Models
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace EatFitAI.API.Services
{
    /// <summary>
    /// Database-only recipe suggestion service with caching
    /// Finds recipes that match available ingredients and user preferences
    /// </summary>
    public class RecipeSuggestionService : IRecipeSuggestionService
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<RecipeSuggestionService> _logger;
        private readonly IMemoryCache _cache;
        private readonly IUserPreferenceService _userPreferenceService;
        
        // Cache configuration
        private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(10);
        private const string AllRecipesCacheKey = "AllRecipesWithIngredients";

        public RecipeSuggestionService(
            ApplicationDbContext db,
            ILogger<RecipeSuggestionService> logger,
            IMemoryCache cache,
            IUserPreferenceService userPreferenceService)
        {
            _db = db;
            _logger = logger;
            _cache = cache;
            _userPreferenceService = userPreferenceService;
        }

        // Dictionary ánh xạ tên nguyên liệu tiếng Anh -> tiếng Việt (lowercase)
        private static readonly Dictionary<string, List<string>> _ingredientMappings = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase)
        {
            // Thịt
            { "chicken", new List<string> { "gà", "thịt gà", "ức gà", "đùi gà", "cánh gà" } },
            { "pork", new List<string> { "heo", "thịt heo", "thịt lợn", "ba chỉ", "thịt ba chỉ" } },
            { "beef", new List<string> { "bò", "thịt bò" } },
            { "fish", new List<string> { "cá", "cá hồi", "cá thu", "cá basa" } },
            { "shrimp", new List<string> { "tôm" } },
            { "egg", new List<string> { "trứng", "trứng gà" } },
            // Rau củ
            { "tomato", new List<string> { "cà chua" } },
            { "carrot", new List<string> { "cà rốt" } },
            { "potato", new List<string> { "khoai tây" } },
            { "onion", new List<string> { "hành", "hành tây" } },
            { "garlic", new List<string> { "tỏi" } },
            { "lettuce", new List<string> { "xà lách", "rau xà lách" } },
            { "salad", new List<string> { "xà lách", "salad", "rau trộn" } },
            { "cucumber", new List<string> { "dưa chuột", "dưa leo" } },
            { "cabbage", new List<string> { "bắp cải", "cải bắp" } },
            { "spinach", new List<string> { "rau bina", "rau chân vịt" } },
            { "broccoli", new List<string> { "bông cải xanh", "súp lơ xanh" } },
            { "mushroom", new List<string> { "nấm" } },
            { "pepper", new List<string> { "ớt", "tiêu" } },
            { "corn", new List<string> { "bắp", "ngô" } },
            // Trái cây
            { "apple", new List<string> { "táo" } },
            { "banana", new List<string> { "chuối" } },
            { "orange", new List<string> { "cam" } },
            // Khác
            { "rice", new List<string> { "gạo", "cơm" } },
            { "noodle", new List<string> { "mì", "bún", "phở" } },
            { "tofu", new List<string> { "đậu hũ", "đậu phụ" } },
        };

        private List<string> ExpandIngredientNames(List<string> ingredients)
        {
            var expanded = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var ingredient in ingredients)
            {
                expanded.Add(ingredient);
                if (_ingredientMappings.TryGetValue(ingredient, out var vietnameseNames))
                {
                    foreach (var viName in vietnameseNames)
                    {
                        expanded.Add(viName);
                    }
                }
            }
            return expanded.ToList();
        }

        public async Task<List<RecipeSuggestionDto>> SuggestRecipesAsync(
            RecipeSuggestionRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request.AvailableIngredients == null || request.AvailableIngredients.Count == 0)
            {
                return new List<RecipeSuggestionDto>();
            }

            var normalizedIngredients = request.AvailableIngredients
                .Select(i => i.Trim().ToLowerInvariant())
                .Where(i => !string.IsNullOrWhiteSpace(i))
                .ToList();

            if (normalizedIngredients.Count == 0)
            {
                return new List<RecipeSuggestionDto>();
            }

            // Get user preferences for filtering
            UserPreferenceDto? userPrefs = null;
            if (request.UserId.HasValue)
            {
                userPrefs = await _userPreferenceService.GetUserPreferenceAsync(request.UserId.Value, cancellationToken);
            }

            var forbiddenKeywords = GetForbiddenKeywords(userPrefs);
            var expandedIngredients = ExpandIngredientNames(normalizedIngredients);

            _logger.LogInformation("Searching recipes (User: {UserId}, Forbidden keywords: {ForbiddenCount})", 
                request.UserId, forbiddenKeywords.Count);

            var recipesWithIngredients = await _cache.GetOrCreateAsync(
                AllRecipesCacheKey,
                async entry =>
                {
                    entry.AbsoluteExpirationRelativeToNow = CacheDuration;
                    return await _db.Recipes
                        .Where(r => !r.IsDeleted)
                        .Include(r => r.RecipeIngredients)
                        .ThenInclude(ri => ri.FoodItem)
                        .AsNoTracking()
                        .ToListAsync(cancellationToken);
                }) ?? new List<Recipe>();

            var recipeSuggestions = new List<RecipeSuggestionDto>();

            foreach (var recipe in recipesWithIngredients)
            {
                var recipeIngredientNames = recipe.RecipeIngredients
                    .Where(ri => ri.FoodItem != null && !ri.FoodItem.IsDeleted)
                    .Select(ri => ri.FoodItem.FoodName.Trim().ToLowerInvariant())
                    .ToList();

                if (recipeIngredientNames.Count == 0) continue;

                // 1. Dietary/Allergy Filtering
                if (forbiddenKeywords.Any())
                {
                    bool isForbidden = false;
                    foreach (var ingName in recipeIngredientNames)
                    {
                        if (forbiddenKeywords.Any(k => ingName.Contains(k)))
                        {
                            isForbidden = true;
                            break;
                        }
                    }
                    if (isForbidden) continue;
                }

                // 2. Ingredient Matching
                var matchedIngredients = recipeIngredientNames
                    .Where(recipeName => expandedIngredients.Any(available =>
                        recipeName.Contains(available) || available.Contains(recipeName)))
                    .ToList();

                var matchCount = matchedIngredients.Count;

                if (matchCount < (request.MinMatchedIngredients ?? 1)) continue;

                var (calories, protein, carbs, fat) = CalculateRecipeNutrition(recipe.RecipeIngredients.ToList());

                var missingIngredients = recipeIngredientNames
                    .Except(matchedIngredients)
                    .Select(name => recipe.RecipeIngredients
                        .FirstOrDefault(ri => ri.FoodItem != null && ri.FoodItem.FoodName.Trim().ToLowerInvariant() == name)?.FoodItem.FoodName)
                    .Where(name => !string.IsNullOrEmpty(name))
                    .Select(name => name!)
                    .ToList();

                recipeSuggestions.Add(new RecipeSuggestionDto
                {
                    RecipeId = recipe.RecipeId,
                    RecipeName = recipe.RecipeName,
                    Description = recipe.Description,
                    TotalCalories = calories,
                    TotalProtein = protein,
                    TotalCarbs = carbs,
                    TotalFat = fat,
                    MatchedIngredientsCount = matchCount,
                    TotalIngredientsCount = recipeIngredientNames.Count,
                    MatchPercentage = recipeIngredientNames.Count > 0
                        ? ((decimal)matchCount / (decimal)recipeIngredientNames.Count) * 100m
                        : 0m,
                    MatchedIngredients = matchedIngredients
                        .Select(name => recipe.RecipeIngredients
                            .FirstOrDefault(ri => ri.FoodItem != null && ri.FoodItem.FoodName.Trim().ToLowerInvariant() == name)?.FoodItem.FoodName)
                        .Where(name => !string.IsNullOrEmpty(name))
                        .Select(name => name!)
                        .ToList(),
                    MissingIngredients = missingIngredients,
                    AllIngredients = recipe.RecipeIngredients
                        .Where(ri => ri.FoodItem != null)
                        .Select(ri => ri.FoodItem.FoodName)
                        .ToList()
                });
            }

            return recipeSuggestions
                .OrderByDescending(r => r.MatchPercentage)
                .ThenBy(r => r.TotalIngredientsCount)
                .Take(request.MaxResults)
                .ToList();
        }

        public async Task<RecipeDetailDto?> GetRecipeDetailAsync(
            int recipeId,
            CancellationToken cancellationToken = default)
        {
            var recipe = await _db.Recipes
                .Where(r => r.RecipeId == recipeId && !r.IsDeleted)
                .Include(r => r.RecipeIngredients)
                .ThenInclude(ri => ri.FoodItem)
                .FirstOrDefaultAsync(cancellationToken);

            if (recipe == null) return null;

            var (totalCalories, totalProtein, totalCarbs, totalFat) = 
                CalculateRecipeNutrition(recipe.RecipeIngredients.ToList());

            var ingredientDetails = recipe.RecipeIngredients
                .Where(ri => ri.FoodItem != null && !ri.FoodItem.IsDeleted)
                .Select(ri =>
                {
                    var factor = ri.Grams / 100m;
                    return new RecipeIngredientDetailDto
                    {
                        FoodItemId = ri.FoodItemId,
                        FoodName = ri.FoodItem.FoodName,
                        Grams = ri.Grams,
                        Calories = ri.FoodItem.CaloriesPer100g * factor,
                        Protein = ri.FoodItem.ProteinPer100g * factor,
                        Carbs = ri.FoodItem.CarbPer100g * factor,
                        Fat = ri.FoodItem.FatPer100g * factor
                    };
                })
                .ToList();

            return new RecipeDetailDto
            {
                RecipeId = recipe.RecipeId,
                RecipeName = recipe.RecipeName,
                Description = recipe.Description,
                TotalCalories = totalCalories,
                TotalProtein = totalProtein,
                TotalCarbs = totalCarbs,
                TotalFat = totalFat,
                Ingredients = ingredientDetails
            };
        }

        private (decimal calories, decimal protein, decimal carbs, decimal fat) CalculateRecipeNutrition(
            List<RecipeIngredient> ingredients)
        {
            decimal totalCals = 0m, totalP = 0m, totalC = 0m, totalF = 0m;
            foreach (var ingredient in ingredients.Where(i => i.FoodItem != null && !i.FoodItem.IsDeleted))
            {
                var factor = ingredient.Grams / 100m;
                totalCals += ingredient.FoodItem.CaloriesPer100g * factor;
                totalP += ingredient.FoodItem.ProteinPer100g * factor;
                totalC += ingredient.FoodItem.CarbPer100g * factor;
                totalF += ingredient.FoodItem.FatPer100g * factor;
            }
            return (totalCals, totalP, totalC, totalF);
        }

        private List<string> GetForbiddenKeywords(UserPreferenceDto? prefs)
        {
            var keywords = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (prefs == null) return keywords.ToList();

            if (prefs.DietaryRestrictions != null)
            {
                foreach (var diet in prefs.DietaryRestrictions)
                {
                    var d = diet.ToLower();
                    if (d.Contains("vegetarian") || d.Contains("chay"))
                    {
                        keywords.UnionWith(new[] { "thịt", "bò", "heo", "gà", "cá", "tôm", "pork", "beef", "chicken" });
                    }
                    if (d.Contains("no pork") || d.Contains("không ăn thịt heo"))
                    {
                        keywords.UnionWith(new[] { "heo", "pork" });
                    }
                    if (d.Contains("no beef") || d.Contains("không ăn thịt bò"))
                    {
                        keywords.UnionWith(new[] { "bò", "beef" });
                    }
                }
            }

            if (prefs.Allergies != null)
            {
                foreach (var allergy in prefs.Allergies)
                {
                    var a = allergy.ToLower();
                    if (a.Contains("seafood") || a.Contains("hải sản"))
                    {
                        keywords.UnionWith(new[] { "tôm", "cá", "mực", "cua", "shrimp", "fish" });
                    }
                    if (a.Contains("peanuts") || a.Contains("đậu phộng") || a.Contains("lạc"))
                    {
                        keywords.UnionWith(new[] { "lạc", "đậu phộng", "peanut" });
                    }
                    if (a.Contains("dairy") || a.Contains("sữa"))
                    {
                        keywords.UnionWith(new[] { "sữa", "phô mai", "cheese", "milk" });
                    }
                    if (a.Contains("eggs") || a.Contains("trứng"))
                    {
                        keywords.UnionWith(new[] { "trứng", "egg" });
                    }
                }
            }
            return keywords.ToList();
        }
    }
}
