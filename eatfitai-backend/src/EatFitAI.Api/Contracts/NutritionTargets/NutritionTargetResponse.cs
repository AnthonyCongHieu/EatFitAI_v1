using System;

namespace EatFitAI.Api.Contracts.NutritionTargets;

public sealed class NutritionTargetResponse
{
    public Guid Id { get; init; }
    public DateOnly EffectiveDate { get; init; }
    public decimal CaloriesKcal { get; init; }
    public decimal ProteinGrams { get; init; }
    public decimal CarbohydrateGrams { get; init; }
    public decimal FatGrams { get; init; }
    public bool IsActive { get; init; }
}

