using System;

namespace EatFitAI.Api.Contracts.BodyMetrics;

public sealed class BodyMetricResponse
{
    public long MaChiSo { get; init; }
    public DateTime NgayCapNhat { get; init; }
    public decimal CanNangKg { get; init; }
    public decimal? PhanTramMoCoThe { get; init; }
    public decimal? KhoiLuongCoKg { get; init; }
    public decimal? VongEoCm { get; init; }
    public decimal? VongMongCm { get; init; }
}

