/**
 * Voice Processing Service
 * Handles NLU (Natural Language Understanding) for Vietnamese voice commands
 */

using System.Text.RegularExpressions;
using EatFitAI.API.Helpers;
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
            { "sang", MealType.Breakfast },
            { "bữa sáng", MealType.Breakfast },
            { "bua sang", MealType.Breakfast },
            { "ăn sáng", MealType.Breakfast },
            { "an sang", MealType.Breakfast },
            { "trưa", MealType.Lunch },
            { "trua", MealType.Lunch },
            { "bữa trưa", MealType.Lunch },
            { "bua trua", MealType.Lunch },
            { "ăn trưa", MealType.Lunch },
            { "an trua", MealType.Lunch },
            { "tối", MealType.Dinner },
            { "toi", MealType.Dinner },
            { "bữa tối", MealType.Dinner },
            { "bua toi", MealType.Dinner },
            { "ăn tối", MealType.Dinner },
            { "an toi", MealType.Dinner },
            { "chiều", MealType.Snack },  // Thêm chiều → Snack
            { "chieu", MealType.Snack },
            { "xế", MealType.Snack },      // Thêm xế → Snack
            { "bữa phụ", MealType.Snack },
            { "bua phu", MealType.Snack },
            { "phu", MealType.Snack },
            { "snack", MealType.Snack },
            { "ăn vặt", MealType.Snack },
            { "an vat", MealType.Snack },
        };

        public VoiceProcessingService(ILogger<VoiceProcessingService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Parse voice text into structured command
        /// </summary>
        public Task<ParsedVoiceCommand> ParseCommandAsync(string text, string language = "vi")
        {
            _logger.LogInformation("Parsing voice command: {Text}", text);

            var lowerText = text.ToLower().Trim();

            // THỨ TỰ QUAN TRỌNG: ASK_CALORIES trước ADD_FOOD
            // Vì "ăn bao nhiêu calo" có từ "ăn" nhưng là ASK_CALORIES, không phải ADD_FOOD
            
            // 1. Try to match ASK_CALORIES pattern FIRST
            var caloriesCommand = TryParseAskCalories(lowerText, text);
            if (caloriesCommand.Intent == VoiceIntent.ASK_CALORIES)
            {
                return Task.FromResult(caloriesCommand);
            }

            // 2. Try to match LOG_WEIGHT pattern
            var weightCommand = TryParseLogWeight(lowerText, text);
            if (weightCommand.Intent == VoiceIntent.LOG_WEIGHT)
            {
                return Task.FromResult(weightCommand);
            }

            // 3. Try to match ADD_FOOD pattern
            var addFoodCommand = TryParseAddFood(lowerText, text);
            if (addFoodCommand.Intent == VoiceIntent.ADD_FOOD)
            {
                return Task.FromResult(addFoodCommand);
            }

            // Unknown intent
            return Task.FromResult(new ParsedVoiceCommand
            {
                Intent = VoiceIntent.UNKNOWN,
                RawText = text,
                Confidence = 0,
            });
        }

        /// <summary>
        /// Try to parse ADD_FOOD intent
        /// Pattern: "ghi/thêm X vào bữa Y"
        /// </summary>
        private ParsedVoiceCommand TryParseAddFood(string lowerText, string originalText)
        {
            // Pattern: ghi/thêm/ăn/log [số] [món] vào [bữa] [sáng/trưa/tối/chiều]
            var pattern =
                @"(?:ghi|thêm|them|ăn|an|log)\s+(.+?)\s+(?:(?:vào|vao)\s+)?(?:(?:bữa|bua)\s+)?(sáng|sang|trưa|trua|tối|toi|chiều|chieu|phụ|phu|snack)";
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
                        Date = DateTimeHelper.GetVietnamNow().Date,
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
            var pattern = @"(?:cân nặng|can nang|cân|can)\s+(?:(?:là|la)\s+)?(\d+(?:\.\d+)?)\s*(?:kg|ký|ky|kí|ki)?";
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
                        Date = DateTimeHelper.GetVietnamNow().Date,
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
            var pattern =
                @"(?:ăn|an|tiêu thụ|tieu thu|nạp|nap|uống|uong)?\s*(?:(?:được|duoc)\s+|(?:đã|da)\s+)?(?:bao nhiêu|bao nhieu|tổng|tong|hết|het|mấy|may)\s*(?:calo|calories|kcal|năng lượng|nang luong)";
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
                        Date = DateTimeHelper.GetVietnamNow().Date,
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
