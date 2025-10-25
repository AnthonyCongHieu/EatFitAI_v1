namespace EatFitAI.Domain.Nutrition;

public class BodyMetric
{
    public long MaChiSo { get; set; }
    public Guid MaNguoiDung { get; set; }
    public decimal? ChieuCaoCm { get; set; }
    public decimal? CanNangKg { get; set; }
    public string? MaMucDo { get; set; }
    public string? MaMucTieu { get; set; }
    public DateTime NgayCapNhat { get; set; }
    public string? GhiChu { get; set; }

    public Users.NguoiDung? User { get; set; }
}
