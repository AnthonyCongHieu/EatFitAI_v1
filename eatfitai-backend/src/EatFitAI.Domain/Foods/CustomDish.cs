namespace EatFitAI.Domain.Foods;

public class CustomDish
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal PortionSizeGrams { get; set; }
    public decimal CaloriesKcal { get; set; }
    public decimal ProteinGrams { get; set; }
    public decimal CarbohydrateGrams { get; set; }
    public decimal FatGrams { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Users.NguoiDung? User { get; set; }
    public ICollection<CustomDishIngredient> Ingredients { get; set; } = new List<CustomDishIngredient>();
    public ICollection<Diary.DiaryEntry> DiaryEntries { get; set; } = new List<Diary.DiaryEntry>();
}
