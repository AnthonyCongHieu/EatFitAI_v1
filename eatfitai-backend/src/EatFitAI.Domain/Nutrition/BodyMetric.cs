namespace EatFitAI.Domain.Nutrition;

public class BodyMetric
{
    public long MaChiSo { get; set; }
    public Guid MaNguoiDung { get; set; }
    public decimal? CanNangKg { get; set; }
    public decimal? PhanTramMoCoThe { get; set; }
    public decimal? KhoiLuongCoKg { get; set; }
    public decimal? VongEoCm { get; set; }
    public decimal? VongMongCm { get; set; }
    public DateTime NgayCapNhat { get; set; }
    public string? GhiChu { get; set; }

    public Users.NguoiDung? User { get; set; }
}
