namespace EatFitAI.API.DTOs.Analytics
{
    /// <summary>
    /// Complete day summary including nutrition totals, target, and meals grouped by type
    /// </summary>
    public class DaySummaryDto
    {
        public DateTime Date { get; set; }
        public decimal TotalCalories { get; set; }
        public int? TargetCalories { get; set; }
        public decimal TotalProtein { get; set; }
        public decimal TotalCarbs { get; set; }
        public decimal TotalFat { get; set; }
        public Dictionary<string, decimal> CaloriesByMealType { get; set; } = new();
        public List<MealGroupDto> Meals { get; set; } = new();
    }
}
