namespace EatFitAI.Application.AI;

public record AiNutritionRecalculateRequest(
    decimal WeightKg,
    decimal HeightCm,
    int Age,
    string Sex,
    string Activity,
    string Goal
);

public record AiNutritionRecalculateResponse(
    decimal Bmr,
    decimal Tdee,
    decimal NangLuongKcal,
    decimal ProteinG,
    decimal CarbG,
    decimal FatG,
    string ActivityUsed,
    decimal HeSoTdee,
    string GoalUsed
);

public interface IAiNutritionService
{
    Task<AiNutritionRecalculateResponse> RecalculateAsync(AiNutritionRecalculateRequest request, CancellationToken ct = default);
}

