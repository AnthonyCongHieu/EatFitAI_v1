namespace EatFitAI.API.DbScaffold.Models;

public partial class vw_AiFoodMap
{
    public string Label { get; set; } = default!;
    public decimal MinConfidence { get; set; }
    public int? FoodItemId { get; set; }
    public string? FoodName { get; set; }
    public decimal? CaloriesPer100g { get; set; }
    public decimal? ProteinPer100g { get; set; }
    public decimal? FatPer100g { get; set; }
    public decimal? CarbPer100g { get; set; }
    public string? FoodNameEn { get; set; }
    public string? FoodNameUnsigned { get; set; }
    public bool IsVerified { get; set; }
    public string? VerifiedBy { get; set; }
    public string? VerificationStatus { get; set; }
    public int CredibilityScore { get; set; }
    public decimal NutrientCompletenessScore { get; set; }
    public string? MissingNutrients { get; set; }
}
