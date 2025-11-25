using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EatFitAI.API.Services
{
    /// <summary>
    /// Database-only recipe suggestion service
    /// Finds recipes that match available ingredients
    /// </summary>
    public class RecipeSuggestionService : IRecipeSuggestionService
    {
        private readonly EatFitAIDbContext _db;
        private readonly ILogger<RecipeSuggestionService> _logger;

        public RecipeSuggestionService(
            EatFitAIDbContext db,
            ILogger<RecipeSuggestionService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<List<RecipeSuggestionDto>> SuggestRecipesAsync(
            RecipeSuggestionRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request.AvailableIngredients == null || request.AvailableIngredients.Count == 0)
            {
                return new List<RecipeSuggestionDto>();
            }

            // Normalize ingredient names to lowercase for matching
            var normalizedIngredients = request.AvailableIngredients
                .Select(i => i.Trim().ToLowerInvariant())
                .Where(i => !string.IsNullOrWhiteSpace(i))
                .ToList();

            if (normalizedIngredients.Count == 0)
            {
                return new List<RecipeSuggestionDto>();
            }

            _logger.LogInformation("Searching recipes for {Count} ingredients: {Ingredients}",
                normalizedIngredients.Count,
                string.Join(", ", normalizedIngredients));

            // Query recipes with their ingredients
            var recipesWithIngredients = await _db.Recipes
                .Where(r => !r.IsDeleted)
                .Include(r => r.RecipeIngredients)
                .ThenInclude(ri => ri.FoodItem)
                .ToListAsync(cancellationToken);

            // Calculate match for each recipe
            var recipeSuggestions = new List<RecipeSuggestionDto>();

            foreach (var recipe in recipesWithIngredients)
            {
                var recipeIngredientNames = recipe.RecipeIngredients
                    .Where(ri => ri.FoodItem != null && !ri.FoodItem.IsDeleted)
                    .Select(ri => ri.FoodItem.FoodName.Trim().ToLowerInvariant())
                    .ToList();

                if (recipeIngredientNames.Count == 0)
                {
                    continue; // Skip recipes with no valid ingredients
                }

                // Find matches
                var matchedIngredients = recipeIngredientNames
                    .Where(recipeName => normalizedIngredients.Any(available =>
                        recipeName.Contains(available) || available.Contains(recipeName)))
                    .ToList();

                var matchCount = matchedIngredients.Count;

                // Apply minimum match filter
                if (matchCount < (request.MinMatchedIngredients ?? 1))
                {
                    continue;
                }

                // Calculate nutrition totals
                var (calories, protein, carbs, fat) = CalculateRecipeNutrition(recipe.RecipeIngredients.ToList());

                // Find missing ingredients
                var missingIngredients = recipeIngredientNames
                    .Except(matchedIngredients)
                    .Select(name => recipe.RecipeIngredients
                        .FirstOrDefault(ri => ri.FoodItem.FoodName.Trim().ToLowerInvariant() == name)?.FoodItem.FoodName)
                    .Where(name => !string.IsNullOrEmpty(name))
                    .Select(name => name!)
                    .ToList();

                var suggestion = new RecipeSuggestionDto
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
                            .FirstOrDefault(ri => ri.FoodItem.FoodName.Trim().ToLowerInvariant() == name)?.FoodItem.FoodName)
                        .Where(name => !string.IsNullOrEmpty(name))
                        .Select(name => name!)
                        .ToList(),
                    MissingIngredients = missingIngredients,
                    AllIngredients = recipe.RecipeIngredients
                        .Where(ri => ri.FoodItem != null)
                        .Select(ri => ri.FoodItem.FoodName)
                        .ToList()
                };

                recipeSuggestions.Add(suggestion);
            }

            // Sort by match percentage (descending), then by total ingredients (ascending)
            var sortedSuggestions = recipeSuggestions
                .OrderByDescending(r => r.MatchPercentage)
                .ThenBy(r => r.TotalIngredientsCount)
                .Take(request.MaxResults)
                .ToList();

            _logger.LogInformation("Found {Count} recipe suggestions", sortedSuggestions.Count);

            return sortedSuggestions;
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

            if (recipe == null)
            {
                return null;
            }

            var (totalCalories, totalProtein, totalCarbs, totalFat) = 
                CalculateRecipeNutrition(recipe.RecipeIngredients.ToList());

            var ingredientDetails = recipe.RecipeIngredients
                .Where(ri => ri.FoodItem != null && !ri.FoodItem.IsDeleted)
                .Select(ri =>
                {
                    var factor = ri.Grams / 100m; // Nutrition is per 100g
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

        /// <summary>
        /// Calculate total nutrition for a recipe based on its ingredients
        /// </summary>
        private (decimal calories, decimal protein, decimal carbs, decimal fat) CalculateRecipeNutrition(
            List<EatFitAI.API.DbScaffold.Models.RecipeIngredient> ingredients)
        {
            decimal totalCalories = 0m;
            decimal totalProtein = 0m;
            decimal totalCarbs = 0m;
            decimal totalFat = 0m;

            foreach (var ingredient in ingredients.Where(i => i.FoodItem != null && !i.FoodItem.IsDeleted))
            {
                var factor = ingredient.Grams / 100m; // Nutrition values are per 100g

                totalCalories += ingredient.FoodItem.CaloriesPer100g * factor;
                totalProtein += ingredient.FoodItem.ProteinPer100g * factor;
                totalCarbs += ingredient.FoodItem.CarbPer100g * factor;
                totalFat += ingredient.FoodItem.FatPer100g * factor;
            }

            return (totalCalories, totalProtein, totalCarbs, totalFat);
        }
    }
}
