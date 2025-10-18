namespace EatFitAI.Domain.Entities;

public class ThucPham
{
    public Guid Id { get; set; }
    public string Ten { get; set; } = default!;
    public string? DonViMacDinh { get; set; } = "100g";

    // per 100g
    public decimal NangLuongKcalPer100g { get; set; } // decimal(10,2)
    public decimal ProteinGPer100g { get; set; }      // decimal(9,2)
    public decimal CarbGPer100g { get; set; }         // decimal(9,2)
    public decimal FatGPer100g { get; set; }          // decimal(9,2)
}

