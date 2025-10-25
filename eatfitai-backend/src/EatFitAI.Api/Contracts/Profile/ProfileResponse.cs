using System;

namespace EatFitAI.Api.Contracts.Profile;

public sealed class ProfileResponse
{
    public Guid MaNguoiDung { get; init; }
    public string? HoTen { get; init; }
    public string? GioiTinh { get; init; }
    public DateOnly? NgaySinh { get; init; }
    public decimal? ChieuCaoCm { get; init; }
    public decimal? CanNangMucTieuKg { get; init; }
    public string? MucDoVanDong { get; init; }
    public string? MucTieu { get; init; }
    public string? AnhDaiDienUrl { get; init; }
}

