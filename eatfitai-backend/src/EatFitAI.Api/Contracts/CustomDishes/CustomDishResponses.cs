using System;
using System.Collections.Generic;

namespace EatFitAI.Api.Contracts.CustomDishes;

public class CustomDishResponse
{
    public long Id { get; init; }
    public string Ten { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? MoTa { get; init; }
    public string? Description { get; init; }
    public decimal KhoiLuongPhucVuGram { get; init; }
    public decimal PortionSizeGrams { get; init; }
    public decimal CaloKcal { get; init; }
    public decimal CaloriesKcal { get; init; }
    public decimal ProteinGram { get; init; }
    public decimal ProteinGrams { get; init; }
    public decimal CarbGram { get; init; }
    public decimal CarbohydrateGrams { get; init; }
    public decimal FatGram { get; init; }
    public decimal FatGrams { get; init; }
}

public sealed class CustomDishDetailResponse : CustomDishResponse
{
    public List<CustomDishIngredientResponse> NguyenLieu { get; init; } = new();
    public List<CustomDishIngredientResponse> Ingredients { get; init; } = new();
}

public sealed class CustomDishIngredientResponse
{
    public long Id { get; init; }
    public long? FoodId { get; init; }
    public string Ten { get; init; } = string.Empty;
    public decimal SoLuongGram { get; init; }
    public decimal CaloKcal { get; init; }
    public decimal ProteinGram { get; init; }
    public decimal CarbGram { get; init; }
    public decimal FatGram { get; init; }
}
