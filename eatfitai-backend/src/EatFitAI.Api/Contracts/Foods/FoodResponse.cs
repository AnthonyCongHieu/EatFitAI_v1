using System;

namespace EatFitAI.Api.Contracts.Foods;

public sealed class FoodResponse
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Brand { get; init; }
    public string? Category { get; init; }
    public decimal ServingSizeGrams { get; init; }
    public decimal CaloriesKcal { get; init; }
    public decimal ProteinGrams { get; init; }
    public decimal CarbohydrateGrams { get; init; }
    public decimal FatGrams { get; init; }
    public bool IsCustom { get; init; }
}

