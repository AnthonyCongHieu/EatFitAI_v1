namespace EatFitAI.Domain.Entities;

public class NguyenLieuCongThuc
{
    public Guid Id { get; set; }
    public Guid CongThucId { get; set; }
    public Guid ThucPhamId { get; set; }
    public decimal KhoiLuongGram { get; set; } // decimal(9,2)

    public CongThuc? CongThuc { get; set; }
    public ThucPham? ThucPham { get; set; }
}

