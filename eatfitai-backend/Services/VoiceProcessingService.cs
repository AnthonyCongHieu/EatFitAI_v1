/**
 * Voice Processing Service
 * Handles NLU (Natural Language Understanding) for Vietnamese voice commands
 */

using System.Text.RegularExpressions;
using EatFitAI.DTOs;

namespace EatFitAI.Services
{
    public interface IVoiceProcessingService
    {
        Task<ParsedVoiceCommand> ParseCommandAsync(string text, string language = "vi");
    }

    public class VoiceProcessingService : IVoiceProcessingService
    {
        private readonly ILogger<VoiceProcessingService> _logger;

        // Vietnamese meal keywords
        private static readonly Dictionary<string, MealType> MealKeywords = new()
        {
            { "sáng", MealType.Breakfast },
            { "bữa sáng", MealType.Breakfast },
            { "ăn sáng", MealType.Breakfast },
            { "trưa", MealType.Lunch },
            { "bữa trưa", MealType.Lunch },
            { "ăn trưa", MealType.Lunch },
            { "tối", MealType.Dinner },
            { "bữa tối", MealType.Dinner },
            { "ăn tối", MealType.Dinner },
            { "chiều", MealType.Snack },  // Thêm chiều → Snack
            { "xế", MealType.Snack },      // Thêm xế → Snack
            { "bữa phụ", MealType.Snack },
            { "ăn vặt", MealType.Snack },
        };

        public VoiceProcessingService(ILogger<VoiceProcessingService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Parse voice text into structured command
        /// </summary>
        public async Task<ParsedVoiceCommand> ParseCommandAsync(string text, string language = "vi")
        {
            _logger.LogInformation("Parsing voice command: {Text}", text);

            var lowerText = text.ToLower().Trim();

            // THỨ TỰ QUAN TRỌNG: ASK_CALORIES trước ADD_FOOD
            // Vì "ăn bao nhiêu calo" có từ "ăn" nhưng là ASK_CALORIES, không phải ADD_FOOD
            
            // 1. Try to match ASK_CALORIES pattern FIRST
            var caloriesCommand = TryParseAskCalories(lowerText, text);
            if (caloriesCommand.Intent == VoiceIntent.ASK_CALORIES)
            {
                return caloriesCommand;
            }

            // 2. Try to match LOG_WEIGHT pattern
            var weightCommand = TryParseLogWeight(lowerText, text);
            if (weightCommand.Intent == VoiceIntent.LOG_WEIGHT)
            {
                return weightCommand;
            }

            // 3. Try to match ADD_FOOD pattern
            var addFoodCommand = TryParseAddFood(lowerText, text);
            if (addFoodCommand.Intent == VoiceIntent.ADD_FOOD)
            {
                return addFoodCommand;
            }

            // Unknown intent
            return new ParsedVoiceCommand
            {
                Intent = VoiceIntent.UNKNOWN,
                RawText = text,
                Confidence = 0,
            };
        }

        /// <summary>
        /// Try to parse ADD_FOOD intent
        /// Pattern: "ghi/thêm X vào bữa Y"
        /// </summary>
        private ParsedVoiceCommand TryParseAddFood(string lowerText, string originalText)
        {
            // Pattern: ghi/thêm/ăn/log [số] [món] vào [bữa] [sáng/trưa/tối/chiều]
            var pattern = @"(?:ghi|thêm|ăn|log)\s+(.+?)\s+(?:vào\s+)?(?:bữa\s+)?(sáng|trưa|tối|chiều)";
            var match = Regex.Match(lowerText, pattern, RegexOptions.IgnoreCase);

            if (match.Success)
            {
                var foodPart = match.Groups[1].Value.Trim();
                var mealPart = match.Groups[2].Value.Trim();

                // Extract quantity
                decimal quantity = 1;
                string foodName = foodPart;

                var qtyMatch = Regex.Match(foodPart, @"^(\d+(?:\.\d+)?)\s*(.+)");
                if (qtyMatch.Success)
                {
                    quantity = decimal.Parse(qtyMatch.Groups[1].Value);
                    foodName = qtyMatch.Groups[2].Value.Trim();
                }

                // Get meal type
                MealType mealType = MealType.Lunch; // Default
                foreach (var kv in MealKeywords)
                {
                    if (mealPart.Contains(kv.Key))
                    {
                        mealType = kv.Value;
                        break;
                    }
                }

                return new ParsedVoiceCommand
                {
                    Intent = VoiceIntent.ADD_FOOD,
                    RawText = originalText,
                    Confidence = 0.85,
                    Entities = new VoiceCommandEntities
                    {
                        FoodName = foodName,
                        Quantity = quantity,
                        MealType = mealType,
                        Date = DateTime.Now.Date,  // Dùng local time thay vì UTC
                    },
                    SuggestedAction = $"Thêm {quantity} {foodName} vào {GetMealLabel(mealType)}",
                };
            }

            return new ParsedVoiceCommand { Intent = VoiceIntent.UNKNOWN, RawText = originalText };
        }

        /// <summary>
        /// Try to parse LOG_WEIGHT intent
        /// Pattern: "cân nặng X kg"
        /// </summary>
        private ParsedVoiceCommand TryParseLogWeight(string lowerText, string originalText)
        {
            var pattern = @"(?:cân nặng|cân)\s+(?:là\s+)?(\d+(?:\.\d+)?)\s*(?:kg|ký|kí)?";
            var match = Regex.Match(lowerText, pattern, RegexOptions.IgnoreCase);

            if (match.Success)
            {
                var weight = decimal.Parse(match.Groups[1].Value);

                return new ParsedVoiceCommand
                {
                    Intent = VoiceIntent.LOG_WEIGHT,
                    RawText = originalText,
                    Confidence = 0.9,
                    Entities = new VoiceCommandEntities
                    {
                        Weight = weight,
                        Date = DateTime.Now.Date,  // Dùng local time
                    },
                    SuggestedAction = $"Ghi cân nặng {weight} kg",
                };
            }

            return new ParsedVoiceCommand { Intent = VoiceIntent.UNKNOWN, RawText = originalText };
        }

        /// <summary>
        /// Try to parse ASK_CALORIES intent
        /// Pattern: "ăn bao nhiêu calo", "hôm nay ăn được bao nhiêu calo"
        /// </summary>
        private ParsedVoiceCommand TryParseAskCalories(string lowerText, string originalText)
        {
            // Pattern mở rộng: match "ăn bao nhiêu calo", "tiêu thụ bao nhiêu", "tổng calo"...
            var pattern = @"(?:ăn|tiêu thụ|nạp|uống)?\s*(?:được\s+|đã\s+)?(?:bao nhiêu|tổng|hết|mấy)\s*(?:calo|calories|kcal|năng lượng)";
            var match = Regex.Match(lowerText, pattern, RegexOptions.IgnoreCase);

            if (match.Success)
            {
                return new ParsedVoiceCommand
                {
                    Intent = VoiceIntent.ASK_CALORIES,
                    RawText = originalText,
                    Confidence = 0.85,
                    Entities = new VoiceCommandEntities
                    {
                        Date = DateTime.Now.Date,  // Dùng local time
                    },
                    SuggestedAction = "Xem tổng calories hôm nay",
                };
            }

            return new ParsedVoiceCommand { Intent = VoiceIntent.UNKNOWN, RawText = originalText };
        }

        private static string GetMealLabel(MealType mealType)
        {
            return mealType switch
            {
                MealType.Breakfast => "Bữa sáng",
                MealType.Lunch => "Bữa trưa",
                MealType.Dinner => "Bữa tối",
                MealType.Snack => "Bữa phụ",
                _ => "Bữa ăn",
            };
        }
    }
}
