using System;

namespace EatFitAI.Api.Contracts.Foods;

public sealed class FoodResponse
{
    public long Id { get; init; }
    public string Ten { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? MoTa { get; init; }
    public string? Description { get; init; }
    public string? ThuongHieu { get; init; }
    public string? Brand { get; init; }
    public string? DanhMuc { get; init; }
    public string? Category { get; init; }
    public decimal KhoiLuongPhucVuGram { get; init; }
    public decimal ServingSizeGrams { get; init; }
    public decimal CaloKcal { get; init; }
    public decimal CaloriesKcal { get; init; }
    public decimal ProteinGram { get; init; }
    public decimal ProteinGrams { get; init; }
    public decimal CarbGram { get; init; }
    public decimal CarbohydrateGrams { get; init; }
    public decimal FatGram { get; init; }
    public decimal FatGrams { get; init; }
    public bool LaMonTuChinh { get; init; }
    public bool IsCustom { get; init; }
}

public sealed class PaginatedFoodResponse
{
    public IEnumerable<FoodResponse> Items { get; init; } = Array.Empty<FoodResponse>();
    public int TotalCount { get; init; }
    public int Offset { get; init; }
    public int Limit { get; init; }
}

