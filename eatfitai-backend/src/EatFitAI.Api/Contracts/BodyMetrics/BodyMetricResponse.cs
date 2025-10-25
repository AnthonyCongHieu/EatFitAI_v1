using System;

namespace EatFitAI.Api.Contracts.BodyMetrics;

public sealed class BodyMetricResponse
{
    public long Id { get; init; }
    public DateTime RecordedAt { get; init; }
    public decimal WeightKg { get; init; }
    public decimal? BodyFatPercent { get; init; }
    public decimal? MuscleMassKg { get; init; }
    public decimal? WaistCm { get; init; }
    public decimal? HipCm { get; init; }
}

