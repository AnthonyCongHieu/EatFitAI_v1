namespace EatFitAI.Domain.Foods;

public class CustomDishIngredient
{
    public Guid Id { get; set; }
    public Guid CustomDishId { get; set; }
    public Guid? FoodId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal QuantityGrams { get; set; }
    public decimal CaloriesKcal { get; set; }
    public decimal ProteinGrams { get; set; }
    public decimal CarbohydrateGrams { get; set; }
    public decimal FatGrams { get; set; }

    public CustomDish? CustomDish { get; set; }
    public Food? Food { get; set; }
}
