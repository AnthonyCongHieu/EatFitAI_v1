namespace EatFitAI.Domain.Foods;

public class Food
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Brand { get; set; }
    public string? Category { get; set; }
    public decimal ServingSizeGrams { get; set; }
    public decimal CaloriesKcal { get; set; }
    public decimal ProteinGrams { get; set; }
    public decimal CarbohydrateGrams { get; set; }
    public decimal FatGrams { get; set; }
    public bool IsCustom { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public ICollection<CustomDishIngredient> CustomDishIngredients { get; set; } = new List<CustomDishIngredient>();
    public ICollection<Diary.DiaryEntry> DiaryEntries { get; set; } = new List<Diary.DiaryEntry>();
}
