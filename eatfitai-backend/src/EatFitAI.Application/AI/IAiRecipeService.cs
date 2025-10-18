namespace EatFitAI.Application.AI;

public record AiRecipeSuggestRequest(string? Query, int Count = 3);

public record AiRecipeIngredient(Guid ThucPhamId, string Ten, decimal Grams, decimal Kcal, decimal ProteinG, decimal CarbG, decimal FatG);
public record AiRecipeDto(Guid Id, string Ten, string Summary, decimal Kcal, decimal ProteinG, decimal CarbG, decimal FatG, IReadOnlyList<AiRecipeIngredient> Ingredients);

public interface IAiRecipeService
{
    Task<IReadOnlyList<AiRecipeDto>> SuggestAsync(AiRecipeSuggestRequest request, CancellationToken ct = default);
}

