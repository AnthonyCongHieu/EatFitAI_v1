using System;
using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.BodyMetrics;

public sealed class AddBodyMetricRequest
{
    public DateTime? RecordedAt { get; set; }

    [Range(1, 1000)]
    public decimal WeightKg { get; set; }

    [Range(0, 100)]
    public decimal? BodyFatPercent { get; set; }

    [Range(0, 1000)]
    public decimal? MuscleMassKg { get; set; }

    [Range(0, 1000)]
    public decimal? WaistCm { get; set; }

    [Range(0, 1000)]
    public decimal? HipCm { get; set; }
}

