using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Profile;

public record ProfileDto(string Email, string? HoTen, string? GioiTinh, DateOnly? NgaySinh);
public record UpdateProfileRequest(string? HoTen, string? GioiTinh, DateOnly? NgaySinh);

public record BodyMetricsRequest(
    DateOnly? NgayDo,
    decimal? CanNangKg,
    decimal? ChieuCaoCm,
    decimal? VongEoCm,
    decimal? VongHongCm,
    string? MucDoVanDongMa,
    string? MucTieuMa
);

public record BodyMetricsResponse(Guid Id, DateOnly NgayDo, decimal? CanNangKg, decimal? ChieuCaoCm,
    decimal? VongEoCm, decimal? VongHongCm,
    NutritionSuggestion Suggestion);

public record NutritionSuggestion(
    decimal Bmr,
    decimal Tdee,
    decimal NangLuongKcal,
    decimal ProteinG,
    decimal CarbG,
    decimal FatG,
    string? UsedMucDoVanDongMa,
    decimal? UsedHeSoTdee,
    string? UsedMucTieuMa
);

public record NutritionTargetDto(Guid Id, DateOnly HieuLucTuNgay, string Nguon, string? LyDo, decimal NangLuongKcal, decimal ProteinG, decimal CarbG, decimal FatG, int? MucTieuId);
public record CreateNutritionTargetRequest(DateOnly HieuLucTuNgay, string Nguon, string? LyDo, decimal NangLuongKcal, decimal ProteinG, decimal CarbG, decimal FatG, string? MucTieuMa);

