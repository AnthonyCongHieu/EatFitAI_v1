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
    public string LastActive { get; set; } = "Unknown";
}

public class AdminUserDetailDto : AdminUserDto
{
    public int TotalMealsLogged { get; set; }
    public bool OnboardingCompleted { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UpdateUserRoleRequest
{
    public string Role { get; set; } = "User";
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
