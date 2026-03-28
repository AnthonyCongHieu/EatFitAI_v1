namespace EatFitAI.API.DTOs.AI
{
    public class TeachLabelRequestDto
    {
        public string Label { get; set; } = default!;
        public int FoodItemId { get; set; }
        public decimal? MinConfidence { get; set; }
        public double? DetectedConfidence { get; set; }
        public string? SelectedFoodName { get; set; }
        public string? Source { get; set; }
        public DateTimeOffset? ClientTimestamp { get; set; }
    }
}

