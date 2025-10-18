namespace EatFitAI.Domain.Entities;

public class CongThuc
{
    public Guid Id { get; set; }
    public Guid NguoiDungId { get; set; }
    public string Ten { get; set; } = default!;
    public string? MoTa { get; set; }

    public NguoiDung? NguoiDung { get; set; }
    public ICollection<NguyenLieuCongThuc> NguyenLieu { get; set; } = new List<NguyenLieuCongThuc>();
}

