namespace EatFitAI.API.DTOs.AI
{
    public class TeachLabelRequestDto
    {
        public string Label { get; set; } = default!;
        public int FoodItemId { get; set; }
        public decimal? MinConfidence { get; set; }
    }
}

