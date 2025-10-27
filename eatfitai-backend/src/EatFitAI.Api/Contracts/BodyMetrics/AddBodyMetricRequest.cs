using System;
using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.BodyMetrics;

public sealed class AddBodyMetricRequest
{
    public DateTime? ThoiGianGhiNhan { get; set; }

    [Range(1, 1000)]
    public decimal CanNangKg { get; set; }

    [Range(0, 100)]
    public decimal? PhanTramMoCoThe { get; set; }

    [Range(0, 1000)]
    public decimal? KhoiLuongCoKg { get; set; }

    [Range(0, 1000)]
    public decimal? VongEoCm { get; set; }

    [Range(0, 1000)]
    public decimal? VongMongCm { get; set; }
}

