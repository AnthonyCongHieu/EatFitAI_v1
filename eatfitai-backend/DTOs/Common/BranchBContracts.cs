namespace EatFitAI.API.DTOs.Common;

public sealed class NutrientCompletenessDto
{
    public decimal Score { get; set; } = 100;
    public List<string> MissingNutrients { get; set; } = new();
    public bool HasMissingRequiredNutrients { get; set; }
}

public sealed class FoodTrustSummaryDto
{
    public string Status { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public decimal Score { get; set; }
    public bool NeedsReview { get; set; }
    public List<string> MissingNutrients { get; set; } = new();
}

public sealed class FoodTrustDetailsDto
{
    public FoodTrustSummaryDto Summary { get; set; } = new();
    public NutrientCompletenessDto NutrientCompleteness { get; set; } = new();
    public string? Source { get; set; }
    public string? VerifiedBy { get; set; }
    public DateTime? LastReviewedAt { get; set; }
    public string Explanation { get; set; } = string.Empty;
}

public sealed class DayCompletenessDto
{
    public DateOnly Date { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsComplete { get; set; }
    public decimal Score { get; set; }
    public int MealCount { get; set; }
    public int MainMealCount { get; set; }
    public bool SnackOnly { get; set; }
    public decimal TotalCalories { get; set; }
    public int RequiredMainMeals { get; set; }
    public decimal MinimumCalories { get; set; }
    public List<string> MissingMealTypes { get; set; } = new();
}
