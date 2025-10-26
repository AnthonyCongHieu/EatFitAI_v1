using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.NutritionTargets;

public sealed class UpsertNutritionTargetRequest
{
    public DateTime? NgayHieuLuc { get; set; }
    public DateTime? EffectiveDate { get; set; }

    [Range(0, 100000)]
    public int CaloKcal { get; set; }
    public int CaloriesKcal { get; set; }

    [Range(0, 10000)]
    public decimal ProteinG { get; set; }
    public decimal ProteinGrams { get; set; }

    [Range(0, 10000)]
    public decimal CarbG { get; set; }
    public decimal CarbohydrateGrams { get; set; }

    [Range(0, 10000)]
    public decimal FatG { get; set; }
    public decimal FatGrams { get; set; }
}

