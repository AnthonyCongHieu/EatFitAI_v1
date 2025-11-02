namespace EatFitAI.API.DTOs.Analytics
{
    public class NutritionSummaryDto
    {
        public decimal TotalCalories { get; set; }
        public decimal TotalProtein { get; set; }
        public decimal TotalCarbs { get; set; }
        public decimal TotalFat { get; set; }
        public Dictionary<string, decimal> CaloriesByMealType { get; set; } = new();
        public Dictionary<DateTime, decimal> DailyCalories { get; set; } = new();
    }

    public class AnalyticsRequest
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }
}