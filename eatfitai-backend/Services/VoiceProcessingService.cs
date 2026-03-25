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
            { "sÃ¡ng", MealType.Breakfast },
            { "bá»¯a sÃ¡ng", MealType.Breakfast },
            { "Äƒn sÃ¡ng", MealType.Breakfast },
            { "trÆ°a", MealType.Lunch },
            { "bá»¯a trÆ°a", MealType.Lunch },
            { "Äƒn trÆ°a", MealType.Lunch },
            { "tá»‘i", MealType.Dinner },
            { "bá»¯a tá»‘i", MealType.Dinner },
            { "Äƒn tá»‘i", MealType.Dinner },
            { "chiá»u", MealType.Snack },  // ThÃªm chiá»u â†’ Snack
            { "xáº¿", MealType.Snack },      // ThÃªm xáº¿ â†’ Snack
            { "bá»¯a phá»¥", MealType.Snack },
            { "Äƒn váº·t", MealType.Snack },
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

            // THá»¨ Tá»° QUAN TRá»ŒNG: ASK_CALORIES trÆ°á»›c ADD_FOOD
            // VÃ¬ "Äƒn bao nhiÃªu calo" cÃ³ tá»« "Äƒn" nhÆ°ng lÃ  ASK_CALORIES, khÃ´ng pháº£i ADD_FOOD
            
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
        /// Pattern: "ghi/thÃªm X vÃ o bá»¯a Y"
        /// </summary>
        private ParsedVoiceCommand TryParseAddFood(string lowerText, string originalText)
        {
            // Pattern: ghi/thÃªm/Äƒn/log [sá»‘] [mÃ³n] vÃ o [bá»¯a] [sÃ¡ng/trÆ°a/tá»‘i/chiá»u]
            var pattern = @"(?:ghi|thÃªm|Äƒn|log)\s+(.+?)\s+(?:vÃ o\s+)?(?:bá»¯a\s+)?(sÃ¡ng|trÆ°a|tá»‘i|chiá»u)";
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
                        Date = DateTime.Now.Date,  // DÃ¹ng local time thay vÃ¬ UTC
                    },
                    SuggestedAction = $"ThÃªm {quantity} {foodName} vÃ o {GetMealLabel(mealType)}",
                };
            }

            return new ParsedVoiceCommand { Intent = VoiceIntent.UNKNOWN, RawText = originalText };
        }

        /// <summary>
        /// Try to parse LOG_WEIGHT intent
        /// Pattern: "cÃ¢n náº·ng X kg"
        /// </summary>
        private ParsedVoiceCommand TryParseLogWeight(string lowerText, string originalText)
        {
            var pattern = @"(?:cÃ¢n náº·ng|cÃ¢n)\s+(?:lÃ \s+)?(\d+(?:\.\d+)?)\s*(?:kg|kÃ½|kÃ­)?";
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
                        Date = DateTime.Now.Date,  // DÃ¹ng local time
                    },
                    SuggestedAction = $"Ghi cÃ¢n náº·ng {weight} kg",
                };
            }

            return new ParsedVoiceCommand { Intent = VoiceIntent.UNKNOWN, RawText = originalText };
        }

        /// <summary>
        /// Try to parse ASK_CALORIES intent
        /// Pattern: "Äƒn bao nhiÃªu calo", "hÃ´m nay Äƒn Ä‘Æ°á»£c bao nhiÃªu calo"
        /// </summary>
        private ParsedVoiceCommand TryParseAskCalories(string lowerText, string originalText)
        {
            // Pattern má»Ÿ rá»™ng: match "Äƒn bao nhiÃªu calo", "tiÃªu thá»¥ bao nhiÃªu", "tá»•ng calo"...
            var pattern = @"(?:Äƒn|tiÃªu thá»¥|náº¡p|uá»‘ng)?\s*(?:Ä‘Æ°á»£c\s+|Ä‘Ã£\s+)?(?:bao nhiÃªu|tá»•ng|háº¿t|máº¥y)\s*(?:calo|calories|kcal|nÄƒng lÆ°á»£ng)";
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
                        Date = DateTime.Now.Date,  // DÃ¹ng local time
                    },
                    SuggestedAction = "Xem tá»•ng calories hÃ´m nay",
                };
            }

            return new ParsedVoiceCommand { Intent = VoiceIntent.UNKNOWN, RawText = originalText };
        }

        private static string GetMealLabel(MealType mealType)
        {
            return mealType switch
            {
                MealType.Breakfast => "Bá»¯a sÃ¡ng",
                MealType.Lunch => "Bá»¯a trÆ°a",
                MealType.Dinner => "Bá»¯a tá»‘i",
                MealType.Snack => "Bá»¯a phá»¥",
                _ => "Bá»¯a Äƒn",
            };
        }
    }
}
