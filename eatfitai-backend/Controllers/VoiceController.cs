/**
 * Voice Controller
 * API endpoints for Voice AI feature
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EatFitAI.DTOs;
using EatFitAI.Services;
using EatFitAI.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EatFitAI.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class VoiceController : ControllerBase
    {
        private readonly IVoiceProcessingService _voiceService;
        private readonly ApplicationDbContext _context;
        private readonly ILogger<VoiceController> _logger;

        public VoiceController(
            IVoiceProcessingService voiceService,
            ApplicationDbContext context,
            ILogger<VoiceController> logger)
        {
            _voiceService = voiceService;
            _context = context;
            _logger = logger;
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(userIdClaim, out var userId) ? userId : 0;
        }

        /// <summary>
        /// Process voice text and parse intent
        /// </summary>
        [HttpPost("process")]
        public async Task<ActionResult<VoiceProcessResponse>> ProcessVoiceText([FromBody] VoiceProcessRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Text))
                {
                    return BadRequest(new VoiceProcessResponse
                    {
                        Success = false,
                        Error = "Văn bản không được để trống"
                    });
                }

                var command = await _voiceService.ParseCommandAsync(request.Text, request.Language);

                return Ok(new VoiceProcessResponse
                {
                    Success = command.Intent != VoiceIntent.UNKNOWN,
                    Command = command,
                    Error = command.Intent == VoiceIntent.UNKNOWN 
                        ? "Không hiểu lệnh. Hãy thử lại với cách nói khác." 
                        : null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing voice text");
                return StatusCode(500, new VoiceProcessResponse
                {
                    Success = false,
                    Error = "Lỗi xử lý lệnh giọng nói"
                });
            }
        }

        /// <summary>
        /// Execute parsed voice command
        /// </summary>
        [HttpPost("execute")]
        public async Task<ActionResult<VoiceProcessResponse>> ExecuteCommand([FromBody] ParsedVoiceCommand command)
        {
            var userId = GetUserId();
            if (userId == 0)
            {
                return Unauthorized(new VoiceProcessResponse
                {
                    Success = false,
                    Error = "Unauthorized"
                });
            }

            try
            {
                switch (command.Intent)
                {
                    case VoiceIntent.ADD_FOOD:
                        return await ExecuteAddFood(userId, command);

                    case VoiceIntent.LOG_WEIGHT:
                        return await ExecuteLogWeight(userId, command);

                    case VoiceIntent.ASK_CALORIES:
                        return await ExecuteAskCalories(userId, command);

                    default:
                        return BadRequest(new VoiceProcessResponse
                        {
                            Success = false,
                            Error = "Không thể thực hiện lệnh này"
                        });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing voice command");
                return StatusCode(500, new VoiceProcessResponse
                {
                    Success = false,
                    Error = "Lỗi khi thực hiện lệnh"
                });
            }
        }

        /// <summary>
        /// Execute ADD_FOOD command
        /// </summary>
        private async Task<ActionResult<VoiceProcessResponse>> ExecuteAddFood(int userId, ParsedVoiceCommand command)
        {
            var entities = command.Entities;

            if (string.IsNullOrEmpty(entities.FoodName))
            {
                return BadRequest(new VoiceProcessResponse
                {
                    Success = false,
                    Error = "Không tìm thấy tên món ăn"
                });
            }

            // Search for food in catalog
            var foodItem = await _context.FoodItems
                .Where(f => f.Name.ToLower().Contains(entities.FoodName.ToLower()))
                .FirstOrDefaultAsync();

            if (foodItem == null)
            {
                return Ok(new VoiceProcessResponse
                {
                    Success = false,
                    Error = $"Không tìm thấy món '{entities.FoodName}' trong danh mục. Hãy thử tìm kiếm thủ công."
                });
            }

            // Create meal entry
            var date = entities.Date ?? DateTime.UtcNow.Date;
            var mealType = (int)(entities.MealType ?? MealType.Lunch);
            var grams = (int)((entities.Quantity ?? 1) * 100); // Default 100g per unit

            // Find or create meal
            var meal = await _context.Meals
                .FirstOrDefaultAsync(m => m.UserId == userId 
                    && m.Date == DateOnly.FromDateTime(date) 
                    && m.MealType == mealType);

            if (meal == null)
            {
                meal = new Models.Meal
                {
                    UserId = userId,
                    Date = DateOnly.FromDateTime(date),
                    MealType = mealType,
                    Note = "Thêm qua giọng nói"
                };
                _context.Meals.Add(meal);
                await _context.SaveChangesAsync();
            }

            // Add meal item
            var mealItem = new Models.MealItem
            {
                MealId = meal.MealId,
                FoodItemId = foodItem.FoodItemId,
                Grams = grams,
            };
            _context.MealItems.Add(mealItem);
            await _context.SaveChangesAsync();

            var mealLabel = GetMealLabel(entities.MealType ?? MealType.Lunch);
            return Ok(new VoiceProcessResponse
            {
                Success = true,
                Command = command,
                ExecutedAction = new ExecutedAction
                {
                    Type = "ADD_FOOD",
                    Details = $"Đã thêm {entities.Quantity ?? 1} {foodItem.Name} ({grams}g) vào {mealLabel}"
                }
            });
        }

        /// <summary>
        /// Execute LOG_WEIGHT command
        /// </summary>
        private async Task<ActionResult<VoiceProcessResponse>> ExecuteLogWeight(int userId, ParsedVoiceCommand command)
        {
            var entities = command.Entities;

            if (!entities.Weight.HasValue)
            {
                return BadRequest(new VoiceProcessResponse
                {
                    Success = false,
                    Error = "Không tìm thấy giá trị cân nặng"
                });
            }

            var date = entities.Date ?? DateTime.UtcNow.Date;

            // Create or update body metric
            var existingMetric = await _context.BodyMetrics
                .FirstOrDefaultAsync(b => b.UserId == userId && b.MeasuredDate == date);

            if (existingMetric != null)
            {
                existingMetric.WeightKg = entities.Weight.Value;
            }
            else
            {
                var metric = new Models.BodyMetric
                {
                    UserId = userId,
                    WeightKg = entities.Weight.Value,
                    MeasuredDate = date,
                };
                _context.BodyMetrics.Add(metric);
            }

            await _context.SaveChangesAsync();

            return Ok(new VoiceProcessResponse
            {
                Success = true,
                Command = command,
                ExecutedAction = new ExecutedAction
                {
                    Type = "LOG_WEIGHT",
                    Details = $"Đã ghi cân nặng {entities.Weight} kg"
                }
            });
        }

        /// <summary>
        /// Execute ASK_CALORIES command
        /// </summary>
        private async Task<ActionResult<VoiceProcessResponse>> ExecuteAskCalories(int userId, ParsedVoiceCommand command)
        {
            var entities = command.Entities;
            var date = entities.Date ?? DateTime.UtcNow.Date;

            // Calculate total calories for the day
            var meals = await _context.Meals
                .Include(m => m.MealItems)
                    .ThenInclude(mi => mi.FoodItem)
                .Where(m => m.UserId == userId && m.Date == DateOnly.FromDateTime(date))
                .ToListAsync();

            decimal totalCalories = 0;
            foreach (var meal in meals)
            {
                foreach (var item in meal.MealItems)
                {
                    if (item.FoodItem?.Calories != null)
                    {
                        totalCalories += (item.FoodItem.Calories * item.Grams / 100);
                    }
                }
            }

            return Ok(new VoiceProcessResponse
            {
                Success = true,
                Command = command,
                ExecutedAction = new ExecutedAction
                {
                    Type = "ASK_CALORIES",
                    Details = $"Hôm nay bạn đã ăn {Math.Round(totalCalories)} kcal"
                }
            });
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
