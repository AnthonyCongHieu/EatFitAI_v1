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
}