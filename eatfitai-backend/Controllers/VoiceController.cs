/**
 * Voice Controller
 * API endpoints for Voice AI feature
 * Supports voice parsing and executing commands (ADD_FOOD to MealDiary)
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EatFitAI.DTOs;
using EatFitAI.API.DTOs.MealDiary;
using EatFitAI.Services;
using EatFitAI.API.Services.Interfaces;
using System.Security.Claims;

namespace EatFitAI.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class VoiceController : ControllerBase
    {
        private readonly IVoiceProcessingService _voiceService;
        private readonly IFoodService _foodService;
        private readonly IMealDiaryService _mealDiaryService;
        private readonly IUserService _userService;
        private readonly IAnalyticsService _analyticsService;
        private readonly ILogger<VoiceController> _logger;

        public VoiceController(
            IVoiceProcessingService voiceService,
            IFoodService foodService,
            IMealDiaryService mealDiaryService,
            IUserService userService,
            IAnalyticsService analyticsService,
            ILogger<VoiceController> logger)
        {
            _voiceService = voiceService;
            _foodService = foodService;
            _mealDiaryService = mealDiaryService;
            _userService = userService;
            _analyticsService = analyticsService;
            _logger = logger;
        }

        private Guid GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
        }

        /// <summary>
        /// Process voice text and parse intent
        /// </summary>
        [HttpPost("process")]
        public async Task<ActionResult<VoiceProcessResponse>> ProcessVoiceText([FromBody] VoiceProcessRequest request)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new VoiceProcessResponse { Success = false, Error = "Unauthorized" });
            }

            try
            {
                if (string.IsNullOrWhiteSpace(request.Text))
                {
                    return BadRequest(new VoiceProcessResponse { Success = false, Error = "Văn bản không được để trống" });
                }

                _logger.LogInformation("Processing voice text for user {UserId}: {Text}", userId, request.Text);
                var command = await _voiceService.ParseCommandAsync(request.Text, request.Language);

                return Ok(new VoiceProcessResponse
                {
                    Success = command.Intent != VoiceIntent.UNKNOWN,
                    Command = command,
                    Error = command.Intent == VoiceIntent.UNKNOWN ? "Không hiểu lệnh. Hãy thử lại với cách nói khác." : null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing voice text");
                return StatusCode(500, new VoiceProcessResponse { Success = false, Error = "Lỗi xử lý lệnh giọng nói" });
            }
        }

        /// <summary>
        /// Get supported voice commands
        /// </summary>
        [HttpGet("commands")]
        [AllowAnonymous]
        public ActionResult<object> GetSupportedCommands()
        {
            return Ok(new
            {
                supportedIntents = new[]
                {
                    new { intent = "ADD_FOOD", description = "Thêm món ăn", examples = new[] { "thêm 1 bát cơm 100g bữa trưa", "ghi phở bò bữa sáng" } },
                    new { intent = "LOG_WEIGHT", description = "Ghi cân nặng", examples = new[] { "cân nặng 65 kg" } },
                    new { intent = "ASK_CALORIES", description = "Hỏi calories", examples = new[] { "hôm nay bao nhiêu calo" } }
                },
                supportedLanguages = new[] { "vi" }
            });
        }

        /// <summary>
        /// Execute parsed voice command - actually saves to database
        /// </summary>
        [HttpPost("execute")]
        public async Task<ActionResult<VoiceProcessResponse>> ExecuteCommand([FromBody] ParsedVoiceCommand command)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new VoiceProcessResponse { Success = false, Error = "Unauthorized" });
            }

            try
            {
                _logger.LogInformation("Executing voice command for user {UserId}: {Intent}", userId, command.Intent);

                ExecutedAction? executedAction = null;
                string? error = null;

                switch (command.Intent)
                {
                    case VoiceIntent.ADD_FOOD:
                        // Kiểm tra confidence trước khi thực thi
                        if (command.Confidence < 0.5)
                        {
                            error = "Độ tin cậy thấp. Vui lòng nói rõ hơn.";
                            break;
                        }
                        (executedAction, error) = await ExecuteAddFoodAsync(userId, command);
                        break;

                    case VoiceIntent.LOG_WEIGHT:
                        // Lấy cân nặng hiện tại và trả về để FE confirm
                        if (command.Entities.Weight.HasValue && command.Entities.Weight > 0)
                        {
                            try
                            {
                                // Lấy cân nặng hiện tại của user
                                var userProfile = await _userService.GetUserProfileAsync(userId);
                                var currentWeight = userProfile?.CurrentWeightKg;
                                var newWeight = command.Entities.Weight.Value;
                                
                                // Trả về data để FE hiển thị confirm, chưa lưu
                                executedAction = new ExecutedAction
                                {
                                    Type = "LOG_WEIGHT_CONFIRM",
                                    Details = currentWeight.HasValue 
                                        ? $"Cân hiện tại: {currentWeight}kg. Cập nhật thành {newWeight}kg?"
                                        : $"Ghi cân nặng mới: {newWeight}kg?",
                                    Data = new Dictionary<string, object>
                                    {
                                        ["currentWeight"] = currentWeight ?? 0,
                                        ["newWeight"] = newWeight,
                                        ["requireConfirm"] = true
                                    }
                                };
                                _logger.LogInformation("LOG_WEIGHT confirm: current={Current}, new={New} for user {UserId}", 
                                    currentWeight, newWeight, userId);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, "Failed to get current weight");
                                error = "Không thể lấy thông tin cân nặng. Vui lòng thử lại.";
                            }
                        }
                        else
                        {
                            error = "Không tìm thấy số cân nặng trong lệnh";
                        }
                        break;

                    case VoiceIntent.ASK_CALORIES:
                        // Query DaySummary để lấy cả calories và target
                        try
                        {
                            var today = command.Entities.Date ?? DateTime.Today;
                            var daySummary = await _analyticsService.GetDaySummaryWithMealsAsync(userId, today);
                            var totalCalories = daySummary.TotalCalories;
                            var targetCalories = daySummary.TargetCalories ?? 2000;
                            
                            executedAction = new ExecutedAction
                            {
                                Type = "ASK_CALORIES",
                                Details = $"Hôm nay bạn đã tiêu thụ {totalCalories:N0} / {targetCalories:N0} kcal",
                                Data = new Dictionary<string, object>
                                {
                                    ["totalCalories"] = totalCalories,
                                    ["targetCalories"] = targetCalories,
                                    ["remaining"] = targetCalories - totalCalories,
                                    ["date"] = today.ToString("yyyy-MM-dd")
                                }
                            };
                            _logger.LogInformation("User {UserId} asked calories: {Total}/{Target}kcal", userId, totalCalories, targetCalories);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to get calories");
                            error = "Không thể lấy thông tin calories. Vui lòng thử lại.";
                        }
                        break;

                    default:
                        error = "Không hỗ trợ lệnh này";
                        break;
                }

                return Ok(new VoiceProcessResponse
                {
                    Success = executedAction != null && error == null,
                    Command = command,
                    ExecutedAction = executedAction,
                    Error = error
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing voice command");
                return StatusCode(500, new VoiceProcessResponse { Success = false, Error = "Lỗi thực thi lệnh giọng nói" });
            }
        }

        /// <summary>
        /// Confirm and save weight after user confirmation
        /// </summary>
        [HttpPost("confirm-weight")]
        public async Task<ActionResult<VoiceProcessResponse>> ConfirmWeight([FromBody] ConfirmWeightRequest request)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new VoiceProcessResponse { Success = false, Error = "Unauthorized" });
            }

            try
            {
                var bodyMetric = new EatFitAI.API.DTOs.User.BodyMetricDto
                {
                    WeightKg = request.NewWeight,
                    MeasuredDate = DateTime.Now
                };
                await _userService.RecordBodyMetricsAsync(userId, bodyMetric);
                
                _logger.LogInformation("Confirmed weight {Weight}kg for user {UserId}", request.NewWeight, userId);
                
                return Ok(new VoiceProcessResponse
                {
                    Success = true,
                    ExecutedAction = new ExecutedAction
                    {
                        Type = "LOG_WEIGHT",
                        Details = $"Đã cập nhật cân nặng: {request.NewWeight} kg",
                        Data = new Dictionary<string, object>
                        {
                            ["savedWeight"] = request.NewWeight,
                            ["savedAt"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm")
                        }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error confirming weight");
                return StatusCode(500, new VoiceProcessResponse { Success = false, Error = "Không thể lưu cân nặng" });
            }
        }

        /// <summary>
        /// Execute ADD_FOOD: Search food in DB, calculate nutrition, save to MealDiary
        /// </summary>
        private async Task<(ExecutedAction? action, string? error)> ExecuteAddFoodAsync(Guid userId, ParsedVoiceCommand command)
        {
            var foodName = command.Entities.FoodName;
            if (string.IsNullOrWhiteSpace(foodName))
            {
                return (null, "Không tìm thấy tên món ăn trong lệnh");
            }

            try
            {
            // Search for food by name
            _logger.LogInformation("Searching food: {FoodName}", foodName);
            var searchResults = await _foodService.SearchAllAsync(foodName, null, 5);
            
            if (searchResults == null || !searchResults.Any())
            {
                return (null, $"Không tìm thấy món '{foodName}' trong cơ sở dữ liệu. Hãy thử với tên khác.");
            }

            // Get best match (first result)
            var food = searchResults.First();
            
            // Calculate grams from weight or quantity
            decimal grams = 100m; // Default 100g
            if (command.Entities.Weight.HasValue && command.Entities.Weight > 0)
            {
                grams = command.Entities.Weight.Value;
            }
            else if (command.Entities.Quantity.HasValue && command.Entities.Quantity > 0)
            {
                // Assume 1 portion = 100g default
                grams = command.Entities.Quantity.Value * 100m;
            }

            // Calculate nutrition based on portion
            var factor = grams / 100m;
            var calories = food.CaloriesPer100 * factor;
            var protein = food.ProteinPer100 * factor;
            var carbs = food.CarbPer100 * factor;
            var fat = food.FatPer100 * factor;

            // Get meal type ID from enum
            var mealTypeId = ParseMealTypeEnum(command.Entities.MealType);

            // Create MealDiary entry
            var createRequest = new CreateMealDiaryRequest
            {
                EatenDate = command.Entities.Date ?? DateTime.UtcNow,
                MealTypeId = mealTypeId,
                FoodItemId = food.Source == "catalog" ? food.Id : (int?)null,
                UserFoodItemId = food.Source == "user" ? food.Id : (int?)null,
                Grams = grams,
                Calories = Math.Round(calories, 1),
                Protein = Math.Round(protein, 1),
                Carb = Math.Round(carbs, 1),
                Fat = Math.Round(fat, 1),
                Note = $"Voice AI: {command.RawText}",
                SourceMethod = "voice"  // Consistent với các source khác
            };

            var mealDiary = await _mealDiaryService.CreateMealDiaryAsync(userId, createRequest);

            _logger.LogInformation("Added food via Voice AI: {Food} ({Grams}g) to {Meal}", 
                food.FoodName, grams, GetMealLabel(command.Entities.MealType));

            return (new ExecutedAction
            {
                Type = "ADD_FOOD",
                Details = $"Đã thêm {food.FoodName} ({grams}g, {Math.Round(calories)}kcal) vào {GetMealLabel(command.Entities.MealType)}"
            }, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding food via voice");
            return (null, $"Lỗi khi thêm món ăn: {ex.Message}");
            }
        }

        /// <summary>
        /// Parse meal type enum to database ID
        /// </summary>
        private static int ParseMealTypeEnum(MealType? mealType)
        {
            return mealType switch
            {
                MealType.Breakfast => 1,
                MealType.Lunch => 2,
                MealType.Dinner => 3,
                MealType.Snack => 4,
                _ => 2 // Default lunch
            };
        }

        private static string GetMealLabel(MealType? mealType)
        {
            return mealType switch
            {
                MealType.Breakfast => "Bữa sáng",
                MealType.Lunch => "Bữa trưa",
                MealType.Dinner => "Bữa tối",
                MealType.Snack => "Bữa phụ",
                _ => "Bữa ăn"
            };
        }
    }
}
