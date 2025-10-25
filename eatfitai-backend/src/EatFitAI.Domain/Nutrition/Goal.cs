namespace EatFitAI.Domain.Nutrition;

public class Goal
{
    public string MaMucTieu { get; set; } = string.Empty;
    public string TenMucTieu { get; set; } = string.Empty;
    public string? MoTa { get; set; }

    public ICollection<BodyMetric> BodyMetrics { get; set; } = new List<BodyMetric>();
}