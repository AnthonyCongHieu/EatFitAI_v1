using System;

namespace EatFitAI.Api.Contracts.NutritionTargets;

public sealed class NutritionTargetResponse
{
    public long Id { get; init; }
    public DateTime NgayHieuLuc { get; init; }
    public DateTime EffectiveDate { get; init; }
    public int CaloKcal { get; init; }
    public int CaloriesKcal { get; init; }
    public decimal ProteinG { get; init; }
    public decimal ProteinGrams { get; init; }
    public decimal CarbG { get; init; }
    public decimal CarbohydrateGrams { get; init; }
    public decimal FatG { get; init; }
    public decimal FatGrams { get; init; }
    public string Nguon { get; init; } = string.Empty;
    public string Source { get; init; } = string.Empty;
}

