using System;

namespace EatFitAI.Api.Contracts.BodyMetrics;

public sealed class BodyMetricResponse
{
    public long Id { get; init; }
    public DateTime ThoiGianGhiNhan { get; init; }
    public DateTime RecordedAt { get; init; }
    public decimal CanNangKg { get; init; }
    public decimal WeightKg { get; init; }
    public decimal? PhanTramMoCoThe { get; init; }
    public decimal? BodyFatPercent { get; init; }
    public decimal? KhoiLuongCoKg { get; init; }
    public decimal? MuscleMassKg { get; init; }
    public decimal? VongEoCm { get; init; }
    public decimal? VongMongCm { get; init; }
    public decimal? WaistCm { get; init; }
    public decimal? HipCm { get; init; }
}

