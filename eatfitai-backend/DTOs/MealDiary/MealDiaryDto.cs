namespace EatFitAI.API.DTOs.MealDiary
{
    public class MealDiaryDto
    {
        public int MealDiaryId { get; set; }
        public Guid UserId { get; set; }
        public DateTime EatenDate { get; set; }
        public int MealTypeId { get; set; }
        public string MealTypeName { get; set; } = string.Empty;
        public int? FoodItemId { get; set; }
        public string? FoodItemName { get; set; }
        public int? UserDishId { get; set; }
        public string? UserDishName { get; set; }
        public int? RecipeId { get; set; }
        public string? RecipeName { get; set; }
        public int? ServingUnitId { get; set; }
        public string? ServingUnitName { get; set; }
        public string? ServingUnitSymbol { get; set; }
        public decimal? PortionQuantity { get; set; }
        public decimal Grams { get; set; }
        public decimal Calories { get; set; }
        public decimal Protein { get; set; }
        public decimal Carb { get; set; }
        public decimal Fat { get; set; }
        public string? Note { get; set; }
        public string? PhotoUrl { get; set; }
        public string? SourceMethod { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsDeleted { get; set; }
    }

    public class CreateMealDiaryRequest
    {
        public DateTime EatenDate { get; set; }
        public int MealTypeId { get; set; }
        public int? FoodItemId { get; set; }
        public int? UserDishId { get; set; }
        public int? RecipeId { get; set; }
        public int? ServingUnitId { get; set; }
        public decimal? PortionQuantity { get; set; }
        public decimal Grams { get; set; }
        public decimal Calories { get; set; }
        public decimal Protein { get; set; }
        public decimal Carb { get; set; }
        public decimal Fat { get; set; }
        public string? Note { get; set; }
        public string? PhotoUrl { get; set; }
        public string? SourceMethod { get; set; }
    }

    public class UpdateMealDiaryRequest
    {
        public DateTime? EatenDate { get; set; }
        public int? MealTypeId { get; set; }
        public int? FoodItemId { get; set; }
        public int? UserDishId { get; set; }
        public int? RecipeId { get; set; }
        public int? ServingUnitId { get; set; }
        public decimal? PortionQuantity { get; set; }
        public decimal? Grams { get; set; }
        public decimal? Calories { get; set; }
        public decimal? Protein { get; set; }
        public decimal? Carb { get; set; }
        public decimal? Fat { get; set; }
        public string? Note { get; set; }
        public string? PhotoUrl { get; set; }
        public string? SourceMethod { get; set; }
    }
}