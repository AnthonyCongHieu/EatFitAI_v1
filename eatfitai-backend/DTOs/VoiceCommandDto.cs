/**
 * Voice Command DTOs
 * Data Transfer Objects for Voice AI feature
 */

using System.Text.Json.Serialization;

namespace EatFitAI.DTOs
{
    /// <summary>
    /// Request to process voice text
    /// </summary>
    public class VoiceProcessRequest
    {
        public string Text { get; set; } = string.Empty;
        public string Language { get; set; } = "vi";
    }

    /// <summary>
    /// Types of voice intents
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum VoiceIntent
    {
        ADD_FOOD,       // Thêm món ăn
        LOG_WEIGHT,     // Ghi cân nặng
        ASK_CALORIES,   // Hỏi calories
        ASK_NUTRITION,  // Hỏi dinh dưỡng
        UNKNOWN         // Không hiểu
    }

    /// <summary>
    /// Meal type enum
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum MealType
    {
        Breakfast = 1,
        Lunch = 2,
        Dinner = 3,
        Snack = 4
    }

    /// <summary>
    /// Single food item for multi-food commands
    /// </summary>
    public class FoodItem
    {
        public string? FoodName { get; set; }
        public decimal? Quantity { get; set; }
        public string? Unit { get; set; }
        public decimal? Weight { get; set; }
    }

    /// <summary>
    /// Entities extracted from voice command
    /// </summary>
    public class VoiceCommandEntities
    {
        public string? FoodName { get; set; }
        public decimal? Quantity { get; set; }
        public string? Unit { get; set; }
        public MealType? MealType { get; set; }
        public DateTime? Date { get; set; }
        public decimal? Weight { get; set; }
        
        /// <summary>
        /// Nhiều món ăn (khi user nói "thêm 100g cơm và 200g gà")
        /// </summary>
        public List<FoodItem>? Foods { get; set; }
    }

    /// <summary>
    /// Parsed voice command
    /// </summary>
    public class ParsedVoiceCommand
    {
        public VoiceIntent Intent { get; set; }
        public VoiceCommandEntities Entities { get; set; } = new();
        public double Confidence { get; set; }
        public string RawText { get; set; } = string.Empty;
        public string? SuggestedAction { get; set; }
    }

    /// <summary>
    /// Executed action result
    /// </summary>
    public class ExecutedAction
    {
        public string Type { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        /// <summary>
        /// Data thực sự (calories, weight hiện tại, etc.)
        /// </summary>
        public Dictionary<string, object>? Data { get; set; }
    }

    /// <summary>
    /// Voice processing response
    /// </summary>
    public class VoiceProcessResponse
    {
        public bool Success { get; set; }
        public ParsedVoiceCommand? Command { get; set; }
        public string? Error { get; set; }
        public ExecutedAction? ExecutedAction { get; set; }
    }

    /// <summary>
    /// Request to confirm weight change
    /// </summary>
    public class ConfirmWeightRequest
    {
        public decimal NewWeight { get; set; }
    }
}
