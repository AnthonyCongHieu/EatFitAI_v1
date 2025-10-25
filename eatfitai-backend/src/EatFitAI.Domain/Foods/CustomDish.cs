namespace EatFitAI.Domain.Foods;

public class CustomDish
{
    public long MaMonNguoiDung { get; set; }
    public Guid MaNguoiDung { get; set; }
    public string TenMon { get; set; } = string.Empty;
    public decimal Calo100g { get; set; }
    public decimal Protein100g { get; set; }
    public decimal Carb100g { get; set; }
    public decimal Fat100g { get; set; }
    public string? GhiChu { get; set; }
    public DateTime NgayTao { get; set; }

    public Users.NguoiDung? User { get; set; }
    public ICollection<CustomDishIngredient> Ingredients { get; set; } = new List<CustomDishIngredient>();
    public ICollection<Diary.DiaryEntry> DiaryEntries { get; set; } = new List<Diary.DiaryEntry>();
}
