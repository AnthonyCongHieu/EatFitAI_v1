namespace EatFitAI.Application.AI;

public record AiVisionIngredientsRequest(string Image, int MaxItems = 5);
public record AiVisionIngredient(Guid ThucPhamId, string Ten, decimal Confidence);

public interface IVisionService
{
    Task<IReadOnlyList<AiVisionIngredient>> RecognizeIngredientsAsync(AiVisionIngredientsRequest request, CancellationToken ct = default);
}

