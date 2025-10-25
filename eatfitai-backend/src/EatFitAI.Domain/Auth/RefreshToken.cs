namespace EatFitAI.Domain.Auth;

public class RefreshToken
{
    public Guid MaRefreshToken { get; set; }
    public Guid MaNguoiDung { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime NgayTao { get; set; }
    public DateTime HetHanVao { get; set; }
    public DateTime? ThuHoiVao { get; set; }
    public string? ThayTheBangToken { get; set; }
    public string? TaoBoiIP { get; set; }
    public string? ThuHoiBoiIP { get; set; }
    public string? LyDoThuHoi { get; set; }

    public Users.NguoiDung? User { get; set; }
}
