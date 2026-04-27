namespace EatFitAI.API.DTOs.Food
{
    public class FoodItemDto
    {
        public int FoodItemId { get; set; }
        public string FoodName { get; set; } = string.Empty;
        public decimal CaloriesPer100g { get; set; }
        public decimal ProteinPer100g { get; set; }
        public decimal CarbPer100g { get; set; }
        public decimal FatPer100g { get; set; }
        public string? FoodGroup { get; set; }
        public string? Brand { get; set; }
        public string? Barcode { get; set; }
        public bool IsVerified { get; set; }
        public string? Source { get; set; }
        public string? VerifiedBy { get; set; }
        public double ReliabilityScore { get; set; }
        public bool IsDeleted { get; set; }
        public string? ThumbNail { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public ImageVariantsDto? ImageVariants { get; set; }
    }

    public class FoodServingDto
    {
        public int ServingId { get; set; }
        public int FoodItemId { get; set; }
        public int ServingUnitId { get; set; }
        public string ServingUnitName { get; set; } = string.Empty;
        public string? ServingUnitSymbol { get; set; }
        public decimal GramsPerUnit { get; set; }
        public string? Description { get; set; }
    }
}
