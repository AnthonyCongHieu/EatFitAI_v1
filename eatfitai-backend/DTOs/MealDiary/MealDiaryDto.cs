using EatFitAI.API.DTOs.Common;

namespace EatFitAI.API.DTOs.MealDiary
{
    public class MealDiaryDto
    {
        public int MealDiaryId { get; set; }
        public Guid UserId { get; set; }
        public DateTime EatenDate { get; set; }
        public int MealTypeId { get; set; }
        public string MealTypeName { get; set; } = string.Empty;
        public int? FoodItemId { get; set; }
        public string? FoodItemName { get; set; }
        public int? UserDishId { get; set; }
        public string? UserDishName { get; set; }
        public int? RecipeId { get; set; }
        public string? RecipeName { get; set; }
        public int? ServingUnitId { get; set; }
        public string? ServingUnitName { get; set; }
        public string? ServingUnitSymbol { get; set; }
        public decimal? PortionQuantity { get; set; }
        public decimal Grams { get; set; }
        public decimal Calories { get; set; }
        public decimal Protein { get; set; }
        public decimal Carb { get; set; }
        public decimal Fat { get; set; }
        public string? Note { get; set; }
        public string? PhotoUrl { get; set; }
        public string? SourceMethod { get; set; }
        public string? InputMethod { get; set; }
        public bool IsRoughLog { get; set; }
        public bool UserConfirmed { get; set; } = true;
        public decimal? ConfidenceScore { get; set; }
        public string? TrustSource { get; set; }
        public List<string> DiaryMissingNutrients { get; set; } = new();
        public string? FoodItemThumbNail { get; set; }
        public FoodTrustSummaryDto? TrustSummary { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsDeleted { get; set; }
    }

    public class CreateMealDiaryRequest
    {
        public DateTime EatenDate { get; set; }
        public int MealTypeId { get; set; }
        public int? FoodItemId { get; set; }
        public int? UserFoodItemId { get; set; }
        public int? UserDishId { get; set; }
        public int? RecipeId { get; set; }
        public int? ServingUnitId { get; set; }
        public decimal? PortionQuantity { get; set; }
        public decimal Grams { get; set; }
        public decimal Calories { get; set; }
        public decimal Protein { get; set; }
        public decimal Carb { get; set; }
        public decimal Fat { get; set; }
        public string? Note { get; set; }
        public string? PhotoUrl { get; set; }
        public string? SourceMethod { get; set; }
        public string? InputMethod { get; set; }
        public bool IsRoughLog { get; set; }
        public bool UserConfirmed { get; set; } = true;
        public decimal? ConfidenceScore { get; set; }
        public string? TrustSource { get; set; }
        public List<string>? DiaryMissingNutrients { get; set; }
    }

    public class BulkCreateMealDiaryRequest
    {
        public List<CreateMealDiaryRequest>? Items { get; set; }
    }

    public class MealDayMarkerDto
    {
        public int MealDayMarkerId { get; set; }
        public Guid UserId { get; set; }
        public DateTime LocalDate { get; set; }
        public int? MealTypeId { get; set; }
        public string MarkerType { get; set; } = string.Empty;
        public string? Reason { get; set; }
    }

    public class UpsertMealDayMarkerRequest
    {
        public DateTime LocalDate { get; set; }
        public int? MealTypeId { get; set; }
        public string MarkerType { get; set; } = string.Empty;
        public string? Reason { get; set; }
    }

    public class UpdateMealDiaryRequest
    {
        public DateTime? EatenDate { get; set; }
        public int? MealTypeId { get; set; }
        public int? FoodItemId { get; set; }
        public int? UserFoodItemId { get; set; }
        public int? UserDishId { get; set; }
        public int? RecipeId { get; set; }
        public int? ServingUnitId { get; set; }
        public decimal? PortionQuantity { get; set; }
        public decimal? Grams { get; set; }
        public decimal? Calories { get; set; }
        public decimal? Protein { get; set; }
        public decimal? Carb { get; set; }
        public decimal? Fat { get; set; }
        public string? Note { get; set; }
        public string? PhotoUrl { get; set; }
        public string? SourceMethod { get; set; }
        public string? InputMethod { get; set; }
        public bool? IsRoughLog { get; set; }
        public bool? UserConfirmed { get; set; }
        public decimal? ConfidenceScore { get; set; }
        public string? TrustSource { get; set; }
        public List<string>? DiaryMissingNutrients { get; set; }
    }

    public class CopyPreviousDayRequest
    {
        public DateTime TargetDate { get; set; }
        public int? MealTypeId { get; set; }
    }
}
