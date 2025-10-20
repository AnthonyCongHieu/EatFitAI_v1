using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.NutritionTargets;

public sealed class UpsertNutritionTargetRequest
{
    public DateOnly? EffectiveDate { get; set; }

    [Range(0, 100000)]
    public decimal CaloriesKcal { get; set; }

    [Range(0, 10000)]
    public decimal ProteinGrams { get; set; }

    [Range(0, 10000)]
    public decimal CarbohydrateGrams { get; set; }

    [Range(0, 10000)]
    public decimal FatGrams { get; set; }
}

