namespace EatFitAI.Domain.Foods;

public class Recipe
{
    public long MaCongThuc { get; set; }
    public string TenCongThuc { get; set; } = string.Empty;
    public string? LoaiMon { get; set; }
    public int? ThoiGianUocTinhPhut { get; set; }
    public string? HuongDanCheBien { get; set; }
    public string? HinhAnh { get; set; }
    public bool TrangThai { get; set; }

    public ICollection<RecipeIngredient> Ingredients { get; set; } = new List<RecipeIngredient>();
    public ICollection<Diary.DiaryEntry> DiaryEntries { get; set; } = new List<Diary.DiaryEntry>();
}