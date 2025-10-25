namespace EatFitAI.Domain.Users;

public class UserProfile
{
    public Guid MaNguoiDung { get; set; }
    public string MucDoVanDong { get; set; } = string.Empty;
    public string? AnhDaiDienUrl { get; set; }
    public DateOnly? NgaySinh { get; set; }
    public string? HoTen { get; set; }
    public string? GioiTinh { get; set; }
    public string? MucTieu { get; set; }
    public decimal? ChieuCaoCm { get; set; }
    public decimal? CanNangMucTieuKg { get; set; }
    public DateTime NgayCapNhat { get; set; }
    public DateTime NgayTao { get; set; }

    public NguoiDung? User { get; set; }
}
