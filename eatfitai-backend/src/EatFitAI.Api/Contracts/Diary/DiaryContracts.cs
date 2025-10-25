using System;
using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.Diary;

public sealed class DiaryCreateRequest
{
    [Required]
    public DateOnly MealDate { get; set; }
    [Required]
    [MaxLength(32)]
    public string MealCode { get; set; } = string.Empty;
    [Required]
    [MaxLength(32)]
    public string Source { get; set; } = string.Empty; // food or customDish
    [Required]
    public long ItemId { get; set; }
    [Range(0.01, 100000)]
    public decimal QuantityGrams { get; set; }
    public string? Notes { get; set; }
}

public sealed class DiaryUpdateRequest
{
    [Range(0.01, 100000)]
    public decimal? QuantityGrams { get; set; }
    public string? Notes { get; set; }
}

public sealed class DiaryEntryResponse
{
    public long Id { get; init; }
    public DateOnly MealDate { get; init; }
    public string MealCode { get; init; } = string.Empty;
    public long? FoodId { get; init; }
    public long? CustomDishId { get; init; }
    public long? AiRecipeId { get; init; }
    public long ItemId { get; init; }
    public string Source { get; init; } = string.Empty;
    public decimal QuantityGrams { get; init; }
    public decimal CaloriesKcal { get; init; }
    public decimal ProteinGrams { get; init; }
    public decimal CarbohydrateGrams { get; init; }
    public decimal FatGrams { get; init; }
    public string? Notes { get; init; }
}

