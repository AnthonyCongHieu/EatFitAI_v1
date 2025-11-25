using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EatFitAI.API.DTOs.AI;

namespace EatFitAI.API.Services.Interfaces
{
    /// <summary>
    /// Service for suggesting recipes based on available ingredients
    /// </summary>
    public interface IRecipeSuggestionService
    {
        /// <summary>
        /// Get recipe suggestions based on available ingredients (database-only)
        /// </summary>
        Task<List<RecipeSuggestionDto>> SuggestRecipesAsync(
            RecipeSuggestionRequest request,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Get detailed information about a specific recipe
        /// </summary>
        Task<RecipeDetailDto?> GetRecipeDetailAsync(
            int recipeId,
            CancellationToken cancellationToken = default);
    }
}
