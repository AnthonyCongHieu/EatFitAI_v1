using System;
using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.Diary;

public sealed class DiaryCreateRequest
{
    [Required]
    public DateOnly NgayAn { get; set; }
    [Required]
    [MaxLength(32)]
    public string MaBuaAn { get; set; } = string.Empty;
    public long? MaThucPham { get; set; }
    public long? MaMonNguoiDung { get; set; }
    public long? MaCongThuc { get; set; }
    [Range(0.01, 100000)]
    public decimal KhoiLuongGram { get; set; }
    public string? GhiChu { get; set; }
}

public sealed class DiaryUpdateRequest
{
    [Range(0.01, 100000)]
    public decimal? KhoiLuongGram { get; set; }
    public string? GhiChu { get; set; }
}

public sealed class DiaryEntryResponse
{
    public long MaNhatKy { get; init; }
    public DateOnly NgayAn { get; init; }
    public string MaBuaAn { get; init; } = string.Empty;
    public long? MaThucPham { get; init; }
    public long? MaMonNguoiDung { get; init; }
    public long? MaCongThuc { get; init; }
    public decimal KhoiLuongGram { get; init; }
    public decimal Calo { get; init; }
    public decimal Protein { get; init; }
    public decimal Carb { get; init; }
    public decimal Fat { get; init; }
    public DateTime NgayTao { get; init; }
    public string? GhiChu { get; init; }
}

