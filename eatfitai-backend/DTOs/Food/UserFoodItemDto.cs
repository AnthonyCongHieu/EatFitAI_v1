using Microsoft.AspNetCore.Http;

namespace EatFitAI.API.DTOs.Food
{
    public class UserFoodItemDto
    {
        public int UserFoodItemId { get; set; }
        public Guid UserId { get; set; }
        public string FoodName { get; set; } = string.Empty;
        public string? ThumbnailUrl { get; set; }
        public string UnitType { get; set; } = string.Empty; // "g" or "ml"
        public decimal CaloriesPer100 { get; set; }
        public decimal ProteinPer100 { get; set; }
        public decimal CarbPer100 { get; set; }
        public decimal FatPer100 { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // Used for creation via multipart/form-data
    public class CreateUserFoodItemRequest
    {
        public string FoodName { get; set; } = string.Empty;
        public string UnitType { get; set; } = string.Empty; // "g" or "ml"
        public decimal CaloriesPer100 { get; set; }
        public decimal ProteinPer100 { get; set; }
        public decimal CarbPer100 { get; set; }
        public decimal FatPer100 { get; set; }
        public IFormFile? Thumbnail { get; set; }
    }

    // Used for update via multipart/form-data
    public class UpdateUserFoodItemRequest
    {
        public string? FoodName { get; set; }
        public string? UnitType { get; set; }
        public decimal? CaloriesPer100 { get; set; }
        public decimal? ProteinPer100 { get; set; }
        public decimal? CarbPer100 { get; set; }
        public decimal? FatPer100 { get; set; }
        public IFormFile? Thumbnail { get; set; }
    }
}

