using EatFitAI.API.DTOs.Common;

namespace EatFitAI.API.DTOs.Food
{
    public class FoodSearchResultDto
    {
        public string Source { get; set; } = string.Empty; // catalog | user
        public int Id { get; set; }
        public string FoodName { get; set; } = string.Empty;
        public string? ThumbnailUrl { get; set; }
        public string UnitType { get; set; } = "g"; // g or ml
        public decimal CaloriesPer100 { get; set; }
        public decimal ProteinPer100 { get; set; }
        public decimal CarbPer100 { get; set; }
        public decimal FatPer100 { get; set; }
        public decimal NutrientCompletenessScore { get; set; } = 100;
        public List<string> MissingNutrients { get; set; } = new();
        public FoodTrustSummaryDto? TrustSummary { get; set; }
        public ImageVariantsDto? ImageVariants { get; set; }
    }
}

