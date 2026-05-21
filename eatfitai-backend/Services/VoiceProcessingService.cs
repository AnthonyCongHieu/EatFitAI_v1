/**
 * Voice Processing Service
 * Handles NLU (Natural Language Understanding) for Vietnamese voice commands
 */

using System.Globalization;
using System.Text;
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

        private static readonly HashSet<string> PortionUnits = new(StringComparer.OrdinalIgnoreCase)
        {
            "bat",
            "chen",
            "dia",
            "ly",
            "coc",
            "hop",
            "mieng",
            "phan",
            "suat",
            "trai",
            "qua"
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

            var lowerText = NormalizeVoiceText(text);

            // THỨ TỰ QUAN TRỌNG: ASK_CALORIES trước ADD_FOOD
            // Vì "ăn bao nhiêu calo" có từ "ăn" nhưng là ASK_CALORIES, không phải ADD_FOOD
            
            // 1. Try to match ASK_CALORIES pattern FIRST
            var caloriesCommand = TryParseAskCalories(lowerText, text);
            if (caloriesCommand.Intent == VoiceIntent.ASK_CALORIES)
            {
                return Task.FromResult(caloriesCommand);
            }

            var nutritionCommand = TryParseAskNutrition(lowerText, text);
            if (nutritionCommand.Intent == VoiceIntent.ASK_NUTRITION)
            {
                return Task.FromResult(nutritionCommand);
            }

            var queryMealCommand = TryParseQueryMeal(lowerText, text);
            if (queryMealCommand.Intent == VoiceIntent.QUERY_MEAL)
            {
                return Task.FromResult(queryMealCommand);
            }

            var repeatMealCommand = TryParseRepeatMeal(lowerText, text);
            if (repeatMealCommand.Intent == VoiceIntent.REPEAT_MEAL)
            {
                return Task.FromResult(repeatMealCommand);
            }

            var noteCommand = TryParseAddNote(lowerText, text);
            if (noteCommand.Intent == VoiceIntent.ADD_NOTE)
            {
                return Task.FromResult(noteCommand);
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
        private static string NormalizeVoiceText(string text)
        {
            var normalized = text.ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(normalized.Length);
            foreach (var ch in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                {
                    builder.Append(ch == 'đ' ? 'd' : ch);
                }
            }

            return Regex.Replace(builder.ToString(), @"\s+", " ").Trim();
        }

        private static MealType? FindMealType(string normalizedText)
        {
            if (Regex.IsMatch(normalizedText, @"\b(?:bua\s+)?sang\b|\ban sang\b"))
            {
                return MealType.Breakfast;
            }

            if (Regex.IsMatch(normalizedText, @"\b(?:bua\s+)?trua\b|\ban trua\b"))
            {
                return MealType.Lunch;
            }

            if (Regex.IsMatch(normalizedText, @"\b(?:bua\s+)?toi\b|\ban toi\b"))
            {
                return MealType.Dinner;
            }

            if (Regex.IsMatch(normalizedText, @"\b(?:bua\s+)?phu\b|\bsnack\b|\ban vat\b|\bchieu\b"))
            {
                return MealType.Snack;
            }

            return null;
        }

        private static int? FindDateOffsetDays(string normalizedText)
        {
            if (normalizedText.Contains("hom qua", StringComparison.OrdinalIgnoreCase))
            {
                return -1;
            }

            if (normalizedText.Contains("hom nay", StringComparison.OrdinalIgnoreCase) ||
                Regex.IsMatch(normalizedText, @"\bnay\b"))
            {
                return 0;
            }

            return null;
        }

        private ParsedVoiceCommand TryParseQueryMeal(string lowerText, string originalText)
        {
            if (!Regex.IsMatch(lowerText, @"\b(an gi|mon gi|da an gi|an mon gi)\b", RegexOptions.IgnoreCase))
            {
                return new ParsedVoiceCommand { Intent = VoiceIntent.UNKNOWN, RawText = originalText };
            }

            return new ParsedVoiceCommand
            {
                Intent = VoiceIntent.QUERY_MEAL,
                RawText = originalText,
                Confidence = 0.9,
                Entities = new VoiceCommandEntities
                {
                    MealType = FindMealType(lowerText),
                    DateOffsetDays = FindDateOffsetDays(lowerText) ?? 0,
                    QueryType = "meal_entries"
                },
                SuggestedAction = "Xem bữa ăn đã ghi",
            };
        }

        private ParsedVoiceCommand TryParseRepeatMeal(string lowerText, string originalText)
        {
            if (!Regex.IsMatch(lowerText, @"\b(them lai|lap lai|an lai|copy lai)\b", RegexOptions.IgnoreCase))
            {
                return new ParsedVoiceCommand { Intent = VoiceIntent.UNKNOWN, RawText = originalText };
            }

            return new ParsedVoiceCommand
            {
                Intent = VoiceIntent.REPEAT_MEAL,
                RawText = originalText,
                Confidence = 0.9,
                ReviewRequired = true,
                Entities = new VoiceCommandEntities
                {
                    MealType = FindMealType(lowerText),
                    SourceDateOffsetDays = lowerText.Contains("hom qua", StringComparison.OrdinalIgnoreCase) ? -1 : null,
                    TargetDateOffsetDays = 0,
                    QueryType = "repeat_meal"
                },
                SuggestedAction = "Thêm lại bữa ăn đã ghi",
            };
        }

        private ParsedVoiceCommand TryParseAddNote(string lowerText, string originalText)
        {
            if (!lowerText.StartsWith("ghi chu ", StringComparison.OrdinalIgnoreCase) &&
                !lowerText.StartsWith("note ", StringComparison.OrdinalIgnoreCase))
            {
                return new ParsedVoiceCommand { Intent = VoiceIntent.UNKNOWN, RawText = originalText };
            }

            var noteText = Regex.Replace(originalText.Trim(), @"^(ghi\s+ch[uú]|note)\s+", "", RegexOptions.IgnoreCase).Trim();
            noteText = Regex.Replace(noteText, @"\b(?:bữa|bua\s+)?(?:sáng|sang|trưa|trua|tối|toi|phụ|phu)\b", "", RegexOptions.IgnoreCase).Trim();
            noteText = Regex.Replace(noteText, @"\s+", " ").Trim();

            return new ParsedVoiceCommand
            {
                Intent = VoiceIntent.ADD_NOTE,
                RawText = originalText,
                Confidence = 0.9,
                ReviewRequired = true,
                Entities = new VoiceCommandEntities
                {
                    MealType = FindMealType(lowerText),
                    DateOffsetDays = FindDateOffsetDays(lowerText) ?? 0,
                    NoteText = noteText
                },
                SuggestedAction = "Ghi chú vào bữa ăn",
            };
        }

        private ParsedVoiceCommand TryParseAskNutrition(string lowerText, string originalText)
        {
            var nutrientMatch = Regex.Match(lowerText, @"\b(protein|dam|carb|carbs|fat|chat beo)\b", RegexOptions.IgnoreCase);
            if (!nutrientMatch.Success ||
                !Regex.IsMatch(lowerText, @"\b(bao nhieu|tong|duoc bao nhieu)\b", RegexOptions.IgnoreCase))
            {
                return new ParsedVoiceCommand { Intent = VoiceIntent.UNKNOWN, RawText = originalText };
            }

            var nutrient = nutrientMatch.Value switch
            {
                "dam" => "protein",
                "carbs" => "carb",
                "chat beo" => "fat",
                _ => nutrientMatch.Value
            };

            return new ParsedVoiceCommand
            {
                Intent = VoiceIntent.ASK_NUTRITION,
                RawText = originalText,
                Confidence = 0.88,
                Entities = new VoiceCommandEntities
                {
                    Nutrient = nutrient,
                    QueryScope = lowerText.Contains("tuan nay", StringComparison.OrdinalIgnoreCase) ? "week" : "day",
                    DateOffsetDays = FindDateOffsetDays(lowerText) ?? 0
                },
                SuggestedAction = "Xem dinh duong",
            };
        }

        private static FoodItem? ParseFoodPart(string part)
        {
            part = part.Trim();
            if (string.IsNullOrWhiteSpace(part))
            {
                return null;
            }

            var weightMatch = Regex.Match(part, @"^(\d+(?:[\.,]\d+)?)\s*(?:g|gram|grams)\s+(.+)$", RegexOptions.IgnoreCase);
            if (weightMatch.Success)
            {
                return new FoodItem
                {
                    FoodName = weightMatch.Groups[2].Value.Trim(),
                    Weight = decimal.Parse(weightMatch.Groups[1].Value.Replace(",", "."), CultureInfo.InvariantCulture)
                };
            }

            var quantityMatch = Regex.Match(part, @"^(\d+(?:[\.,]\d+)?)\s+(.+)$", RegexOptions.IgnoreCase);
            if (!quantityMatch.Success)
            {
                return new FoodItem
                {
                    FoodName = part,
                    Quantity = 1
                };
            }

            var quantity = decimal.Parse(quantityMatch.Groups[1].Value.Replace(",", "."), CultureInfo.InvariantCulture);
            var remainder = quantityMatch.Groups[2].Value.Trim();
            var tokens = remainder.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
            if (tokens.Length == 2 && PortionUnits.Contains(tokens[0]))
            {
                return new FoodItem
                {
                    FoodName = tokens[1].Trim(),
                    Quantity = quantity,
                    Unit = tokens[0]
                };
            }

            return new FoodItem
            {
                FoodName = remainder,
                Quantity = quantity
            };
        }

        private ParsedVoiceCommand TryParseAddFood(string lowerText, string originalText)
        {
            var normalizedMatch = Regex.Match(lowerText, @"^(?:ghi|them|an|log)\s+(.+)$", RegexOptions.IgnoreCase);
            if (normalizedMatch.Success)
            {
                var foodText = normalizedMatch.Groups[1].Value.Trim();
                var mealType = FindMealType(foodText);
                foodText = Regex.Replace(
                        foodText,
                        @"(?:\s+(?:vao|cho|trong))?\s+(?:bua\s+)?(?:sang|trua|toi|phu|snack)$",
                        "",
                        RegexOptions.IgnoreCase)
                    .Trim();

                var foods = Regex.Split(foodText, @"\s+va\s+", RegexOptions.IgnoreCase)
                    .Select(ParseFoodPart)
                    .Where(food => food is not null && !string.IsNullOrWhiteSpace(food.FoodName))
                    .Cast<FoodItem>()
                    .ToList();

                if (foods.Count > 0)
                {
                    var entities = new VoiceCommandEntities
                    {
                        MealType = mealType
                    };

                    if (foods.Count == 1)
                    {
                        entities.FoodName = foods[0].FoodName;
                        entities.Quantity = foods[0].Quantity;
                        entities.Unit = foods[0].Unit;
                        entities.Weight = foods[0].Weight;
                    }
                    else
                    {
                        entities.Foods = foods;
                    }

                    return new ParsedVoiceCommand
                    {
                        Intent = VoiceIntent.ADD_FOOD,
                        RawText = originalText,
                        Confidence = 0.88,
                        Entities = entities,
                        SuggestedAction = "Thêm món vào nhật ký",
                    };
                }
            }
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
                        QueryScope = lowerText.Contains("tuan nay", StringComparison.OrdinalIgnoreCase) ? "week" : "day",
                        QueryType = lowerText.Contains("con ", StringComparison.OrdinalIgnoreCase) ? "remaining_calories" : "total_calories",
                        DateOffsetDays = FindDateOffsetDays(lowerText) ?? 0
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
