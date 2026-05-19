using System;
using System.Collections.Generic;
using EatFitAI.API.DTOs.Food;

namespace EatFitAI.API.DTOs.AI
{
    /// <summary>
    /// Request for recipe suggestions based on available ingredients
    /// </summary>
    public class RecipeSuggestionRequest
    {
        public List<string> AvailableIngredients { get; set; } = new();
        public List<int> AvailableFoodItemIds { get; set; } = new();
        public List<RecipeIngredientHintDto> IngredientHints { get; set; } = new();
        public string? Mode { get; set; } = "auto";
        public string? Date { get; set; }
        public int? MealTypeId { get; set; }
        public int? MaxCookingTimeMinutes { get; set; }
        public int? MinMatchedIngredients { get; set; } = 1;
        public int MaxResults { get; set; } = 10;
        public decimal? RemainingCalories { get; set; }
        public decimal? RemainingProtein { get; set; }
        public decimal? RemainingCarbs { get; set; }
        public decimal? RemainingFat { get; set; }
        public Guid? UserId { get; set; }
    }

    public class RecipeIngredientHintDto
    {
        public int? FoodItemId { get; set; }
        public string? Name { get; set; }
        public decimal? Confidence { get; set; }
    }

    /// <summary>
    /// Recipe suggestion result with match information
    /// </summary>
    public class RecipeSuggestionDto
    {
        public int RecipeId { get; set; }
        public string RecipeName { get; set; } = default!;
        public string? Description { get; set; }
        
        // Nutrition info (calculated from ingredients)
        public decimal TotalCalories { get; set; }
        public decimal TotalProtein { get; set; }
        public decimal TotalCarbs { get; set; }
        public decimal TotalFat { get; set; }
        public decimal TotalGrams { get; set; }

        public string? ImageUrl { get; set; }
        public ImageVariantsDto? ImageVariants { get; set; }
        public int? CookTimeMinutes { get; set; }
        public string? Difficulty { get; set; }
        public int? ServingCount { get; set; }
        
        // Match information
        public int MatchedIngredientsCount { get; set; }
        public int TotalIngredientsCount { get; set; }
        public decimal MatchPercentage { get; set; }
        public decimal MatchScore { get; set; }
        public int MissingIngredientCount { get; set; }
        public List<string> ScoreReasons { get; set; } = new();
        public string SuggestionGroup { get; set; } = "needsMore";
        public bool CanCookNow { get; set; }
        public string? GuideStatus { get; set; }
        public List<string> SourceUrls { get; set; } = new();
        public RecipeYoutubeVideoDto? YoutubeVideo { get; set; }
        public List<string> PrepItems { get; set; } = new();
        public string Disclaimer { get; set; } = string.Empty;
        
        // Lists for user reference
        public List<string> AvailableIngredients { get; set; } = new();
        public List<string> MatchedIngredients { get; set; } = new();
        public List<string> MissingIngredients { get; set; } = new();
        public List<string> ExtraIngredients { get; set; } = new();
        public List<string> RequiredIngredients { get; set; } = new();
        public List<string> AllIngredients { get; set; } = new();
    }

    /// <summary>
    /// Detailed recipe information including full ingredient list and nutrition
    /// </summary>
    public class RecipeDetailDto
    {
        public int RecipeId { get; set; }
        public string RecipeName { get; set; } = default!;
        public string? Description { get; set; }
        
        // Nutrition totals
        public decimal TotalCalories { get; set; }
        public decimal TotalProtein { get; set; }
        public decimal TotalCarbs { get; set; }
        public decimal TotalFat { get; set; }
        public decimal TotalGrams { get; set; }

        public string? ImageUrl { get; set; }
        public ImageVariantsDto? ImageVariants { get; set; }
        public int? CookTimeMinutes { get; set; }
        public string? Difficulty { get; set; }
        public int? ServingCount { get; set; }
        public int CredibilityScore { get; set; }
        
        // Hướng dẫn nấu ăn (các bước)
        public List<string>? Instructions { get; set; }
        
        // URL video hướng dẫn (YouTube)
        public string? VideoUrl { get; set; }
        public RecipeYoutubeVideoDto? YoutubeVideo { get; set; }
        public string? GuideStatus { get; set; }
        public List<string> SourceUrls { get; set; } = new();
        public string Disclaimer { get; set; } = string.Empty;
        public List<string> RequiredIngredients { get; set; } = new();
        
        // Detailed ingredients
        public List<RecipeIngredientDetailDto> Ingredients { get; set; } = new();
    }

    /// <summary>
    /// Individual ingredient in a recipe with nutrition details
    /// </summary>
    public class RecipeIngredientDetailDto
    {
        public int FoodItemId { get; set; }
        public string FoodName { get; set; } = default!;
        public decimal Grams { get; set; }
        
        // Nutrition per this quantity
        public decimal Calories { get; set; }
        public decimal Protein { get; set; }
        public decimal Carbs { get; set; }
        public decimal Fat { get; set; }
    }

    /// <summary>
    /// Request for AI-generated cooking instructions
    /// </summary>
    public class CookingInstructionsRequest
    {
        public string RecipeName { get; set; } = default!;
        public List<RecipeIngredientInput> Ingredients { get; set; } = new();
        public string? Description { get; set; }
    }

    public class RecipeIngredientInput
    {
        public string FoodName { get; set; } = default!;
        public decimal Grams { get; set; }
    }

    /// <summary>
    /// AI-generated cooking instructions response
    /// </summary>
    public class CookingInstructionsDto
    {
        public List<string> Steps { get; set; } = new();
        public string? CookingTime { get; set; }
        public string? Difficulty { get; set; }
    }

    public class RecipeYoutubeVideoDto
    {
        public string? VideoId { get; set; }
        public string? Title { get; set; }
        public string? ChannelTitle { get; set; }
        public string? Url { get; set; }
        public string? ThumbnailUrl { get; set; }
    }

    public class RecipeCookingGuideDto
    {
        public int RecipeId { get; set; }
        public List<string> Steps { get; set; } = new();
        public int? CookingTimeMinutes { get; set; }
        public string? Difficulty { get; set; }
        public List<string> PrepItems { get; set; } = new();
        public List<string> Tips { get; set; } = new();
        public List<string> SourceUrls { get; set; } = new();
        public RecipeYoutubeVideoDto? YoutubeVideo { get; set; }
        public string GuideStatus { get; set; } = "fallback";
    }
}
