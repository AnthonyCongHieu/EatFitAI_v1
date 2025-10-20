namespace EatFitAI.Domain.Nutrition;

public class BodyMetric
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateTime RecordedAt { get; set; }
    public decimal WeightKg { get; set; }
    public decimal? BodyFatPercent { get; set; }
    public decimal? MuscleMassKg { get; set; }
    public decimal? WaistCm { get; set; }
    public decimal? HipCm { get; set; }
    public DateTime CreatedAt { get; set; }

    public Users.NguoiDung? User { get; set; }
}
