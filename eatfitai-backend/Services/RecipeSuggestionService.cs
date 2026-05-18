using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using EatFitAI.API.Data;
using EatFitAI.API.DbScaffold.Data; // FIX: Using EatFitAIDbContext (scaffolded)
using EatFitAI.API.DbScaffold.Models; // FIX: Using scaffolded Models
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Services.Interfaces;
using EatFitAI.API.DTOs.User;
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
        private readonly EatFitAIDbContext _db; // FIX: Đổi sang EatFitAIDbContext
        private readonly ILogger<RecipeSuggestionService> _logger;
        private readonly IMemoryCache _cache;
        private readonly IUserPreferenceService _userPreferenceService;
        
        // Cache configuration
        private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(10);
        private const string AllRecipesCacheKey = "AllRecipesWithIngredients";

        public RecipeSuggestionService(
            EatFitAIDbContext db, // FIX: Đổi sang EatFitAIDbContext
            ILogger<RecipeSuggestionService> logger,
            IMemoryCache cache,
            IUserPreferenceService userPreferenceService)
        {
            _db = db;
            _logger = logger;
            _cache = cache;
            _userPreferenceService = userPreferenceService;
        }

        public async Task<List<RecipeSuggestionDto>> SuggestRecipesAsync(
            RecipeSuggestionRequest request,
            CancellationToken cancellationToken = default)
        {
            var query = BuildIngredientQuery(request);
            if (query.NameKeys.Count == 0 && query.FoodItemIds.Count == 0)
            {
                return new List<RecipeSuggestionDto>();
            }

            // Get user preferences for filtering (with error handling)
            // NOTE: UserPreferenceService dùng ApplicationDbContext, có thể fail
            UserPreferenceDto? userPrefs = null;
            if (request.UserId.HasValue)
            {
                try
                {
                    userPrefs = await _userPreferenceService.GetUserPreferenceAsync(request.UserId.Value, cancellationToken);
                }
                catch (Exception ex)
                {
                    // Log warning nhưng không crash - recipe suggestion vẫn hoạt động
                    _logger.LogWarning(ex, "Failed to get user preferences for UserId {UserId}, continuing without dietary restrictions", request.UserId.Value);
                }
            }

            var forbiddenKeywords = GetForbiddenIngredientKeys(userPrefs);
            var maxResults = Math.Clamp(request.MaxResults, 1, 20);

            _logger.LogInformation("Searching recipes (User: {UserId}, Forbidden keywords: {ForbiddenCount})", 
                request.UserId, forbiddenKeywords.Count);

            var recipesWithIngredients = await _cache.GetOrCreateAsync(
                AllRecipesCacheKey,
                async entry =>
                {
                    entry.AbsoluteExpirationRelativeToNow = CacheDuration;
                    return await _db.Recipes
                        .Include(r => r.RecipeIngredients)
                        .ThenInclude(ri => ri.FoodItem)
                        .AsNoTracking()
                        .ToListAsync(cancellationToken);
                }) ?? new List<Recipe>();

            var recipeSuggestions = new List<RecipeSuggestionDto>();

            foreach (var recipe in recipesWithIngredients)
            {
                if (request.MaxCookingTimeMinutes.HasValue
                    && (!recipe.CookTimeMinutes.HasValue
                        || recipe.CookTimeMinutes.Value > request.MaxCookingTimeMinutes.Value))
                {
                    continue;
                }

                var recipeIngredients = recipe.RecipeIngredients
                    .Where(ri => ri.FoodItem != null && !ri.FoodItem.IsDeleted && ri.FoodItem.IsActive)
                    .ToList();

                if (recipeIngredients.Count == 0) continue;

                // 1. Dietary/Allergy Filtering
                if (forbiddenKeywords.Any())
                {
                    var isForbidden = recipeIngredients.Any(ingredient =>
                        GetIngredientKeys(ingredient.FoodItem).Any(forbiddenKeywords.Contains));
                    if (isForbidden) continue;
                }

                // 2. Ingredient Matching
                var matchedIngredients = recipeIngredients
                    .Select(ingredient => new
                    {
                        Ingredient = ingredient,
                        Match = MatchIngredient(ingredient, query)
                    })
                    .Where(item => item.Match != null)
                    .ToList();

                var matchCount = matchedIngredients.Count;

                if (matchCount < (request.MinMatchedIngredients ?? 1)) continue;

                var (calories, protein, carbs, fat) = CalculateRecipeNutrition(recipeIngredients);
                var totalGrams = CalculateTotalGrams(recipeIngredients);
                var matchedIngredientIds = matchedIngredients
                    .Select(item => item.Ingredient.FoodItemId)
                    .ToHashSet();
                var missingIngredients = recipeIngredients
                    .Where(ingredient => !matchedIngredientIds.Contains(ingredient.FoodItemId))
                    .Select(ingredient => ingredient.FoodItem.FoodName)
                    .ToList();
                var matchPercentage = recipeIngredients.Count > 0
                    ? ((decimal)matchCount / recipeIngredients.Count) * 100m
                    : 0m;
                var score = CalculateMatchScore(
                    request,
                    recipe,
                    recipeIngredients,
                    matchedIngredients.Select(item => item.Match!).ToList(),
                    calories,
                    protein,
                    carbs,
                    fat);

                recipeSuggestions.Add(new RecipeSuggestionDto
                {
                    RecipeId = recipe.RecipeId,
                    RecipeName = recipe.RecipeName,
                    Description = recipe.Description,
                    TotalCalories = calories,
                    TotalProtein = protein,
                    TotalCarbs = carbs,
                    TotalFat = fat,
                    TotalGrams = totalGrams,
                    ImageUrl = recipe.ImageUrl,
                    ImageVariants = MediaVariantHelper.FromThumbUrl(recipe.ImageUrl),
                    CookTimeMinutes = recipe.CookTimeMinutes,
                    Difficulty = recipe.Difficulty,
                    ServingCount = recipe.ServingCount,
                    MatchedIngredientsCount = matchCount,
                    TotalIngredientsCount = recipeIngredients.Count,
                    MatchPercentage = matchPercentage,
                    MatchScore = score.Total,
                    MissingIngredientCount = missingIngredients.Count,
                    ScoreReasons = score.Reasons,
                    MatchedIngredients = matchedIngredients
                        .Select(item => item.Ingredient.FoodItem.FoodName)
                        .ToList(),
                    MissingIngredients = missingIngredients,
                    AllIngredients = recipeIngredients
                        .Select(ri => ri.FoodItem.FoodName)
                        .ToList()
                });
            }

            return recipeSuggestions
                .OrderByDescending(r => r.MatchScore)
                .ThenByDescending(r => r.MatchPercentage)
                .ThenBy(r => r.TotalIngredientsCount)
                .Take(maxResults)
                .ToList();
        }

        public async Task<RecipeDetailDto?> GetRecipeDetailAsync(
            int recipeId,
            CancellationToken cancellationToken = default)
        {
            var recipe = await _db.Recipes
                .Where(r => r.RecipeId == recipeId)
                .Include(r => r.RecipeIngredients)
                .ThenInclude(ri => ri.FoodItem)
                .FirstOrDefaultAsync(cancellationToken);

            if (recipe == null) return null;

            var (totalCalories, totalProtein, totalCarbs, totalFat) = 
                CalculateRecipeNutrition(recipe.RecipeIngredients.ToList());
            var totalGrams = CalculateTotalGrams(recipe.RecipeIngredients.ToList());

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

            var instructions = ParseInstructions(recipe.InstructionsJson) ?? TryGetRecipeInstructions(recipe);
            var videoUrl = recipe.VideoUrl ?? TryGetRecipeVideoUrl(recipe);

            return new RecipeDetailDto
            {
                RecipeId = recipe.RecipeId,
                RecipeName = recipe.RecipeName,
                Description = recipe.Description,
                TotalCalories = totalCalories,
                TotalProtein = totalProtein,
                TotalCarbs = totalCarbs,
                TotalFat = totalFat,
                TotalGrams = totalGrams,
                ImageUrl = recipe.ImageUrl,
                ImageVariants = MediaVariantHelper.FromThumbUrl(recipe.ImageUrl),
                CookTimeMinutes = recipe.CookTimeMinutes,
                Difficulty = recipe.Difficulty,
                ServingCount = recipe.ServingCount,
                CredibilityScore = recipe.CredibilityScore,
                Instructions = instructions,
                VideoUrl = videoUrl,
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

        private static decimal CalculateTotalGrams(List<RecipeIngredient> ingredients)
        {
            return ingredients
                .Where(i => i.FoodItem != null && !i.FoodItem.IsDeleted && i.FoodItem.IsActive)
                .Sum(i => i.Grams);
        }

        private static IngredientQuery BuildIngredientQuery(RecipeSuggestionRequest request)
        {
            var nameKeys = new HashSet<string>(StringComparer.Ordinal);
            foreach (var ingredient in request.AvailableIngredients ?? new List<string>())
            {
                AddNameKey(nameKeys, ingredient);
            }

            foreach (var hint in request.IngredientHints ?? new List<RecipeIngredientHintDto>())
            {
                AddNameKey(nameKeys, hint.Name);
            }

            ExpandAliasKeys(nameKeys);

            var foodItemIds = new HashSet<int>(request.AvailableFoodItemIds ?? new List<int>());
            foreach (var hint in request.IngredientHints ?? new List<RecipeIngredientHintDto>())
            {
                if (hint.FoodItemId.HasValue && hint.FoodItemId.Value > 0)
                {
                    foodItemIds.Add(hint.FoodItemId.Value);
                }
            }

            var confidenceByFoodItemId = (request.IngredientHints ?? new List<RecipeIngredientHintDto>())
                .Where(hint => hint.FoodItemId.HasValue && hint.FoodItemId.Value > 0)
                .GroupBy(hint => hint.FoodItemId!.Value)
                .ToDictionary(
                    group => group.Key,
                    group => ClampConfidence(group.Max(hint => hint.Confidence ?? 1m)));

            var confidenceByNameKey = (request.IngredientHints ?? new List<RecipeIngredientHintDto>())
                .Where(hint => !string.IsNullOrWhiteSpace(hint.Name))
                .Select(hint => new
                {
                    Key = AiVisionLabelCatalog.NormalizeKey(hint.Name),
                    Confidence = ClampConfidence(hint.Confidence ?? 1m)
                })
                .Where(item => !string.IsNullOrWhiteSpace(item.Key))
                .GroupBy(item => item.Key, StringComparer.Ordinal)
                .ToDictionary(
                    group => group.Key,
                    group => group.Max(item => item.Confidence),
                    StringComparer.Ordinal);

            return new IngredientQuery(nameKeys, foodItemIds, confidenceByFoodItemId, confidenceByNameKey);
        }

        private static void AddNameKey(HashSet<string> keys, string? value)
        {
            var key = AiVisionLabelCatalog.NormalizeKey(value);
            if (!string.IsNullOrWhiteSpace(key))
            {
                keys.Add(key);
            }
        }

        private static void ExpandAliasKeys(HashSet<string> keys)
        {
            var matchedEntries = AiVisionLabelCatalog.Entries
                .Where(entry =>
                    keys.Contains(AiVisionLabelCatalog.NormalizeKey(entry.DisplayNameVi))
                    || entry.Aliases.Any(alias => keys.Contains(AiVisionLabelCatalog.NormalizeKey(alias))))
                .ToList();

            foreach (var entry in matchedEntries)
            {
                AddNameKey(keys, entry.DisplayNameVi);
                AddNameKey(keys, entry.Label);
                foreach (var alias in entry.Aliases)
                {
                    AddNameKey(keys, alias);
                }
            }
        }

        private static IngredientMatch? MatchIngredient(RecipeIngredient ingredient, IngredientQuery query)
        {
            if (query.FoodItemIds.Contains(ingredient.FoodItemId))
            {
                return new IngredientMatch(
                    ingredient.FoodItemId,
                    true,
                    query.ConfidenceByFoodItemId.GetValueOrDefault(ingredient.FoodItemId, 1m));
            }

            var matchedKey = GetIngredientKeys(ingredient.FoodItem)
                .FirstOrDefault(query.NameKeys.Contains);
            if (matchedKey == null)
            {
                return null;
            }

            return new IngredientMatch(
                ingredient.FoodItemId,
                false,
                query.ConfidenceByNameKey.GetValueOrDefault(matchedKey, 0.9m));
        }

        private static HashSet<string> GetIngredientKeys(FoodItem food)
        {
            var keys = new HashSet<string>(StringComparer.Ordinal);
            AddNameKey(keys, food.FoodName);
            AddNameKey(keys, food.FoodNameUnsigned);
            AddNameKey(keys, food.FoodNameEn);
            ExpandAliasKeys(keys);
            return keys;
        }

        private static RecipeScore CalculateMatchScore(
            RecipeSuggestionRequest request,
            Recipe recipe,
            IReadOnlyCollection<RecipeIngredient> ingredients,
            IReadOnlyCollection<IngredientMatch> matches,
            decimal calories,
            decimal protein,
            decimal carbs,
            decimal fat)
        {
            var coverageRatio = ingredients.Count == 0 ? 0m : (decimal)matches.Count / ingredients.Count;
            var coverageScore = coverageRatio * 60m;
            var averageConfidence = matches.Count == 0 ? 0m : matches.Average(match => match.Confidence);
            var confidenceScore = averageConfidence * 10m;
            var exactMatchBonus = matches.Count == 0
                ? 0m
                : ((decimal)matches.Count(match => match.IsExactFoodItemId) / matches.Count) * 5m;
            var nutritionScore = CalculateNutritionFitScore(request, calories, protein, carbs, fat);
            var trustScore = Math.Clamp(recipe.CredibilityScore, 0, 100) / 100m * 10m;
            var timeScore = CalculateTimeScore(request.MaxCookingTimeMinutes, recipe.CookTimeMinutes);

            var reasons = new List<string>
            {
                $"Khớp {matches.Count}/{ingredients.Count} nguyên liệu"
            };

            if (matches.Any(match => match.IsExactFoodItemId))
            {
                reasons.Add("Có nguyên liệu khớp chính xác từ giỏ quét");
            }

            if (nutritionScore > 0m && request.RemainingCalories.HasValue)
            {
                reasons.Add("Phù hợp mục tiêu dinh dưỡng còn lại");
            }

            if (recipe.CookTimeMinutes.HasValue)
            {
                reasons.Add($"Khoảng {recipe.CookTimeMinutes.Value} phút");
            }

            return new RecipeScore(
                Math.Round(coverageScore + confidenceScore + exactMatchBonus + nutritionScore + trustScore + timeScore, 2),
                reasons);
        }

        private static decimal CalculateNutritionFitScore(
            RecipeSuggestionRequest request,
            decimal calories,
            decimal protein,
            decimal carbs,
            decimal fat)
        {
            var score = 0m;
            score += CalculateTargetScore(request.RemainingCalories, calories, 12m);
            score += CalculateTargetScore(request.RemainingProtein, protein, 4m);
            score += CalculateTargetScore(request.RemainingCarbs, carbs, 2m);
            score += CalculateTargetScore(request.RemainingFat, fat, 2m);
            return score;
        }

        private static decimal CalculateTargetScore(decimal? target, decimal actual, decimal maxScore)
        {
            if (!target.HasValue || target.Value <= 0m)
            {
                return 0m;
            }

            var ratio = Math.Min(1m, Math.Abs(actual - target.Value) / target.Value);
            return Math.Round((1m - ratio) * maxScore, 2);
        }

        private static decimal CalculateTimeScore(int? maxMinutes, int? cookTimeMinutes)
        {
            if (!maxMinutes.HasValue || !cookTimeMinutes.HasValue || maxMinutes.Value <= 0)
            {
                return 0m;
            }

            var ratio = Math.Clamp((decimal)cookTimeMinutes.Value / maxMinutes.Value, 0m, 1m);
            return Math.Round((1m - ratio) * 3m, 2);
        }

        private static decimal ClampConfidence(decimal confidence)
        {
            return Math.Clamp(confidence, 0m, 1m);
        }

        private List<string> GetForbiddenIngredientKeys(UserPreferenceDto? prefs)
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
            return keywords
                .Select(AiVisionLabelCatalog.NormalizeKey)
                .Where(keyword => !string.IsNullOrWhiteSpace(keyword))
                .ToList();
        }

        private static List<string>? ParseInstructions(string? instructionsJson)
        {
            if (string.IsNullOrWhiteSpace(instructionsJson))
            {
                return null;
            }

            try
            {
                var parsed = System.Text.Json.JsonSerializer.Deserialize<List<string>>(instructionsJson);
                var steps = parsed?
                    .Select(step => step?.Trim())
                    .Where(step => !string.IsNullOrWhiteSpace(step))
                    .Select(step => step!)
                    .ToList();
                return steps is { Count: > 0 } ? steps : null;
            }
            catch (System.Text.Json.JsonException)
            {
                var steps = instructionsJson
                    .Split(new[] { "\r\n", "\n", "\r" }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(step => step.Trim())
                    .Where(step => !string.IsNullOrWhiteSpace(step))
                    .ToList();
                return steps.Count > 0 ? steps : null;
            }
        }

        private static List<string>? TryGetRecipeInstructions(Recipe recipe)
        {
            var rawValue = GetOptionalPropertyValue(recipe, "Instructions");
            if (rawValue is null)
            {
                return null;
            }

            if (rawValue is string instructionText)
            {
                var lines = instructionText
                    .Split(new[] { "\r\n", "\n", "\r" }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(line => line.Trim())
                    .Where(line => !string.IsNullOrWhiteSpace(line))
                    .ToList();

                return lines.Count > 0 ? lines : null;
            }

            if (rawValue is IEnumerable<string> stringSteps)
            {
                var steps = stringSteps
                    .Select(step => step?.Trim())
                    .Where(step => !string.IsNullOrWhiteSpace(step))
                    .Select(step => step!)
                    .ToList();

                return steps.Count > 0 ? steps : null;
            }

            if (rawValue is System.Collections.IEnumerable enumerable)
            {
                var steps = new List<string>();
                foreach (var item in enumerable)
                {
                    var step = item?.ToString()?.Trim();
                    if (!string.IsNullOrWhiteSpace(step))
                    {
                        steps.Add(step);
                    }
                }

                return steps.Count > 0 ? steps : null;
            }

            return null;
        }

        private static string? TryGetRecipeVideoUrl(Recipe recipe)
        {
            var rawValue = GetOptionalPropertyValue(recipe, "VideoUrl");
            return rawValue as string;
        }

        private static object? GetOptionalPropertyValue(object source, string propertyName)
        {
            var property = source.GetType().GetProperty(
                propertyName,
                BindingFlags.Instance | BindingFlags.Public | BindingFlags.IgnoreCase);

            return property?.GetValue(source);
        }

        private sealed record IngredientQuery(
            HashSet<string> NameKeys,
            HashSet<int> FoodItemIds,
            Dictionary<int, decimal> ConfidenceByFoodItemId,
            Dictionary<string, decimal> ConfidenceByNameKey);

        private sealed record IngredientMatch(int FoodItemId, bool IsExactFoodItemId, decimal Confidence);

        private sealed record RecipeScore(decimal Total, List<string> Reasons);
    }
}
