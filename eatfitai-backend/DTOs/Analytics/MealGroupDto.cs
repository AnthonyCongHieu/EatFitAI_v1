using EatFitAI.API.DTOs.MealDiary;

namespace EatFitAI.API.DTOs.Analytics
{
    public class MealGroupDto
    {
        public int MealTypeId { get; set; }
        public string MealTypeName { get; set; } = string.Empty;
        public decimal TotalCalories { get; set; }
        public decimal Protein { get; set; }
        public decimal Carbs { get; set; }
        public decimal Fat { get; set; }
        public List<MealDiaryDto> Entries { get; set; } = new();
    }
}
