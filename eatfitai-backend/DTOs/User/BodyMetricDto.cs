namespace EatFitAI.API.DTOs.User
{
    public class BodyMetricDto
    {
        public decimal? HeightCm { get; set; }
        public decimal? WeightKg { get; set; }
        public decimal? BodyFatPct { get; set; }
        public DateTime MeasuredDate { get; set; }
        public string? Note { get; set; }
    }
}