using System.Collections.Generic;
using EatFitAI.API.DTOs.Common;

namespace EatFitAI.API.DTOs.AI
{
    public class BoundingBoxDto
    {
        public float X { get; set; }
        public float Y { get; set; }
        public float Width { get; set; }
        public float Height { get; set; }
    }

    public class VisionDetectionDto
    {
        public string Label { get; set; } = default!;
        public float Confidence { get; set; }
        public BoundingBoxDto? Bbox { get; set; }
    }

    public class MappedFoodDto
    {
        public string Label { get; set; } = default!;
        public float Confidence { get; set; }
        public BoundingBoxDto? Bbox { get; set; }
        public string? DetectedLabelVi { get; set; }

        public int? FoodItemId { get; set; }
        public string? FoodName { get; set; }

        public decimal? CaloriesPer100g { get; set; }
        public decimal? ProteinPer100g { get; set; }
        public decimal? FatPer100g { get; set; }
        public decimal? CarbPer100g { get; set; }
        public string? ThumbNail { get; set; }
        public int? DefaultServingUnitId { get; set; }
        public string? DefaultServingUnitName { get; set; }
        public string? DefaultServingUnitSymbol { get; set; }
        public decimal? DefaultPortionQuantity { get; set; }
        public decimal? DefaultGrams { get; set; }
        public List<string> MissingNutrients { get; set; } = new();
        public decimal? NutrientCompletenessScore { get; set; }
        public FoodTrustSummaryDto? TrustSummary { get; set; }
        public string ConfidenceLevel { get; set; } = "low";
        public bool RequiresUserConfirmation { get; set; } = true;
        public string? WarningMessage { get; set; }

        public bool IsMatched => FoodItemId.HasValue;
    }

    public class VisionDetectResultDto
    {
        public List<MappedFoodDto> Items { get; set; } = new();
        public List<string> UnmappedLabels { get; set; } = new();
    }
}

