namespace EatFitAI.Domain.Foods;

public class CustomDishIngredient
{
    public long MaNguyenLieu { get; set; }
    public long MaMonNguoiDung { get; set; }
    public long MaThucPham { get; set; }
    public string TenNguyenLieu { get; set; } = string.Empty;
    public decimal KhoiLuongGram { get; set; }
    public decimal CaloKcal { get; set; }
    public decimal ProteinG { get; set; }
    public decimal CarbG { get; set; }
    public decimal FatG { get; set; }

    public CustomDish? CustomDish { get; set; }
    public Food? Food { get; set; }
}
