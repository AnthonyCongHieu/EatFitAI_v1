namespace EatFitAI.API.DTOs.Food;

public sealed class BarcodeLookupResultDto
{
    public string Barcode { get; set; } = string.Empty;
    public string Source { get; set; } = "catalog";
    public string? ProviderName { get; set; }
    public FoodItemDto FoodItem { get; set; } = new();
    public IEnumerable<FoodServingDto> Servings { get; set; } = Array.Empty<FoodServingDto>();
}
