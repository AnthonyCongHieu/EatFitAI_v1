namespace EatFitAI.Domain.Entities;

public class MucDoVanDong
{
    public int Id { get; set; }
    public string Ma { get; set; } = default!; // e.g., SEDENTARY, LIGHT, MODERATE, ACTIVE, VERY_ACTIVE
    public string Ten { get; set; } = default!;
    public decimal HeSoTdee { get; set; } // decimal(4,2)
}

