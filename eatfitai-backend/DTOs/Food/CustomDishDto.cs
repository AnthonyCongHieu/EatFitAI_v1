namespace EatFitAI.API.DTOs.Food
{
    public class CustomDishDto
    {
        public string DishName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public List<CustomDishIngredientDto> Ingredients { get; set; } = new();
    }

    public class CustomDishIngredientDto
    {
        public int FoodItemId { get; set; }
        public decimal Grams { get; set; }
        public string? FoodName { get; set; }
        public decimal? CaloriesPer100g { get; set; }
        public decimal? ProteinPer100g { get; set; }
        public decimal? CarbPer100g { get; set; }
        public decimal? FatPer100g { get; set; }
        public string? ThumbnailUrl { get; set; }
    }

    public class CustomDishResponseDto
    {
        public int UserDishId { get; set; }
        public string DishName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<CustomDishIngredientDto> Ingredients { get; set; } = new();
    }

    public class CustomDishSummaryDto
    {
        public int UserDishId { get; set; }
        public string DishName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int IngredientCount { get; set; }
        public decimal DefaultGrams { get; set; }
        public decimal Calories { get; set; }
        public decimal Protein { get; set; }
        public decimal Carb { get; set; }
        public decimal Fat { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ApplyCustomDishRequest
    {
        public DateTime TargetDate { get; set; }
        public int MealTypeId { get; set; }
        public decimal? Grams { get; set; }
        public string? Note { get; set; }
    }
}
