namespace EatFitAI.Domain.Ai;

public class AiRecipe
{
    public long MaGoiYAI { get; set; }
    public Guid? MaNguoiDung { get; set; }
    public string LoaiDeXuat { get; set; } = string.Empty;
    public string DuLieuDauVao { get; set; } = string.Empty;
    public string? KetQuaAI { get; set; }
    public DateTime ThoiGianTao { get; set; }
    public int? ThoiLuongXuLyMs { get; set; }

    public Users.NguoiDung? User { get; set; }
    public ICollection<ImageRecognition> ImageRecognitions { get; set; } = new List<ImageRecognition>();
}
