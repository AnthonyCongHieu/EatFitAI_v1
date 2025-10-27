using System;

namespace EatFitAI.Api.Contracts.NutritionTargets;

public sealed class NutritionTargetResponse
{
    public long MaMucTieuDD { get; init; }
    public DateOnly HieuLucTuNgay { get; init; }
    public int CaloKcal { get; init; }
    public decimal ProteinG { get; init; }
    public decimal CarbG { get; init; }
    public decimal FatG { get; init; }
    public string Nguon { get; init; } = string.Empty;
    public string? LyDo { get; init; }
    public DateTime NgayTao { get; init; }
}

