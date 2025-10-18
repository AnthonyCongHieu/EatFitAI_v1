namespace EatFitAI.Domain.Entities;

public class LoaiBuaAn
{
    // SANG/TRUA/TOI/PHU... as code (MaBuaAn)
    public string MaBuaAn { get; set; } = default!; // PK
    public string Ten { get; set; } = default!;
    public int ThuTu { get; set; }
}

