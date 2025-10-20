namespace EatFitAI.Domain.Nutrition;

public class NutritionTarget
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateOnly EffectiveDate { get; set; }
    public decimal CaloriesKcal { get; set; }
    public decimal ProteinGrams { get; set; }
    public decimal CarbohydrateGrams { get; set; }
    public decimal FatGrams { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Users.NguoiDung? User { get; set; }
}
