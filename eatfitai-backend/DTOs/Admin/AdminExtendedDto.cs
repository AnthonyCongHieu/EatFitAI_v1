namespace EatFitAI.API.DTOs.Admin;

// ===================== MEAL DIARY DTOs =====================
public class AdminMealDto
{
    public int MealDiaryId { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = "Unknown";
    public string UserEmail { get; set; } = "";
    public string? FoodName { get; set; }
    public string MealType { get; set; } = "Unknown";
    public string EatenDate { get; set; } = "";
    public decimal Grams { get; set; }
    public decimal Calories { get; set; }
    public decimal Protein { get; set; }
    public decimal Carb { get; set; }
    public decimal Fat { get; set; }
    public string? SourceMethod { get; set; }
    public string? PhotoUrl { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsDeleted { get; set; }
}

public class AdminMealStatsDto
{
    public int TotalMeals { get; set; }
    public int MealsToday { get; set; }
    public int MealsThisWeek { get; set; }
    public Dictionary<string, int> BySource { get; set; } = new();
    public Dictionary<string, int> ByMealType { get; set; } = new();
}

// ===================== AI LOG DTOs =====================
public class AdminAILogDto
{
    public int AILogId { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string Action { get; set; } = "";
    public string? InputPreview { get; set; }
    public string? OutputPreview { get; set; }
    public int? DurationMs { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminCorrectionDto
{
    public int AiCorrectionEventId { get; set; }
    public Guid UserId { get; set; }
    public string? UserName { get; set; }
    public string Label { get; set; } = "";
    public int? FoodItemId { get; set; }
    public string? SelectedFoodName { get; set; }
    public decimal? DetectedConfidence { get; set; }
    public string? Source { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminLabelMapDto
{
    public string Label { get; set; } = "";
    public int? FoodItemId { get; set; }
    public string? FoodName { get; set; }
    public decimal MinConfidence { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminAIStatsDto
{
    public int TotalAIRequests { get; set; }
    public int TotalCorrections { get; set; }
    public int TotalLabels { get; set; }
    public double AccuracyRate { get; set; }
    public List<TopCorrectionDto> TopCorrectedLabels { get; set; } = new();
}

public class TopCorrectionDto
{
    public string Label { get; set; } = "";
    public int Count { get; set; }
}

// ===================== LOOKUP TABLE DTOs =====================
public class LookupItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Extra { get; set; }
}

public class CreateLookupRequest
{
    public string Name { get; set; } = "";
    public string? Extra { get; set; }
}

// ===================== ENHANCED SYSTEM HEALTH =====================
public class SystemHealthExtendedDto : SystemHealthDto
{
    public int TotalMeals { get; set; }
    public int TotalAILogs { get; set; }
    public long UptimeSeconds { get; set; }
}
