namespace EatFitAI.Domain.Nutrition;

public class NutritionTarget
{
    public long MaMucTieuDD { get; set; }
    public Guid MaNguoiDung { get; set; }
    public DateTime HieuLucTuNgay { get; set; }
    public int CaloKcal { get; set; }
    public decimal ProteinG { get; set; }
    public decimal CarbG { get; set; }
    public decimal FatG { get; set; }
    public string Nguon { get; set; } = string.Empty;
    public string? LyDo { get; set; }
    public DateTime NgayTao { get; set; }

    public Users.NguoiDung? User { get; set; }
}
