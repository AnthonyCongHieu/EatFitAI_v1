namespace EatFitAI.Domain.Foods;

public class Food
{
    public long MaThucPham { get; set; }
    public string TenThucPham { get; set; } = string.Empty;
    public string? NhomThucPham { get; set; }
    public string? MoTaKhauPhan { get; set; }
    public decimal Calo100g { get; set; }
    public decimal Protein100g { get; set; }
    public decimal Carb100g { get; set; }
    public decimal Fat100g { get; set; }
    public string? HinhAnh { get; set; }
    public bool TrangThai { get; set; }

    public ICollection<CustomDishIngredient> CustomDishIngredients { get; set; } = new List<CustomDishIngredient>();
    public ICollection<Diary.DiaryEntry> DiaryEntries { get; set; } = new List<Diary.DiaryEntry>();
}
