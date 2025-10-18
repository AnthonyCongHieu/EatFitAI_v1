namespace EatFitAI.Domain.Entities;

public class NguoiDung
{
    public Guid Id { get; set; }
    public string Email { get; set; } = default!;
    public string? HoTen { get; set; }
    public string? GioiTinh { get; set; }
    public DateOnly? NgaySinh { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ChiSoCoThe> ChiSoCoThes { get; set; } = new List<ChiSoCoThe>();
    public ICollection<MucTieuDinhDuong> MucTieuDinhDuongs { get; set; } = new List<MucTieuDinhDuong>();
}

