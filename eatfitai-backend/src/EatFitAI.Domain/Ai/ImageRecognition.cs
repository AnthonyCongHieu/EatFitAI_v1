namespace EatFitAI.Domain.Ai;

public class ImageRecognition
{
    public long MaNhanDien { get; set; }
    public long MaGoiYAI { get; set; }
    public string Nhan { get; set; } = string.Empty;
    public decimal? DoTinCay { get; set; }

    public AiRecipe? AiRecipe { get; set; }
}