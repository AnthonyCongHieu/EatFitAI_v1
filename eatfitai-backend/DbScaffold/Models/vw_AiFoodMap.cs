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
    public bool? IsActive { get; set; }
    public bool? IsDeleted { get; set; }
}

