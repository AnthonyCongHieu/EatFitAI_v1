using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.NutritionTargets;

public sealed class UpsertNutritionTargetRequest
{
    public DateTime? HieuLucTuNgay { get; set; }

    [Range(0, 100000)]
    public int CaloKcal { get; set; }

    [Range(0, 10000)]
    public decimal ProteinG { get; set; }

    [Range(0, 10000)]
    public decimal CarbG { get; set; }

    [Range(0, 10000)]
    public decimal FatG { get; set; }

    public string? LyDo { get; set; }
}

