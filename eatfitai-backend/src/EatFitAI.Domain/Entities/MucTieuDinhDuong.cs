namespace EatFitAI.Domain.Entities;

public class MucTieuDinhDuong
{
    public Guid Id { get; set; }
    public Guid NguoiDungId { get; set; }
    public int? MucTieuId { get; set; }

    // 'USER' | 'AI'
    public string Nguon { get; set; } = "USER";
    public string? LyDo { get; set; }
    public DateOnly HieuLucTuNgay { get; set; }

    // Targets per day
    public decimal NangLuongKcal { get; set; } // decimal(10,2)
    public decimal ProteinG { get; set; }      // decimal(9,2)
    public decimal CarbG { get; set; }         // decimal(9,2)
    public decimal FatG { get; set; }          // decimal(9,2)

    public NguoiDung? NguoiDung { get; set; }
    public MucTieu? MucTieu { get; set; }
}

