namespace EatFitAI.Domain.Entities;

public class MonNguoiDung
{
    public Guid Id { get; set; }
    public Guid NguoiDungId { get; set; }
    public string Ten { get; set; } = default!;
    public string? MoTa { get; set; }

    // Macro per 100g (đã chuẩn hóa)
    public decimal NangLuongKcalPer100g { get; set; } // decimal(10,2)
    public decimal ProteinGPer100g { get; set; }      // decimal(9,2)
    public decimal CarbGPer100g { get; set; }         // decimal(9,2)
    public decimal FatGPer100g { get; set; }          // decimal(9,2)

    public NguoiDung? NguoiDung { get; set; }
}

