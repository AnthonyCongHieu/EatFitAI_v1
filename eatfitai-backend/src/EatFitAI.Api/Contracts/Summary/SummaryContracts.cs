using System;
using System.Collections.Generic;

namespace EatFitAI.Api.Contracts.Summary;

public sealed class DaySummaryResponse
{
    public DateOnly MealDate { get; init; }
    public decimal TotalQuantityGrams { get; init; }
    public decimal TotalCaloriesKcal { get; init; }
    public decimal TotalProteinGrams { get; init; }
    public decimal TotalCarbohydrateGrams { get; init; }
    public decimal TotalFatGrams { get; init; }
}

public sealed class WeekSummaryItem
{
    public DateOnly MealDate { get; init; }
    public decimal TotalQuantityGrams { get; init; }
    public decimal TotalCaloriesKcal { get; init; }
    public decimal TotalProteinGrams { get; init; }
    public decimal TotalCarbohydrateGrams { get; init; }
    public decimal TotalFatGrams { get; init; }
}

public sealed class WeekSummaryResponse
{
    public List<WeekSummaryItem> Days { get; init; } = new();
}

