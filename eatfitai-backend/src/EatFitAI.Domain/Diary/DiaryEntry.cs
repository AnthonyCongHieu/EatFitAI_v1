namespace EatFitAI.Domain.Diary;

public class DiaryEntry
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateOnly MealDate { get; set; }
    public string MealCode { get; set; } = string.Empty;
    public Guid? FoodId { get; set; }
    public Guid? CustomDishId { get; set; }
    public Guid? AiRecipeId { get; set; }
    public Guid ItemId { get; set; }
    public string Source { get; set; } = string.Empty;
    public decimal QuantityGrams { get; set; }
    public decimal CaloriesKcal { get; set; }
    public decimal ProteinGrams { get; set; }
    public decimal CarbohydrateGrams { get; set; }
    public decimal FatGrams { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Users.NguoiDung? User { get; set; }
    public Foods.Food? Food { get; set; }
    public Foods.CustomDish? CustomDish { get; set; }
    public Ai.AiRecipe? AiRecipe { get; set; }
}
