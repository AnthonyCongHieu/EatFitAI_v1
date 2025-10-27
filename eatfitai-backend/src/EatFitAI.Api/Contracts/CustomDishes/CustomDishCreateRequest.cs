using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.CustomDishes;

public sealed class CustomDishCreateRequest
{
    [Required]
    [MaxLength(200)]
    public string TenMon { get; set; } = string.Empty;

    public string? GhiChu { get; set; }

    [MinLength(1)]
    public List<CustomDishIngredientInput> NguyenLieu { get; set; } = new();
}

public sealed class CustomDishIngredientInput
{
    public long? MaThucPham { get; set; }
    [Required]
    [MaxLength(200)]
    public string Ten { get; set; } = string.Empty;
    [Range(0.01, 100000)]
    public decimal KhoiLuongGram { get; set; }
    [Range(0, 1000000)]
    public decimal Calo { get; set; }
    [Range(0, 100000)]
    public decimal Protein { get; set; }
    [Range(0, 100000)]
    public decimal Carb { get; set; }
    [Range(0, 100000)]
    public decimal Fat { get; set; }
}

