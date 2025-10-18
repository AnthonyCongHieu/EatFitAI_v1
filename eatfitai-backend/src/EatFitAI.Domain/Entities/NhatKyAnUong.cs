namespace EatFitAI.Domain.Entities;

public class NhatKyAnUong
{
    public Guid Id { get; set; }
    public Guid NguoiDungId { get; set; }
    public DateOnly NgayAn { get; set; }
    public string MaBuaAn { get; set; } = default!; // FK to LoaiBuaAn

    // Item mà người dùng ăn (Thực phẩm, Công thức, Món tự định nghĩa)
    public Guid ItemId { get; set; }
    public string Source { get; set; } = default!; // e.g., THUCPHAM | CONGTHUC | MONNGUOIDUNG

    public decimal SoLuongGram { get; set; }     // decimal(9,2)
    public decimal NangLuongKcal { get; set; }   // decimal(10,2)
    public decimal ProteinG { get; set; }        // decimal(9,2)
    public decimal CarbG { get; set; }           // decimal(9,2)
    public decimal FatG { get; set; }            // decimal(9,2)

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public NguoiDung? NguoiDung { get; set; }
}

