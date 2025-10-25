using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.Profile;

public sealed class ProfileUpdateRequest
{
    [MaxLength(200)]
    public string? HoTen { get; set; }

    [MaxLength(50)]
    public string? GioiTinh { get; set; }

    public DateOnly? NgaySinh { get; set; }

    public decimal? ChieuCaoCm { get; set; }

    public decimal? CanNangMucTieuKg { get; set; }

    [MaxLength(50)]
    public string? MucDoVanDong { get; set; }

    [MaxLength(100)]
    public string? MucTieu { get; set; }

    [Url]
    public string? AnhDaiDienUrl { get; set; }
}

