namespace EatFitAI.API.DTOs.AI
{
    public class RecalculateTargetRequest
    {
        public string? Sex { get; set; }
        public int? Age { get; set; }
        public double? HeightCm { get; set; }
        public double? WeightKg { get; set; }
        public double? ActivityLevel { get; set; }
        public string? Goal { get; set; }
    }
}
