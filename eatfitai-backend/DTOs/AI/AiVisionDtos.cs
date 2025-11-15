using System.Collections.Generic;

namespace EatFitAI.API.DTOs.AI
{
    public class VisionDetectionDto
    {
        public string Label { get; set; } = default!;
        public float Confidence { get; set; }
    }

    public class MappedFoodDto
    {
        public string Label { get; set; } = default!;
        public float Confidence { get; set; }

        public int? FoodItemId { get; set; }
        public string? FoodName { get; set; }

        public decimal? CaloriesPer100g { get; set; }
        public decimal? ProteinPer100g { get; set; }
        public decimal? FatPer100g { get; set; }
        public decimal? CarbPer100g { get; set; }

        public bool IsMatched => FoodItemId.HasValue;
    }

    public class VisionDetectResultDto
    {
        public List<MappedFoodDto> Items { get; set; } = new();
        public List<string> UnmappedLabels { get; set; } = new();
    }
}

