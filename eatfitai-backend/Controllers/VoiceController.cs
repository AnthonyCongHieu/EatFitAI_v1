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
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

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
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<VoiceController> _logger;

        public VoiceController(
            IVoiceProcessingService voiceService,
            IFoodService foodService,
            IMealDiaryService mealDiaryService,
            IUserService userService,
            IAnalyticsService analyticsService,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<VoiceController> logger)
        {
            _voiceService = voiceService;
            _foodService = foodService;
            _mealDiaryService = mealDiaryService;
            _userService = userService;
            _analyticsService = analyticsService;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        private Guid GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
        }

        private string GetVoiceProviderBaseUrl()
        {
            return _configuration["AIProvider:VoiceBaseUrl"]
                ?? _configuration["AIProvider:VisionBaseUrl"]
                ?? "http://127.0.0.1:5050";
        }

        /// <summary>
        /// Proxy voice text parsing to external AI provider.
        /// </summary>
        [HttpPost("parse")]
        public async Task<IActionResult> ParseWithProvider(
            [FromBody] VoiceProcessRequest request,
            CancellationToken cancellationToken)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { error = "Unauthorized" });
            }

            if (string.IsNullOrWhiteSpace(request.Text))
            {
                return BadRequest(new { error = "Text is required" });
            }

            try
            {
                var providerUrl = $"{GetVoiceProviderBaseUrl().TrimEnd('/')}/voice/parse";
                using var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(60);

                var payload = JsonSerializer.Serialize(new
                {
                    text = request.Text,
                    language = string.IsNullOrWhiteSpace(request.Language) ? "vi" : request.Language
                });

                using var content = new StringContent(payload, Encoding.UTF8, "application/json");
                using var response = await client.PostAsync(providerUrl, content, cancellationToken);
                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "Voice parse proxy failed for user {UserId}. Status={StatusCode}, Body={Body}",
                        userId,
                        (int)response.StatusCode,
                        responseBody);

                    return StatusCode((int)response.StatusCode, new
                    {
                        error = "voice_provider_error",
                        detail = responseBody
                    });
                }

                _logger.LogInformation("Voice parse proxy succeeded for user {UserId}", userId);
                return Content(
                    responseBody,
                    response.Content.Headers.ContentType?.ToString() ?? "application/json");
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Voice parse proxy could not reach AI provider");
                return StatusCode(503, new
                {
                    error = "voice_provider_unavailable",
                    detail = ex.Message
                });
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError(ex, "Voice parse proxy timed out");
                return StatusCode(504, new
                {
                    error = "voice_provider_timeout",
                    detail = ex.Message
                });
            }
        }

        /// <summary>
        /// Proxy audio transcription to external AI provider.
        /// </summary>
        [HttpPost("transcribe")]
        [RequestSizeLimit(25_000_000)]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> TranscribeWithProvider(
            [FromForm] IFormFile? audio,
            CancellationToken cancellationToken)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { error = "Unauthorized" });
            }

            if (audio == null || audio.Length == 0)
            {
                return BadRequest(new
                {
                    success = false,
                    error = "Audio file is required"
                });
            }

            try
            {
                var providerUrl = $"{GetVoiceProviderBaseUrl().TrimEnd('/')}/voice/transcribe";
                using var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(120);

                using var content = new MultipartFormDataContent();
                await using var stream = audio.OpenReadStream();
                using var streamContent = new StreamContent(stream);
                streamContent.Headers.ContentType = new MediaTypeHeaderValue(
                    audio.ContentType ?? "application/octet-stream");
                content.Add(streamContent, "audio", audio.FileName);

                using var response = await client.PostAsync(providerUrl, content, cancellationToken);
                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "Voice transcribe proxy failed for user {UserId}. Status={StatusCode}, Body={Body}",
                        userId,
                        (int)response.StatusCode,
                        responseBody);

                    return StatusCode((int)response.StatusCode, new
                    {
                        success = false,
                        error = "voice_provider_error",
                        detail = responseBody
                    });
                }

                _logger.LogInformation(
                    "Voice transcribe proxy succeeded for user {UserId} with file {FileName}",
                    userId,
                    audio.FileName);

                return Content(
                    responseBody,
                    response.Content.Headers.ContentType?.ToString() ?? "application/json");
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Voice transcribe proxy could not reach AI provider");
                return StatusCode(503, new
                {
                    success = false,
                    error = "voice_provider_unavailable",
                    detail = ex.Message
                });
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError(ex, "Voice transcribe proxy timed out");
                return StatusCode(504, new
                {
                    success = false,
                    error = "voice_provider_timeout",
                    detail = ex.Message
                });
            }
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
                    return BadRequest(new VoiceProcessResponse { Success = false, Error = "VÃ„Æ’n bÃ¡ÂºÂ£n khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c Ã„â€˜Ã¡Â»Æ’ trÃ¡Â»â€˜ng" });
                }

                _logger.LogInformation("Processing voice text for user {UserId}: {Text}", userId, request.Text);
                var command = await _voiceService.ParseCommandAsync(request.Text, request.Language);

                return Ok(new VoiceProcessResponse
                {
                    Success = command.Intent != VoiceIntent.UNKNOWN,
                    Command = command,
                    Error = command.Intent == VoiceIntent.UNKNOWN ? "KhÃƒÂ´ng hiÃ¡Â»Æ’u lÃ¡Â»â€¡nh. HÃƒÂ£y thÃ¡Â»Â­ lÃ¡ÂºÂ¡i vÃ¡Â»â€ºi cÃƒÂ¡ch nÃƒÂ³i khÃƒÂ¡c." : null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing voice text");
                return StatusCode(500, new VoiceProcessResponse { Success = false, Error = "LÃ¡Â»â€”i xÃ¡Â»Â­ lÃƒÂ½ lÃ¡Â»â€¡nh giÃ¡Â»Âng nÃƒÂ³i" });
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
                    new { intent = "ADD_FOOD", description = "ThÃƒÂªm mÃƒÂ³n Ã„Æ’n", examples = new[] { "thÃƒÂªm 1 bÃƒÂ¡t cÃ†Â¡m 100g bÃ¡Â»Â¯a trÃ†Â°a", "ghi phÃ¡Â»Å¸ bÃƒÂ² bÃ¡Â»Â¯a sÃƒÂ¡ng" } },
                    new { intent = "LOG_WEIGHT", description = "Ghi cÃƒÂ¢n nÃ¡ÂºÂ·ng", examples = new[] { "cÃƒÂ¢n nÃ¡ÂºÂ·ng 65 kg" } },
                    new { intent = "ASK_CALORIES", description = "HÃ¡Â»Âi calories", examples = new[] { "hÃƒÂ´m nay bao nhiÃƒÂªu calo" } }
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
                        // KiÃ¡Â»Æ’m tra confidence trÃ†Â°Ã¡Â»â€ºc khi thÃ¡Â»Â±c thi
                        if (command.Confidence < 0.5)
                        {
                            error = "Ã„ÂÃ¡Â»â„¢ tin cÃ¡ÂºÂ­y thÃ¡ÂºÂ¥p. Vui lÃƒÂ²ng nÃƒÂ³i rÃƒÂµ hÃ†Â¡n.";
                            break;
                        }
                        (executedAction, error) = await ExecuteAddFoodAsync(userId, command);
                        break;

                    case VoiceIntent.LOG_WEIGHT:
                        // LÃ¡ÂºÂ¥y cÃƒÂ¢n nÃ¡ÂºÂ·ng hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i vÃƒÂ  trÃ¡ÂºÂ£ vÃ¡Â»Â Ã„â€˜Ã¡Â»Æ’ FE confirm
                        if (command.Entities.Weight.HasValue && command.Entities.Weight > 0)
                        {
                            try
                            {
                                // LÃ¡ÂºÂ¥y cÃƒÂ¢n nÃ¡ÂºÂ·ng hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i cÃ¡Â»Â§a user
                                var userProfile = await _userService.GetUserProfileAsync(userId);
                                var currentWeight = userProfile?.CurrentWeightKg;
                                var newWeight = command.Entities.Weight.Value;
                                
                                // TrÃ¡ÂºÂ£ vÃ¡Â»Â data Ã„â€˜Ã¡Â»Æ’ FE hiÃ¡Â»Æ’n thÃ¡Â»â€¹ confirm, chÃ†Â°a lÃ†Â°u
                                executedAction = new ExecutedAction
                                {
                                    Type = "LOG_WEIGHT_CONFIRM",
                                    Details = currentWeight.HasValue 
                                        ? $"CÃƒÂ¢n hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i: {currentWeight}kg. CÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t thÃƒÂ nh {newWeight}kg?"
                                        : $"Ghi cÃƒÂ¢n nÃ¡ÂºÂ·ng mÃ¡Â»â€ºi: {newWeight}kg?",
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
                                error = "KhÃƒÂ´ng thÃ¡Â»Æ’ lÃ¡ÂºÂ¥y thÃƒÂ´ng tin cÃƒÂ¢n nÃ¡ÂºÂ·ng. Vui lÃƒÂ²ng thÃ¡Â»Â­ lÃ¡ÂºÂ¡i.";
                            }
                        }
                        else
                        {
                            error = "KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y sÃ¡Â»â€˜ cÃƒÂ¢n nÃ¡ÂºÂ·ng trong lÃ¡Â»â€¡nh";
                        }
                        break;

                    case VoiceIntent.ASK_CALORIES:
                        // Query DaySummary Ã„â€˜Ã¡Â»Æ’ lÃ¡ÂºÂ¥y cÃ¡ÂºÂ£ calories vÃƒÂ  target
                        try
                        {
                            var today = command.Entities.Date ?? DateTime.Today;
                            var daySummary = await _analyticsService.GetDaySummaryWithMealsAsync(userId, today);
                            var totalCalories = daySummary.TotalCalories;
                            var targetCalories = daySummary.TargetCalories ?? 2000;
                            
                            executedAction = new ExecutedAction
                            {
                                Type = "ASK_CALORIES",
                                Details = $"HÃƒÂ´m nay bÃ¡ÂºÂ¡n Ã„â€˜ÃƒÂ£ tiÃƒÂªu thÃ¡Â»Â¥ {totalCalories:N0} / {targetCalories:N0} kcal",
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
                            error = "KhÃƒÂ´ng thÃ¡Â»Æ’ lÃ¡ÂºÂ¥y thÃƒÂ´ng tin calories. Vui lÃƒÂ²ng thÃ¡Â»Â­ lÃ¡ÂºÂ¡i.";
                        }
                        break;

                    default:
                        error = "KhÃƒÂ´ng hÃ¡Â»â€” trÃ¡Â»Â£ lÃ¡Â»â€¡nh nÃƒÂ y";
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
                return StatusCode(500, new VoiceProcessResponse { Success = false, Error = "LÃ¡Â»â€”i thÃ¡Â»Â±c thi lÃ¡Â»â€¡nh giÃ¡Â»Âng nÃƒÂ³i" });
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
                        Details = $"Ã„ÂÃƒÂ£ cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t cÃƒÂ¢n nÃ¡ÂºÂ·ng: {request.NewWeight} kg",
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
                return StatusCode(500, new VoiceProcessResponse { Success = false, Error = "KhÃƒÂ´ng thÃ¡Â»Æ’ lÃ†Â°u cÃƒÂ¢n nÃ¡ÂºÂ·ng" });
            }
        }

        /// <summary>
        /// Execute ADD_FOOD: Search food in DB, calculate nutrition, save to MealDiary
        /// HÃ¡Â»â€” trÃ¡Â»Â£ cÃ¡ÂºÂ£ 1 mÃƒÂ³n (FoodName) vÃƒÂ  nhiÃ¡Â»Âu mÃƒÂ³n (Foods array)
        /// </summary>
        private async Task<(ExecutedAction? action, string? error)> ExecuteAddFoodAsync(Guid userId, ParsedVoiceCommand command)
        {
            try
            {
                var mealTypeId = ParseMealTypeEnum(command.Entities.MealType);
                var eatenDate = command.Entities.Date ?? DateTime.UtcNow;
                var addedFoods = new List<string>();
                decimal totalCalories = 0;

                // Case 1: NhiÃ¡Â»Âu mÃƒÂ³n Ã„Æ’n (Foods array)
                if (command.Entities.Foods != null && command.Entities.Foods.Count > 0)
                {
                    _logger.LogInformation("Processing {Count} foods from voice command", command.Entities.Foods.Count);
                    
                    foreach (var foodItem in command.Entities.Foods)
                    {
                        if (string.IsNullOrWhiteSpace(foodItem.FoodName))
                            continue;

                        var result = await AddSingleFoodAsync(userId, foodItem.FoodName, 
                            foodItem.Weight ?? foodItem.Quantity ?? 100m, 
                            mealTypeId, eatenDate, command.RawText);
                        
                        if (result.success)
                        {
                            addedFoods.Add($"{result.foodName} ({result.grams}g)");
                            totalCalories += result.calories;
                        }
                        else
                        {
                            _logger.LogWarning("Could not find food: {FoodName}", foodItem.FoodName);
                        }
                    }
                }
                // Case 2: MÃ¡Â»â„¢t mÃƒÂ³n Ã„Æ’n (FoodName Ã„â€˜Ã†Â¡n lÃ¡ÂºÂ»)
                else if (!string.IsNullOrWhiteSpace(command.Entities.FoodName))
                {
                    var grams = command.Entities.Weight ?? (command.Entities.Quantity ?? 1) * 100m;
                    var result = await AddSingleFoodAsync(userId, command.Entities.FoodName, 
                        grams, mealTypeId, eatenDate, command.RawText);
                    
                    if (result.success)
                    {
                        addedFoods.Add($"{result.foodName} ({result.grams}g)");
                        totalCalories = result.calories;
                    }
                    else
                    {
                        return (null, $"KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y mÃƒÂ³n '{command.Entities.FoodName}' trong cÃ†Â¡ sÃ¡Â»Å¸ dÃ¡Â»Â¯ liÃ¡Â»â€¡u.");
                    }
                }
                else
                {
                    return (null, "KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y tÃƒÂªn mÃƒÂ³n Ã„Æ’n trong lÃ¡Â»â€¡nh");
                }

                if (addedFoods.Count == 0)
                {
                    return (null, "KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y mÃƒÂ³n Ã„Æ’n nÃƒÂ o trong cÃ†Â¡ sÃ¡Â»Å¸ dÃ¡Â»Â¯ liÃ¡Â»â€¡u. HÃƒÂ£y thÃ¡Â»Â­ vÃ¡Â»â€ºi tÃƒÂªn khÃƒÂ¡c.");
                }

                var details = addedFoods.Count == 1
                    ? $"Ã„ÂÃƒÂ£ thÃƒÂªm {addedFoods[0]} ({Math.Round(totalCalories)}kcal) vÃƒÂ o {GetMealLabel(command.Entities.MealType)}"
                    : $"Ã„ÂÃƒÂ£ thÃƒÂªm {addedFoods.Count} mÃƒÂ³n ({Math.Round(totalCalories)}kcal) vÃƒÂ o {GetMealLabel(command.Entities.MealType)}: {string.Join(", ", addedFoods)}";

                return (new ExecutedAction
                {
                    Type = "ADD_FOOD",
                    Details = details,
                    Data = new Dictionary<string, object>
                    {
                        ["addedCount"] = addedFoods.Count,
                        ["totalCalories"] = totalCalories,
                        ["foods"] = addedFoods
                    }
                }, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding food via voice");
                return (null, $"LÃ¡Â»â€”i khi thÃƒÂªm mÃƒÂ³n Ã„Æ’n: {ex.Message}");
            }
        }

        /// <summary>
        /// Helper: ThÃƒÂªm 1 mÃƒÂ³n Ã„Æ’n vÃƒÂ o MealDiary
        /// </summary>
        private async Task<(bool success, string foodName, decimal grams, decimal calories)> AddSingleFoodAsync(
            Guid userId, string foodName, decimal grams, int mealTypeId, DateTime eatenDate, string rawText)
        {
            // Search for food by name
            _logger.LogInformation("Searching food: {FoodName}", foodName);
            var searchResults = await _foodService.SearchAllAsync(foodName, null, 5);
            
            if (searchResults == null || !searchResults.Any())
            {
                return (false, foodName, 0, 0);
            }

            // Get best match (first result)
            var food = searchResults.First();
            
            // Calculate nutrition based on portion
            var factor = grams / 100m;
            var calories = food.CaloriesPer100 * factor;
            var protein = food.ProteinPer100 * factor;
            var carbs = food.CarbPer100 * factor;
            var fat = food.FatPer100 * factor;

            // Create MealDiary entry
            var createRequest = new CreateMealDiaryRequest
            {
                EatenDate = eatenDate,
                MealTypeId = mealTypeId,
                FoodItemId = food.Source == "catalog" ? food.Id : (int?)null,
                UserFoodItemId = food.Source == "user" ? food.Id : (int?)null,
                Grams = grams,
                Calories = Math.Round(calories, 1),
                Protein = Math.Round(protein, 1),
                Carb = Math.Round(carbs, 1),
                Fat = Math.Round(fat, 1),
                Note = $"Voice AI: {rawText}",
                SourceMethod = "voice"
            };

            await _mealDiaryService.CreateMealDiaryAsync(userId, createRequest);
            
            _logger.LogInformation("Added food via Voice AI: {Food} ({Grams}g, {Calories}kcal)", 
                food.FoodName, grams, Math.Round(calories));

            return (true, food.FoodName, grams, calories);
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
                MealType.Breakfast => "BÃ¡Â»Â¯a sÃƒÂ¡ng",
                MealType.Lunch => "BÃ¡Â»Â¯a trÃ†Â°a",
                MealType.Dinner => "BÃ¡Â»Â¯a tÃ¡Â»â€˜i",
                MealType.Snack => "BÃ¡Â»Â¯a phÃ¡Â»Â¥",
                _ => "BÃ¡Â»Â¯a Ã„Æ’n"
            };
        }
    }
}

