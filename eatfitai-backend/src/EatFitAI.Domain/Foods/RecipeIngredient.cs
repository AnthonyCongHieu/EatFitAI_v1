namespace EatFitAI.Domain.Foods;

public class RecipeIngredient
{
    public long MaNguyenLieu { get; set; }
    public long MaCongThuc { get; set; }
    public long MaThucPham { get; set; }
    public decimal KhoiLuongGram { get; set; }

    public Recipe? Recipe { get; set; }
    public Food? Food { get; set; }
}