using System;
using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.Diary;

public sealed class DiaryCreateRequest
{
    [Required]
    public DateOnly NgayAn { get; set; }
    public DateOnly MealDate { get; set; }
    [Required]
    [MaxLength(32)]
    public string MaBuaAn { get; set; } = string.Empty;
    public string MealCode { get; set; } = string.Empty;
    [Required]
    [MaxLength(32)]
    public string Nguon { get; set; } = string.Empty; // food or customDish
    public string Source { get; set; } = string.Empty;
    [Required]
    public long MaMonAn { get; set; }
    public long ItemId { get; set; }
    [Range(0.01, 100000)]
    public decimal SoLuongGram { get; set; }
    public decimal QuantityGrams { get; set; }
    public string? GhiChu { get; set; }
    public string? Notes { get; set; }
}

public sealed class DiaryUpdateRequest
{
    [Range(0.01, 100000)]
    public decimal? SoLuongGram { get; set; }
    public decimal? QuantityGrams { get; set; }
    public string? GhiChu { get; set; }
    public string? Notes { get; set; }
}

public sealed class DiaryEntryResponse
{
    public long Id { get; init; }
    public DateOnly NgayAn { get; init; }
    public DateOnly MealDate { get; init; }
    public string MaBuaAn { get; init; } = string.Empty;
    public string MealCode { get; init; } = string.Empty;
    public long? MaThucPham { get; init; }
    public long? FoodId { get; init; }
    public long? MaMonTuChinh { get; init; }
    public long? CustomDishId { get; init; }
    public long? MaCongThucAI { get; init; }
    public long? AiRecipeId { get; init; }
    public long MaMonAn { get; init; }
    public long ItemId { get; init; }
    public string Nguon { get; init; } = string.Empty;
    public string Source { get; init; } = string.Empty;
    public decimal SoLuongGram { get; init; }
    public decimal QuantityGrams { get; init; }
    public decimal CaloKcal { get; init; }
    public decimal CaloriesKcal { get; init; }
    public decimal ProteinGram { get; init; }
    public decimal ProteinGrams { get; init; }
    public decimal CarbGram { get; init; }
    public decimal CarbohydrateGrams { get; init; }
    public decimal FatGram { get; init; }
    public decimal FatGrams { get; init; }
    public string? GhiChu { get; init; }
    public string? Notes { get; init; }
}

