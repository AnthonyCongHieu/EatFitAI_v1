using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.CustomDishes;

public sealed class CustomDishCreateRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    [MinLength(1)]
    public List<CustomDishIngredientInput> Ingredients { get; set; } = new();
}

public sealed class CustomDishIngredientInput
{
    public long? FoodId { get; set; }
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    [Range(0.01, 100000)]
    public decimal QuantityGrams { get; set; }
    [Range(0, 1000000)]
    public decimal CaloriesKcal { get; set; }
    [Range(0, 100000)]
    public decimal ProteinGrams { get; set; }
    [Range(0, 100000)]
    public decimal CarbohydrateGrams { get; set; }
    [Range(0, 100000)]
    public decimal FatGrams { get; set; }
}

