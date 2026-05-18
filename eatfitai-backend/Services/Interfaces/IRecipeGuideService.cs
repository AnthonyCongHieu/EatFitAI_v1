using EatFitAI.API.DTOs.AI;

namespace EatFitAI.API.Services.Interfaces;

public interface IRecipeGuideService
{
    Task<RecipeCookingGuideDto?> GetCookingGuideAsync(
        int recipeId,
        CancellationToken cancellationToken = default);
}
