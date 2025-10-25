namespace EatFitAI.Domain.Nutrition;

public class ActivityLevel
{
    public string MaMucDo { get; set; } = string.Empty;
    public string TenMucDo { get; set; } = string.Empty;
    public string? MoTa { get; set; }
    public decimal HeSoTDEE { get; set; }

    public ICollection<BodyMetric> BodyMetrics { get; set; } = new List<BodyMetric>();
}