using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.Common;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public interface IMealBudgetService
{
    Task<List<MealBudgetDto>> GetMealBudgetsAsync(
        Guid userId,
        DateOnly localDate,
        CancellationToken cancellationToken = default);
}

public sealed class MealBudgetService : IMealBudgetService
{
    private static readonly MealBudgetSplit[] DefaultSplits =
    [
        new(1, "breakfast", "Bữa sáng", 0.25m),
        new(2, "lunch", "Bữa trưa", 0.35m),
        new(3, "dinner", "Bữa tối", 0.30m),
        new(4, "snack", "Ăn vặt", 0.10m)
    ];

    private readonly EatFitAIDbContext _context;

    public MealBudgetService(EatFitAIDbContext context)
    {
        _context = context;
    }

    public async Task<List<MealBudgetDto>> GetMealBudgetsAsync(
        Guid userId,
        DateOnly localDate,
        CancellationToken cancellationToken = default)
    {
        var target = await GetActiveTargetAsync(userId, localDate, cancellationToken);

        return DefaultSplits
            .Select(split =>
            {
                var calories = (int)Math.Round(target.Calories * split.Ratio, MidpointRounding.AwayFromZero);
                return new MealBudgetDto
                {
                    MealTypeId = split.MealTypeId,
                    MealKey = split.MealKey,
                    Label = split.Label,
                    TargetCalories = calories,
                    MinCalories = (int)Math.Round(calories * 0.90m, MidpointRounding.AwayFromZero),
                    MaxCalories = (int)Math.Round(calories * 1.10m, MidpointRounding.AwayFromZero),
                    TargetProtein = (int)Math.Round(target.Protein * split.Ratio, MidpointRounding.AwayFromZero),
                    TargetCarbs = (int)Math.Round(target.Carbs * split.Ratio, MidpointRounding.AwayFromZero),
                    TargetFat = (int)Math.Round(target.Fat * split.Ratio, MidpointRounding.AwayFromZero)
                };
            })
            .ToList();
    }

    private async Task<NutritionTargetSnapshot> GetActiveTargetAsync(
        Guid userId,
        DateOnly localDate,
        CancellationToken cancellationToken)
    {
        var target = await _context.NutritionTargets
            .AsNoTracking()
            .Where(item => item.UserId == userId
                && item.EffectiveFrom <= localDate
                && (item.EffectiveTo == null || item.EffectiveTo >= localDate))
            .OrderByDescending(item => item.EffectiveFrom)
            .ThenByDescending(item => item.NutritionTargetId)
            .Select(item => new NutritionTargetSnapshot(
                item.TargetCalories,
                item.TargetProtein,
                item.TargetCarb,
                item.TargetFat))
            .FirstOrDefaultAsync(cancellationToken);

        return target ?? new NutritionTargetSnapshot(2000, 120, 220, 60);
    }

    private sealed record MealBudgetSplit(int MealTypeId, string MealKey, string Label, decimal Ratio);
    private sealed record NutritionTargetSnapshot(int Calories, int Protein, int Carbs, int Fat);
}
