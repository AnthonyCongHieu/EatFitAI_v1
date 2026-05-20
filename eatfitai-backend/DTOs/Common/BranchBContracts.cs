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
    public decimal ConfidenceScore { get; set; } = 100;
    public string NutritionStatus { get; set; } = "unknown";
    public DailyLoopActionDto? NextAction { get; set; }
    public int RequiredMainMeals { get; set; }
    public decimal MinimumCalories { get; set; }
    public List<string> MissingMealTypes { get; set; } = new();
    public List<DayMealStateDto> MealStates { get; set; } = new();
}

public sealed class DayMealStateDto
{
    public string MealKey { get; set; } = string.Empty;
    public int? MealTypeId { get; set; }
    public string Status { get; set; } = "missing";
    public decimal Calories { get; set; }
    public bool IsSkipped { get; set; }
    public bool IsRough { get; set; }
    public decimal? ConfidenceScore { get; set; }
}

public sealed class DailyLoopActionDto
{
    public string Action { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string DeepLink { get; set; } = "/diary/add";
}

public sealed class MealBudgetDto
{
    public int MealTypeId { get; set; }
    public string MealKey { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int TargetCalories { get; set; }
    public int MinCalories { get; set; }
    public int MaxCalories { get; set; }
    public int TargetProtein { get; set; }
    public int TargetCarbs { get; set; }
    public int TargetFat { get; set; }
}

public sealed class RemainingNutritionDto
{
    public int Calories { get; set; }
    public int Protein { get; set; }
    public int Carbs { get; set; }
    public int Fat { get; set; }
}

public sealed class NutritionStatusDto
{
    public string Status { get; set; } = "unknown";
    public int DeltaCalories { get; set; }
    public string Message { get; set; } = string.Empty;
}

public sealed class RecoverySuggestionDto
{
    public string Tier { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string DeepLink { get; set; } = "/diary/add";
}

public sealed class DailyNutritionLoopDto
{
    public DateOnly Date { get; set; }
    public DayCompletenessDto DayState { get; set; } = new();
    public List<MealBudgetDto> MealBudgets { get; set; } = new();
    public RemainingNutritionDto Remaining { get; set; } = new();
    public NutritionStatusDto NutritionStatus { get; set; } = new();
    public RecoverySuggestionDto? RecoverySuggestion { get; set; }
    public string WeeklyBalanceNote { get; set; } = string.Empty;
    public DailyLoopActionDto OneJobToday { get; set; } = new();
}

public sealed class FlexibleNutritionPlanDto
{
    public string Goal { get; set; } = "maintain";
    public string Preference { get; set; } = "home_meals";
    public int DurationWeeks { get; set; } = 4;
    public bool IsFixedMenu { get; set; }
    public NutritionTargetPlanDto DailyTarget { get; set; } = new();
    public List<MealTemplateDto> MealTemplates { get; set; } = new();
    public List<PlanWeekDto> Weeks { get; set; } = new();
    public List<string> PreferenceTips { get; set; } = new();
}

public sealed class NutritionTargetPlanDto
{
    public int Calories { get; set; }
    public int Protein { get; set; }
    public int Carbs { get; set; }
    public int Fat { get; set; }
}

public sealed class MealTemplateDto
{
    public string MealKey { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int MinCalories { get; set; }
    public int MaxCalories { get; set; }
    public string Structure { get; set; } = string.Empty;
}

public sealed class PlanWeekDto
{
    public int WeekNumber { get; set; }
    public string FocusKey { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public List<string> Actions { get; set; } = new();
}
