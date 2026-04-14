namespace EatFitAI.API.DTOs.Admin;

public class AdminDashboardStatsDto
{
    public int TotalRequests { get; set; }
    public int ActiveKeys { get; set; }
    public int TotalKeys { get; set; }
    public int TotalUsers { get; set; }
    public string Health { get; set; } = "Healthy";
    public string HealthMessage { get; set; } = "All services operational";
    public decimal RequestsGrowth { get; set; }
    public int NewUsersToday { get; set; }
    public List<ChartDataDto> ChartData { get; set; } = new();
    public List<PoolHealthDto> PoolHealth { get; set; } = new();
    public int TotalFoods { get; set; }
}

public class ChartDataDto
{
    public string Name { get; set; } = string.Empty;
    public int Requests { get; set; }
    public int Quota { get; set; }
}

public class PoolHealthDto
{
    public string KeyName { get; set; } = string.Empty;
    public int Used { get; set; }
    public int Limit { get; set; }
    public string Status { get; set; } = "Active";
}

public class AdminUserDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Role { get; set; } = "User";
    public string AccessState { get; set; } = "active";
    public List<string> Capabilities { get; set; } = new();
    public string LastActive { get; set; } = "Unknown";
}

public class AdminUserDetailDto : AdminUserDto
{
    public int TotalMealsLogged { get; set; }
    public bool OnboardingCompleted { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? SuspendedAt { get; set; }
    public string? SuspendedReason { get; set; }
    public string? SuspendedBy { get; set; }
    public DateTime? DeactivatedAt { get; set; }
    public string? DeactivatedBy { get; set; }
}

public class UpdateUserRoleRequest
{
    public string Role { get; set; } = "user";
    public string? Justification { get; set; }
}

public class UpdateUserAccessRequest
{
    public string AccessState { get; set; } = "active";
    public string? Justification { get; set; }
    public string? ConfirmText { get; set; }
}

public class AdminMutationResponseDto
{
    public string Status { get; set; } = "success";
    public string Severity { get; set; } = "info";
    public string RequestId { get; set; } = string.Empty;
    public string? AuditRef { get; set; }
    public string? Warning { get; set; }
    public object? Data { get; set; }
}

public class AdminSessionDto
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string PlatformRole { get; set; } = "user";
    public string AccessState { get; set; } = "active";
    public List<string> Capabilities { get; set; } = new();
    public string RequestId { get; set; } = string.Empty;
}

public class AdminMutationDefinitionDto
{
    public string Key { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Capability { get; set; } = string.Empty;
    public string Severity { get; set; } = "medium";
    public bool JustificationRequired { get; set; }
    public string? ConfirmPhraseTemplate { get; set; }
    public string Rollback { get; set; } = string.Empty;
    public string AuditSchema { get; set; } = string.Empty;
}

public class AdminSupportOverviewDto
{
    public AdminUserDetailDto User { get; set; } = new();
    public List<AdminSupportMealDto> RecentMeals { get; set; } = new();
    public List<AdminSupportCorrectionDto> RecentCorrections { get; set; } = new();
    public List<AdminAuditEventDto> RecentAuditEvents { get; set; } = new();
}

public class AdminSupportMealDto
{
    public int MealDiaryId { get; set; }
    public DateOnly EatenDate { get; set; }
    public string MealType { get; set; } = string.Empty;
    public string? FoodName { get; set; }
    public decimal Calories { get; set; }
    public bool IsDeleted { get; set; }
}

public class AdminSupportCorrectionDto
{
    public int AiCorrectionEventId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string? SelectedFoodName { get; set; }
    public string? Source { get; set; }
    public decimal? DetectedConfidence { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminInboxItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Kind { get; set; } = string.Empty;
    public string Severity { get; set; } = "info";
    public string Title { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public string? RequestId { get; set; }
    public string? AuditRef { get; set; }
    public DateTime OccurredAt { get; set; }
}

public class AdminFoodDto
{
    public int FoodItemId { get; set; }
    public string FoodName { get; set; } = string.Empty;
    public decimal CaloriesPer100g { get; set; }
    public decimal ProteinPer100g { get; set; }
    public decimal FatPer100g { get; set; }
    public decimal CarbPer100g { get; set; }
    public bool IsVerified { get; set; }
    public int CredibilityScore { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateFoodRequest
{
    public string FoodName { get; set; } = string.Empty;
    public decimal CaloriesPer100g { get; set; }
    public decimal ProteinPer100g { get; set; }
    public decimal FatPer100g { get; set; }
    public decimal CarbPer100g { get; set; }
}

public class UpdateFoodRequest
{
    public string? FoodName { get; set; }
    public decimal? CaloriesPer100g { get; set; }
    public decimal? ProteinPer100g { get; set; }
    public decimal? FatPer100g { get; set; }
    public decimal? CarbPer100g { get; set; }
}

public class SystemHealthDto
{
    public string BackendStatus { get; set; } = "Unknown";
    public string DatabaseStatus { get; set; } = "Unknown";
    public string AiProviderStatus { get; set; } = "Unknown";
    public string? ActiveProject { get; set; }
    public int AvailableProjectCount { get; set; }
    public int ExhaustedProjectCount { get; set; }
    public int CooldownProjectCount { get; set; }
    public RuntimeLimitsDto Limits { get; set; } = new();
    public int TotalUsers { get; set; }
    public int TotalFoods { get; set; }
    public int TotalKeys { get; set; }
    public DateTime CheckedAt { get; set; } = DateTime.UtcNow;
}
