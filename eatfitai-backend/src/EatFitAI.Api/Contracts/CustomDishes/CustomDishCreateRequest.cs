using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.CustomDishes;

public sealed class CustomDishCreateRequest
{
    [Required]
    [MaxLength(200)]
    public string Ten { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    public string? MoTa { get; set; }

    public string? Description { get; set; }

    [MinLength(1)]
    public List<CustomDishIngredientInput> NguyenLieu { get; set; } = new();

    [MinLength(1)]
    public List<CustomDishIngredientInput> Ingredients { get; set; } = new();
}

public sealed class CustomDishIngredientInput
{
    public long? FoodId { get; set; }
    [Required]
    [MaxLength(200)]
    public string Ten { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    [Range(0.01, 100000)]
    public decimal SoLuongGram { get; set; }
    public decimal QuantityGrams { get; set; }
    [Range(0, 1000000)]
    public decimal CaloKcal { get; set; }
    public decimal CaloriesKcal { get; set; }
    [Range(0, 100000)]
    public decimal ProteinGram { get; set; }
    public decimal ProteinGrams { get; set; }
    [Range(0, 100000)]
    public decimal CarbGram { get; set; }
    public decimal CarbohydrateGrams { get; set; }
    [Range(0, 100000)]
    public decimal FatGram { get; set; }
    public decimal FatGrams { get; set; }
}

