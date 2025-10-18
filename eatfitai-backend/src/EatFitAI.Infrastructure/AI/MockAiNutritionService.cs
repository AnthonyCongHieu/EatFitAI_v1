using EatFitAI.Application.AI;
using EatFitAI.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.Infrastructure.AI;

public class MockAiNutritionService : IAiNutritionService
{
    private readonly EatFitAIDbContext _db;
    public MockAiNutritionService(EatFitAIDbContext db) => _db = db;

    public async Task<AiNutritionRecalculateResponse> RecalculateAsync(AiNutritionRecalculateRequest request, CancellationToken ct = default)
    {
        // Deterministic: Use Activity map from DB if exists, else defaults
        var act = (request.Activity ?? "").ToUpperInvariant();
        var mdvd = await _db.MucDoVanDongs.AsNoTracking().FirstOrDefaultAsync(x => x.Ma == act, ct);
        var heSo = mdvd?.HeSoTdee ?? act switch
        {
            "SEDENTARY" => 1.20m,
            "LIGHT" => 1.375m,
            "MODERATE" => 1.55m,
            "ACTIVE" => 1.725m,
            "VERY_ACTIVE" => 1.9m,
            _ => 1.55m
        };
        var goal = (request.Goal ?? "").ToUpperInvariant();
        var adj = goal switch
        {
            "GIAM_CAN" => 0.85m,
            "TANG_CAN" => 1.15m,
            _ => 1.0m
        };
        var bmr = CalcBmr(request.WeightKg, request.HeightCm, request.Age, request.Sex);
        var tdee = bmr * heSo;
        var kcal = tdee * adj;
        var proteinG = Round2(request.WeightKg * 1.8m);
        var fatG = Round2((kcal * 0.25m) / 9m);
        var carbG = Round2((kcal - (proteinG * 4m) - (fatG * 9m)) / 4m);
        return new AiNutritionRecalculateResponse(Round2(bmr), Round2(tdee), Round2(kcal), proteinG, carbG, fatG, mdvd?.Ma ?? act, heSo, string.IsNullOrWhiteSpace(goal) ? "" : goal);
    }

    private static decimal CalcBmr(decimal weightKg, decimal heightCm, int ageYears, string? sex)
    {
        var s = (sex?.Equals("Nam", StringComparison.OrdinalIgnoreCase) == true || sex?.Equals("male", StringComparison.OrdinalIgnoreCase) == true || sex?.Equals("m", StringComparison.OrdinalIgnoreCase) == true) ? 5m : -161m;
        var bmr = (10m * weightKg) + (6.25m * heightCm) - (5m * ageYears) + s;
        return bmr;
    }

    private static decimal Round2(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
}

