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
        // Target macros để hiển thị consumed/target (ví dụ: 166/190g Protein)
        public int? TargetProtein { get; set; }
        public int? TargetCarbs { get; set; }
        public int? TargetFat { get; set; }
        public Dictionary<string, decimal> CaloriesByMealType { get; set; } = new();
        public List<MealGroupDto> Meals { get; set; } = new();
    }
}
