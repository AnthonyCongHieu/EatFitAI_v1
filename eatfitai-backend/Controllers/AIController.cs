using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Helpers;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/ai")]
    [Authorize]
    [EnableRateLimiting("AIPolicy")]
    public class AIController : ControllerBase
    {
        private static readonly HashSet<string> AllowedVisionImageExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp"
        };

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AIController> _logger;
        private readonly IAiFoodMapService _aiFoodMapService;
        private readonly IAiCorrectionService _aiCorrectionService;
        private readonly IAiHealthService _aiHealthService;
        private readonly IAiLogService _aiLog;
        private readonly IRecipeSuggestionService _recipeSuggestionService;
        private readonly INutritionInsightService _nutritionInsightService;
        private readonly INutritionCalcService _nutritionCalcService;
        private readonly IVisionCacheService _visionCacheService;
        private readonly IMemoryCache _cache;

        public AIController(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<AIController> logger,
            IAiFoodMapService aiFoodMapService,
            IAiCorrectionService aiCorrectionService,
            IAiHealthService aiHealthService,
            IAiLogService aiLog,
            IRecipeSuggestionService recipeSuggestionService,
            INutritionInsightService nutritionInsightService,
            INutritionCalcService nutritionCalcService,
            IVisionCacheService visionCacheService,
            IMemoryCache cache)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
            _aiFoodMapService = aiFoodMapService;
            _aiCorrectionService = aiCorrectionService;
            _aiHealthService = aiHealthService;
            _aiLog = aiLog;
            _recipeSuggestionService = recipeSuggestionService;
            _nutritionInsightService = nutritionInsightService;
            _nutritionCalcService = nutritionCalcService;
            _visionCacheService = visionCacheService;
            _cache = cache;
        }

        [HttpPost("vision/detect")]
        [RequestSizeLimit(25_000_000)]
        [Consumes("application/json")]
        [ProducesResponseType(typeof(EatFitAI.API.DTOs.AI.VisionDetectResultDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<EatFitAI.API.DTOs.AI.VisionDetectResultDto>> DetectVision([FromBody] DetectVisionRequest input)
        {
            var userId = GetUserIdFromToken();
            if (!TryResolveVisionObjectKey(input, userId, out var objectKey))
            {
                return BadRequest(new { error = "invalid_image_reference" });
            }

            if (!TryBuildPublicMediaUrl(objectKey, out var imageUrl))
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    error = "media_storage_not_configured",
                    message = "Media public base URL is not configured."
                });
            }

            var imageHash = $"{userId:N}:{(string.IsNullOrWhiteSpace(input.ImageHash) ? objectKey : input.ImageHash.Trim())}";

            // Check cache first
            var cachedResult = await _visionCacheService.GetCachedDetectionAsync(imageHash);
            if (cachedResult != null)
            {
                _logger.LogInformation("Returning cached detection for user {UserId}, hash: {Hash}", userId, imageHash);
                var refreshedCachedResult = await RefreshVisionMappingAsync(cachedResult, HttpContext.RequestAborted);
                try
                {
                    await _visionCacheService.CacheDetectionAsync(imageHash, refreshedCachedResult, userId, HttpContext.RequestAborted);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to refresh cached detection mapping");
                }

                return Ok(refreshedCachedResult);
            }

            var aiStatus = _aiHealthService.GetStatus();
            if (ShouldBlockVisionDetection(aiStatus))
            {
                _logger.LogWarning("Skipping vision detection because AI provider is DOWN and health state is fresh. Message: {Message}", aiStatus.Message);
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    error = "ai_provider_down",
                    code = "ai_provider_down",
                    message = "AI provider hiện đang DOWN. Không thể nhận diện ảnh lúc này.",
                    requestId = HttpContext.TraceIdentifier
                });
            }

            var baseUrl = AiProviderUrlResolver.GetVisionBaseUrl(_configuration);
            var url = $"{baseUrl}/detect";

            using var client = _httpClientFactory.CreateClient();
            var payload = new { image_url = imageUrl };
            var content = new StringContent(JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");

            HttpResponseMessage response;
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = content
                };
                AiProviderRequestHelper.AddInternalTokenHeader(request, _configuration, _logger);
                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(HttpContext.RequestAborted);
                timeoutCts.CancelAfter(GetVisionDetectTimeout());
                response = await client.SendAsync(request, timeoutCts.Token);
            }
            catch (OperationCanceledException ex) when (!HttpContext.RequestAborted.IsCancellationRequested)
            {
                _logger.LogWarning(ex, "AI provider detect timed out for {Url}", url);
                return StatusCode(
                    StatusCodes.Status504GatewayTimeout,
                    ErrorResponseHelper.SafeError("ai-provider_timeout", "Khong the xu ly anh tu dich vu AI.", HttpContext));
            }
            catch (HttpRequestException ex)
            {
                _logger.LogWarning(ex, "AI provider detect request failed for {Url}", url);
                return StatusCode(
                    StatusCodes.Status503ServiceUnavailable,
                    ErrorResponseHelper.SafeError("ai-provider_error", "Khong the xu ly anh tu dich vu AI.", HttpContext));
            }

            using var resp = response;
            var body = await resp.Content.ReadAsStringAsync(HttpContext.RequestAborted);
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "AI provider detect failed with status {StatusCode}. Body length={BodyLength}",
                    (int)resp.StatusCode,
                    body.Length);
                return StatusCode(
                    (int)resp.StatusCode,
                    ErrorResponseHelper.SafeError("ai-provider_error", "Khong the xu ly anh tu dich vu AI.", HttpContext));
            }
            List<EatFitAI.API.DTOs.AI.VisionDetectionDto> detections;
            try
            {
                detections = ParseDetections(body);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse AI provider response");
                return BadRequest(new { error = "invalid_ai_response" });
            }

            try
            {
                var summary = ExtractDetectionSummary(body);
                _logger.LogInformation("AILog Detect vision: user={UserId} items={Items} rawCount={Count}", userId, string.Join(", ", summary.labelsWithConf), summary.count);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "AILog parse failure");
            }

            var items = await _aiFoodMapService.MapDetectionsAsync(detections, HttpContext.RequestAborted);
            var result = new EatFitAI.API.DTOs.AI.VisionDetectResultDto
            {
                Items = items,
                UnmappedLabels = items
                    .Where(x => !x.IsMatched)
                    .Select(x => x.Label)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList()
            };

            // Cache the result
            try
            {
                await _visionCacheService.CacheDetectionAsync(imageHash, result, userId);
                _logger.LogDebug("Cached detection result for hash: {Hash}", imageHash);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to cache detection result");
            }

            try
            {
                var logPayload = new
                {
                    Image = new
                    {
                        ImageUrl = imageUrl,
                        ObjectKey = objectKey,
                        ImageHash = imageHash
                    },
                    RawDetections = detections,
                    MappedItems = result.Items,
                    result.UnmappedLabels
                };

                await _aiLog.LogAsync(userId, "VisionDetect", logPayload, result, 0);
            }
            catch
            {
            }

            return Ok(result);
        }

        [HttpGet("status")]
        [ProducesResponseType(typeof(AiHealthStatusDto), StatusCodes.Status200OK)]
        public ActionResult<AiHealthStatusDto> GetAiStatus()
        {
            return Ok(_aiHealthService.GetStatus());
        }

        /// <summary>
        /// Get recipe suggestions based on available ingredients (database-only)
        /// </summary>
        [HttpPost("recipes/suggest")]
        [ProducesResponseType(typeof(List<RecipeSuggestionDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<List<RecipeSuggestionDto>>> SuggestRecipes(
            [FromBody] RecipeSuggestionRequest request,
            CancellationToken cancellationToken)
        {
            try
            {
                var userId = GetUserIdFromToken();
                
                _logger.LogInformation("User {UserId} requesting recipe suggestions with {Count} ingredients",
                    userId, request.AvailableIngredients?.Count ?? 0);

                request.UserId = userId; // Gán UserId để service lấy sở thích
                var recipes = await _recipeSuggestionService.SuggestRecipesAsync(request, cancellationToken);

                await LogAiActivityBestEffortAsync(
                    userId,
                    "RecipeSuggestion",
                    request,
                    new { RecipeCount = recipes.Count });

                return Ok(recipes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error suggesting recipes");
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi gợi ý công thức", HttpContext));
            }
        }

        /// <summary>
        /// Get detailed information about a specific recipe
        /// </summary>
        [HttpGet("recipes/{recipeId}")]
        [ProducesResponseType(typeof(RecipeDetailDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<RecipeDetailDto>> GetRecipeDetail(
            int recipeId,
            CancellationToken cancellationToken)
        {
            try
            {
                var recipe = await _recipeSuggestionService.GetRecipeDetailAsync(recipeId, cancellationToken);

                if (recipe == null)
                {
                    return NotFound(new { message = "Không tìm thấy công thức" });
                }

                return Ok(recipe);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting recipe detail for RecipeId {RecipeId}", recipeId);
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi lấy chi tiết công thức", HttpContext));
            }
        }

        [HttpGet("nutrition-targets/current")]
    public async Task<IActionResult> GetCurrentNutritionTargets()
    {
        var userId = GetUserIdFromToken();
        using var scope = HttpContext.RequestServices.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EatFitAI.API.DbScaffold.Data.EatFitAIDbContext>();
        var today = DateTimeHelper.GetVietnamToday();
        var current = await db.NutritionTargets
            .Where(t => t.UserId == userId && t.EffectiveFrom <= today && (t.EffectiveTo == null || t.EffectiveTo >= today))
            .OrderByDescending(t => t.EffectiveFrom)
            .FirstOrDefaultAsync();
        
        // Defaults based on standard nutrition guidelines
        int caloriesKcal = 2000;
        int proteinGrams = 50;
        int carbohydrateGrams = 250;
        int fatGrams = 65;
        
        // CHỈ sử dụng giá trị từ DB nếu record tồn tại VÀ có giá trị khác 0
        if (current != null && current.TargetCalories > 0)
        {
            caloriesKcal = current.TargetCalories;
            proteinGrams = current.TargetProtein > 0 ? current.TargetProtein : proteinGrams;
            carbohydrateGrams = current.TargetCarb > 0 ? current.TargetCarb : carbohydrateGrams;
            fatGrams = current.TargetFat > 0 ? current.TargetFat : fatGrams;
        }
        
        return Ok(new { caloriesKcal, proteinGrams, carbohydrateGrams, fatGrams });
    }    

        [HttpPost("nutrition/recalculate")]
        public async Task<IActionResult> RecalculateNutritionTargets([FromBody] RecalculateTargetRequest request)
        {
            IActionResult BuildOfflineFallback(string reason)
            {
                var activityLevel = request.ActivityLevel is > 0 ? request.ActivityLevel.Value : 1.55;
                var (calories, protein, carbs, fat) = _nutritionCalcService.Suggest(
                    request.Sex ?? "male",
                    request.Age ?? 25,
                    request.HeightCm ?? 170,
                    request.WeightKg ?? 65,
                    activityLevel,
                    request.Goal ?? "maintain");

                _logger.LogWarning(
                    "Nutrition recalculate fallback activated. Reason: {Reason}, ActivityLevel: {ActivityLevel}",
                    reason,
                    activityLevel);

                return Ok(new
                {
                    calories,
                    protein,
                    carbs,
                    fat,
                    source = "formula",
                    offlineMode = true,
                    explanation = "AI tạm thời không khả dụng. EatFitAI đã dùng công thức Mifflin-St Jeor để tính mục tiêu tạm thời.",
                    message = reason,
                });
            }

            try
            {
                // Gọi AI Provider để tính mục tiêu dinh dưỡng bằng provider AI hiện tại.
                var aiStatus = _aiHealthService.GetStatus();
                if (string.Equals(aiStatus.State, AiHealthState.Down.ToString().ToUpperInvariant(), StringComparison.Ordinal))
                {
                    return BuildOfflineFallback("AI Provider đang DOWN, đã chuyển sang công thức offline.");
                }

                var aiProviderUrl = AiProviderUrlResolver.GetVisionBaseUrl(_configuration);
                
                using var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(60); // Ollama có thể mất thời gian
                
                var payload = new
                {
                    gender = request.Sex ?? "male",
                    age = request.Age ?? 25,
                    height = request.HeightCm ?? 170,
                    weight = request.WeightKg ?? 65,
                    activity = MapActivityLevelToProviderLabel(request.ActivityLevel),
                    goal = request.Goal ?? "maintain"
                };
                
                var json = System.Text.Json.JsonSerializer.Serialize(payload);
                var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
                
                _logger.LogInformation("Calling AI Provider for nutrition advice: {Url}", $"{aiProviderUrl}/nutrition-advice");
                
                HttpResponseMessage response;
                try
                {
                    using var providerRequest = new HttpRequestMessage(HttpMethod.Post, $"{aiProviderUrl}/nutrition-advice")
                    {
                        Content = content
                    };
                    AiProviderRequestHelper.AddInternalTokenHeader(providerRequest, _configuration, _logger);
                    response = await client.SendAsync(providerRequest, HttpContext.RequestAborted);
                }
                catch (HttpRequestException ex)
                {
                    _logger.LogError(ex, "Failed to connect to AI Provider");
                    return BuildOfflineFallback("Không thể kết nối đến dịch vụ AI. Đã chuyển sang công thức offline.");
                }
                catch (TaskCanceledException ex)
                {
                    _logger.LogError(ex, "AI Provider request timed out");
                    return BuildOfflineFallback("Dịch vụ AI phản hồi quá chậm. Đã chuyển sang công thức offline.");
                }

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync(HttpContext.RequestAborted);
                    _logger.LogWarning(
                        "AI Provider nutrition advice returned error: {StatusCode} - {Error}",
                        response.StatusCode,
                        errorContent);

                    if (AiProviderRequestHelper.IsInternalAuthFailure(response.StatusCode, errorContent))
                    {
                        return StatusCode(
                            StatusCodes.Status503ServiceUnavailable,
                            ErrorResponseHelper.SafeError(
                                "ai-provider_auth_error",
                                "Dich vu AI chua duoc cau hinh an toan.",
                                HttpContext));
                    }

                    return BuildOfflineFallback("Dịch vụ AI hiện không khả dụng, đã chuyển sang công thức offline.");
                }
                
                if (response.IsSuccessStatusCode)
                {
                    var resultJson = await response.Content.ReadAsStringAsync();
                    var result = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(resultJson);
                    
                    var source = result.TryGetProperty("source", out var srcProp) ? srcProp.GetString() : "unknown";
                    var offlineMode =
                        result.TryGetProperty("offlineMode", out var offlineProp) &&
                        offlineProp.ValueKind is System.Text.Json.JsonValueKind.True or System.Text.Json.JsonValueKind.False
                            ? offlineProp.GetBoolean()
                            : !string.Equals(source, "gemini", StringComparison.OrdinalIgnoreCase);
                    var explanation =
                        result.TryGetProperty("explanation", out var expProp) ? expProp.GetString() : null;
                    var message =
                        result.TryGetProperty("message", out var msgProp) ? msgProp.GetString() : null;
                    _logger.LogInformation("AI Provider returned nutrition advice from source: {Source}", source);
                    
                    // Helper function để parse số từ JSON (handle number, double, string)
                    int ParseInt(System.Text.Json.JsonElement elem, string prop) {
                        try {
                            if (!elem.TryGetProperty(prop, out var val)) return 0;
                            
                            if (val.ValueKind == System.Text.Json.JsonValueKind.Number) {
                                if (val.TryGetInt32(out var intVal)) return intVal;
                                if (val.TryGetDouble(out var doubleVal)) return (int)Math.Round(doubleVal);
                            }
                            if (val.ValueKind == System.Text.Json.JsonValueKind.String) {
                                var str = val.GetString()?.Replace("g", "").Replace("kcal", "").Trim();
                                if (double.TryParse(str, out var d)) return (int)Math.Round(d);
                            }
                            return 0;
                        } catch {
                            return 0;
                        }
                    }
                    
                    var calories = ParseInt(result, "calories");
                    var protein = ParseInt(result, "protein");
                    var carbs = ParseInt(result, "carbs");
                    var fat = ParseInt(result, "fat");

                    if (calories <= 0 || protein <= 0 || carbs < 0 || fat <= 0)
                    {
                        return BuildOfflineFallback("AI trả dữ liệu không hợp lệ, đã chuyển sang công thức offline.");
                    }

                    return Ok(new
                    {
                        calories,
                        protein,
                        carbs,
                        fat,
                        source = source,
                        offlineMode = offlineMode,
                        explanation = explanation,
                        message = message
                    });
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("AI Provider returned error: {StatusCode} - {Error}", response.StatusCode, errorContent);
                    return StatusCode(503, ErrorResponseHelper.SafeError("ai-provider_error", "Dịch vụ AI hiện không khả dụng", HttpContext));
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Failed to connect to AI Provider");
                return StatusCode(503, ErrorResponseHelper.SafeError("ai-provider_error", "Không thể kết nối đến dịch vụ AI.", HttpContext));
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError(ex, "AI Provider request timed out");
                return StatusCode(504, ErrorResponseHelper.SafeError("ai-provider_timeout", "Dịch vụ AI phản hồi quá chậm", HttpContext));
            }
        }

        /// <summary>
        /// Get personalized nutrition insights based on eating history
        /// </summary>
        [HttpPost("nutrition/insights")]
        [ProducesResponseType(typeof(NutritionInsightDto), StatusCodes.Status200OK)]
        public async Task<ActionResult<NutritionInsightDto>> GetNutritionInsights(
            [FromBody] NutritionInsightRequest request,
            CancellationToken cancellationToken)
        {
            try
            {
                var userId = GetUserIdFromToken();
                
                _logger.LogInformation("User {UserId} requesting nutrition insights for {Days} days", 
                    userId, request.AnalysisDays);

                var insights = await _nutritionInsightService.GetPersonalizedInsightsAsync(
                    userId, request, cancellationToken);

                await LogAiActivityBestEffortAsync(userId, "NutritionInsight", request, new
                {
                    AdherenceScore = insights.AdherenceScore,
                    RecommendationCount = insights.Recommendations.Count
                });

                return Ok(insights);
            }
            catch (InvalidOperationException)
            {
                _logger.LogWarning("No nutrition target found for user");
                return BadRequest(ErrorResponseHelper.SafeError("Chưa thiết lập mục tiêu dinh dưỡng", HttpContext));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating nutrition insights");
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi tạo phân tích dinh dưỡng", HttpContext));
            }
        }

        /// <summary>
        /// Get adaptive nutrition target suggestions
        /// </summary>
        [HttpPost("nutrition/adaptive-target")]
        [ProducesResponseType(typeof(AdaptiveTargetDto), StatusCodes.Status200OK)]
        public async Task<ActionResult<AdaptiveTargetDto>> GetAdaptiveTarget(
            [FromBody] AdaptiveTargetRequest request,
            CancellationToken cancellationToken)
        {
            try
            {
                var userId = GetUserIdFromToken();
                
                _logger.LogInformation("User {UserId} requesting adaptive nutrition target", userId);

                var adaptiveTarget = await _nutritionInsightService.GetAdaptiveTargetAsync(
                    userId, request, cancellationToken);

                await LogAiActivityBestEffortAsync(userId, "AdaptiveTarget", request, new
                {
                    ConfidenceScore = adaptiveTarget.ConfidenceScore,
                    Applied = adaptiveTarget.Applied
                });

                return Ok(adaptiveTarget);
            }
            catch (InvalidOperationException)
            {
                _logger.LogWarning("No nutrition target found for user");
                return BadRequest(ErrorResponseHelper.SafeError("Chưa thiết lập mục tiêu dinh dưỡng", HttpContext));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating adaptive target");
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi tính mục tiêu thích ứng", HttpContext));
            }
        }

        /// <summary>
        /// Apply adaptive nutrition target
        /// </summary>
        [HttpPost("nutrition/apply-target")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> ApplyAdaptiveTarget(
            [FromBody] NutritionTargetDto newTarget,
            CancellationToken cancellationToken)
        {
            try
            {
                var userId = GetUserIdFromToken();
                
                _logger.LogInformation("User {UserId} applying new nutrition target", userId);

                await _nutritionInsightService.ApplyAdaptiveTargetAsync(userId, newTarget, cancellationToken);

                await LogAiActivityBestEffortAsync(userId, "ApplyTarget", newTarget, new { Success = true });

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error applying nutrition target");
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi áp dụng mục tiêu", HttpContext));
            }
        }

        /// <summary>
        /// Get detection history for current user
        /// </summary>
        [HttpPost("vision/history")]
        [ProducesResponseType(typeof(List<DetectionHistoryDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<List<DetectionHistoryDto>>> GetDetectionHistory(
            [FromBody] DetectionHistoryRequest request,
            CancellationToken cancellationToken)
        {
            try
            {
                var userId = GetUserIdFromToken();
                
                _logger.LogInformation("User {UserId} requesting detection history for {Days} days", 
                    userId, request.Days);

                var history = await _visionCacheService.GetDetectionHistoryAsync(
                    userId, request, cancellationToken);

                return Ok(history);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving detection history");
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi lấy lịch sử", HttpContext));
            }
        }

        /// <summary>
        /// Get statistics about unmapped labels
        /// </summary>
        [HttpGet("vision/unmapped-stats")]
        [ProducesResponseType(typeof(Dictionary<string, int>), StatusCodes.Status200OK)]
        public async Task<ActionResult<Dictionary<string, int>>> GetUnmappedLabelsStats(
            [FromQuery] int days = 30,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var userId = GetUserIdFromToken();
                
                _logger.LogInformation("User {UserId} requesting unmapped labels stats for {Days} days", 
                    userId, days);

                var stats = await _visionCacheService.GetUnmappedLabelsStatsAsync(
                    userId, days, cancellationToken);

                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving unmapped labels stats");
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi lấy thống kê", HttpContext));
            }
        }

        /// <summary>
        /// Get food item suggestions for an unmapped label
        /// </summary>
        [HttpGet("vision/suggest-mapping/{label}")]
        [ProducesResponseType(typeof(List<FoodItemSuggestionDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<List<FoodItemSuggestionDto>>> SuggestFoodItemsForLabel(
            string label,
            CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Suggesting food items for label: {Label}", label);

                var suggestions = await _visionCacheService.SuggestFoodItemsForLabelAsync(
                    label, cancellationToken);

                return Ok(suggestions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error suggesting food items for label");
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi gợi ý món ăn", HttpContext));
            }
        }

        private Guid GetUserIdFromToken()
        {
            var userIdClaim = User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value
                            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                throw new UnauthorizedAccessException("Token người dùng không hợp lệ");
            }

            return userId;
        }

        private bool TryResolveVisionObjectKey(
            DetectVisionRequest input,
            Guid userId,
            out string objectKey)
        {
            objectKey = string.Empty;
            var requestedObjectKey = input.ObjectKey;

            if (string.IsNullOrWhiteSpace(requestedObjectKey)
                && !string.IsNullOrWhiteSpace(input.ImageUrl)
                && !TryExtractObjectKeyFromConfiguredMediaUrl(input.ImageUrl, out requestedObjectKey))
            {
                return false;
            }

            if (string.IsNullOrWhiteSpace(requestedObjectKey)
                || !TryNormalizeObjectKey(requestedObjectKey, out var normalizedObjectKey)
                || !IsUserVisionObjectKey(normalizedObjectKey, userId))
            {
                return false;
            }

            objectKey = normalizedObjectKey;
            return true;
        }

        private bool TryExtractObjectKeyFromConfiguredMediaUrl(string imageUrl, out string objectKey)
        {
            objectKey = string.Empty;

            if (!TryGetPublicMediaBaseUri(out var baseUri)
                || !Uri.TryCreate(imageUrl.Trim(), UriKind.Absolute, out var uri)
                || !string.Equals(uri.Scheme, baseUri.Scheme, StringComparison.OrdinalIgnoreCase)
                || !string.Equals(uri.Host, baseUri.Host, StringComparison.OrdinalIgnoreCase)
                || uri.Port != baseUri.Port
                || !string.IsNullOrEmpty(uri.Query)
                || !string.IsNullOrEmpty(uri.Fragment))
            {
                return false;
            }

            var basePath = baseUri.AbsolutePath.EndsWith("/", StringComparison.Ordinal)
                ? baseUri.AbsolutePath
                : $"{baseUri.AbsolutePath}/";

            if (!uri.AbsolutePath.StartsWith(basePath, StringComparison.Ordinal))
            {
                return false;
            }

            objectKey = Uri.UnescapeDataString(uri.AbsolutePath[basePath.Length..]).TrimStart('/');
            return true;
        }

        private bool TryBuildPublicMediaUrl(string objectKey, out string imageUrl)
        {
            imageUrl = string.Empty;
            if (!TryGetPublicMediaBaseUri(out var baseUri))
            {
                return false;
            }

            var encodedObjectKey = Uri.EscapeDataString(objectKey)
                .Replace("%2F", "/", StringComparison.Ordinal);
            imageUrl = $"{baseUri.ToString().TrimEnd('/')}/{encodedObjectKey}";
            return true;
        }

        private bool TryGetPublicMediaBaseUri(out Uri baseUri)
        {
            baseUri = null!;
            var publicBaseUrl = _configuration["Media:PublicBaseUrl"];

            if (string.IsNullOrWhiteSpace(publicBaseUrl)
                || !Uri.TryCreate(publicBaseUrl.Trim().TrimEnd('/') + "/", UriKind.Absolute, out var parsedBaseUri)
                || !string.Equals(parsedBaseUri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            baseUri = parsedBaseUri;
            return true;
        }

        private static bool TryNormalizeObjectKey(string value, out string objectKey)
        {
            objectKey = string.Empty;
            try
            {
                objectKey = Uri.UnescapeDataString(value.Trim()).Trim('/');
            }
            catch (Exception)
            {
                return false;
            }

            if (objectKey.Length == 0
                || objectKey.Length > 512
                || objectKey.Contains('\\')
                || objectKey.Contains("//", StringComparison.Ordinal)
                || objectKey.Split('/').Any(segment => segment is "." or ".."))
            {
                objectKey = string.Empty;
                return false;
            }

            return true;
        }

        private static bool IsUserVisionObjectKey(string objectKey, Guid userId)
        {
            return objectKey.StartsWith($"vision/{userId:N}/", StringComparison.Ordinal)
                && AllowedVisionImageExtensions.Contains(Path.GetExtension(objectKey));
        }

        private async Task LogAiActivityBestEffortAsync(
            Guid userId,
            string action,
            object? input,
            object? output,
            long durationMs = 0)
        {
            try
            {
                await _aiLog.LogAsync(userId, action, input, output, durationMs);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "AI activity log failed for action {Action}; preserving user-facing API response.",
                    action);
            }
        }

        /// <summary>
        /// Get AI-generated cooking instructions for a recipe
        /// Proxy to AI Provider (Ollama) with caching
        /// </summary>
        [HttpPost("cooking-instructions")]
        [ProducesResponseType(typeof(CookingInstructionsDto), StatusCodes.Status200OK)]
        public async Task<ActionResult<CookingInstructionsDto>> GetCookingInstructions(
            [FromBody] CookingInstructionsRequest request,
            CancellationToken cancellationToken)
        {
            try
            {
                var userId = GetUserIdFromToken();
                _logger.LogInformation("User {UserId} requesting cooking instructions for: {Recipe}", 
                    userId, request.RecipeName);

                // Check cache first (cache key based on recipe name)
                var cacheKey = $"CookingInstructions:{request.RecipeName?.ToLowerInvariant()}";
                if (_cache.TryGetValue(cacheKey, out CookingInstructionsDto? cachedResult) && cachedResult != null)
                {
                    _logger.LogInformation("Cache HIT for cooking instructions: {Recipe}", request.RecipeName);
                    return Ok(cachedResult);
                }

                var aiProviderUrl = AiProviderUrlResolver.GetVisionBaseUrl(_configuration);
                
                using var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(60);
                
                var payload = new
                {
                    recipeName = request.RecipeName,
                    ingredients = request.Ingredients,
                    description = request.Description ?? ""
                };
                
                var json = System.Text.Json.JsonSerializer.Serialize(payload);
                var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

                using var providerRequest = new HttpRequestMessage(HttpMethod.Post, $"{aiProviderUrl}/cooking-instructions")
                {
                    Content = content
                };
                AiProviderRequestHelper.AddInternalTokenHeader(providerRequest, _configuration, _logger);
                var response = await client.SendAsync(providerRequest, cancellationToken);
                
                if (response.IsSuccessStatusCode)
                {
                    var resultJson = await response.Content.ReadAsStringAsync(cancellationToken);
                    var result = System.Text.Json.JsonSerializer.Deserialize<CookingInstructionsDto>(resultJson,
                        new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    
                    // Cache for 1 hour (cooking instructions don't change)
                    if (result != null)
                    {
                        _cache.Set(cacheKey, result, TimeSpan.FromHours(1));
                        _logger.LogInformation("Cached cooking instructions for: {Recipe}", request.RecipeName);
                    }
                    
                    return Ok(result ?? new CookingInstructionsDto());
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogWarning("AI Provider cooking-instructions error: {StatusCode} - {Error}", 
                        response.StatusCode, errorContent);
                    return StatusCode(503, ErrorResponseHelper.SafeError("ai-provider_error", "Dịch vụ AI hiện không khả dụng", HttpContext));
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Failed to connect to AI Provider for cooking instructions");
                return StatusCode(503, ErrorResponseHelper.SafeError("ai-provider_error", "Không thể kết nối đến dịch vụ AI", HttpContext));
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError(ex, "AI Provider cooking-instructions request timed out");
                return StatusCode(504, ErrorResponseHelper.SafeError("ai-provider_timeout", "Dịch vụ AI phản hồi quá chậm", HttpContext));
            }
        }

        [HttpPost("labels/teach")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> TeachLabel([FromBody] TeachLabelRequestDto request, CancellationToken cancellationToken)
        {
            await _aiFoodMapService.TeachLabelAsync(request, cancellationToken);

            var userId = GetUserIdFromToken();

            try
            {
                await _aiCorrectionService.LogTeachLabelCorrectionAsync(userId, request, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to persist teach-label correction event");
            }

            try
            {
                var normalizedLabel = request.Label.Trim().ToLowerInvariant();
                var minConfidence = request.MinConfidence ?? 0.60m;

                await _aiLog.LogAsync(
                    userId,
                    "TeachLabelCorrection",
                    request,
                    new
                    {
                        request.Label,
                        NormalizedLabel = normalizedLabel,
                        request.FoodItemId,
                        MinConfidence = minConfidence,
                        request.DetectedConfidence,
                        request.SelectedFoodName,
                        request.Source,
                        request.ClientTimestamp,
                        SavedAtUtc = DateTime.UtcNow,
                        Success = true
                    },
                    0);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to persist teach-label correction log");
            }

            return NoContent();
        }

        [HttpPost("corrections")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> LogCorrection([FromBody] AiCorrectionRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Label))
            {
                return BadRequest(new { message = "Label is required" });
            }

            var userId = GetUserIdFromToken();
            await _aiCorrectionService.LogCorrectionAsync(userId, request, cancellationToken);
            return NoContent();
        }

        [HttpGet("corrections/stats")]
        [ProducesResponseType(typeof(AiCorrectionStatsDto), StatusCodes.Status200OK)]
        public async Task<ActionResult<AiCorrectionStatsDto>> GetCorrectionStats(CancellationToken cancellationToken)
        {
            var userId = GetUserIdFromToken();
            var stats = await _aiCorrectionService.GetStatsAsync(userId, cancellationToken);
            return Ok(stats);
        }

        private static (int count, List<string> labelsWithConf) ExtractDetectionSummary(string json)
        {
            var labels = new List<string>();
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("detections", out var dets) && dets.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in dets.EnumerateArray())
                {
                    var label = item.TryGetProperty("label", out var l) ? l.GetString() : null;
                    var conf = item.TryGetProperty("confidence", out var c) ? c.GetDouble() : (double?)null;
                    if (!string.IsNullOrEmpty(label) && conf.HasValue)
                    {
                        labels.Add($"{label}:{conf.Value:F2}");
                    }
                }
                return (labels.Count, labels);
            }
            else if (doc.RootElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in doc.RootElement.EnumerateArray())
                {
                    var label = item.TryGetProperty("label", out var l) ? l.GetString() : null;
                    var conf = item.TryGetProperty("confidence", out var c) ? c.GetDouble() : (double?)null;
                    if (!string.IsNullOrEmpty(label) && conf.HasValue)
                    {
                        labels.Add($"{label}:{conf.Value:F2}");
                    }
                }
                return (labels.Count, labels);
            }
            return (0, labels);
        }

        private static List<EatFitAI.API.DTOs.AI.VisionDetectionDto> ParseDetections(string json)
        {
            using var doc = JsonDocument.Parse(json);
            var list = new List<EatFitAI.API.DTOs.AI.VisionDetectionDto>();

            JsonElement arrayElem;
            if (doc.RootElement.TryGetProperty("detections", out var dets) && dets.ValueKind == JsonValueKind.Array)
            {
                arrayElem = dets;
            }
            else if (doc.RootElement.ValueKind == JsonValueKind.Array)
            {
                arrayElem = doc.RootElement;
            }
            else
            {
                throw new FormatException("Unexpected AI response format");
            }

            foreach (var item in arrayElem.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object) continue;
                var label = item.TryGetProperty("label", out var l) && l.ValueKind == JsonValueKind.String ? l.GetString() : null;
                var conf = item.TryGetProperty("confidence", out var c) && (c.ValueKind == JsonValueKind.Number) ? (float)c.GetDouble() : (float?)null;
                if (!string.IsNullOrWhiteSpace(label) && conf.HasValue)
                {
                    list.Add(new EatFitAI.API.DTOs.AI.VisionDetectionDto { Label = label!, Confidence = conf.Value });
                }
            }

            return list;
        }

        private bool ShouldBlockVisionDetection(AiHealthStatusDto aiStatus)
        {
            if (!string.Equals(aiStatus.State, AiHealthState.Down.ToString(), StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (!aiStatus.LastCheckedAt.HasValue)
            {
                return false;
            }

            return DateTimeOffset.UtcNow - aiStatus.LastCheckedAt.Value <= GetVisionHealthGateFreshnessWindow();
        }

        private async Task<EatFitAI.API.DTOs.AI.VisionDetectResultDto> RefreshVisionMappingAsync(
            EatFitAI.API.DTOs.AI.VisionDetectResultDto cachedResult,
            CancellationToken cancellationToken)
        {
            var detections = cachedResult.Items
                .Where(item => !string.IsNullOrWhiteSpace(item.Label))
                .Select(item => new EatFitAI.API.DTOs.AI.VisionDetectionDto
                {
                    Label = item.Label,
                    Confidence = item.Confidence
                })
                .ToList();

            if (detections.Count == 0)
            {
                return cachedResult;
            }

            var items = await _aiFoodMapService.MapDetectionsAsync(detections, cancellationToken);
            return new EatFitAI.API.DTOs.AI.VisionDetectResultDto
            {
                Items = items,
                UnmappedLabels = items
                    .Where(item => !item.IsMatched)
                    .Select(item => item.Label)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList()
            };
        }

        private TimeSpan GetVisionHealthGateFreshnessWindow()
        {
            var configuredSeconds = _configuration.GetValue<int?>("AIProvider:HealthGateFreshnessSeconds");
            return configuredSeconds.HasValue && configuredSeconds.Value > 0
                ? TimeSpan.FromSeconds(configuredSeconds.Value)
                : TimeSpan.FromSeconds(60);
        }

        private TimeSpan GetVisionDetectTimeout()
        {
            var configuredMilliseconds = _configuration.GetValue<int?>("AIProvider:VisionDetectTimeoutMilliseconds");
            if (configuredMilliseconds.HasValue && configuredMilliseconds.Value > 0)
            {
                return TimeSpan.FromMilliseconds(configuredMilliseconds.Value);
            }

            var configuredSeconds = _configuration.GetValue<int?>("AIProvider:VisionDetectTimeoutSeconds");
            return configuredSeconds.HasValue && configuredSeconds.Value > 0
                ? TimeSpan.FromSeconds(configuredSeconds.Value)
                : TimeSpan.FromSeconds(35);
        }

        private static string MapActivityLevelToProviderLabel(double? activityLevel)
        {
            var factor = activityLevel is > 0 ? activityLevel.Value : 1.55;

            if (factor < 1.3)
            {
                return "sedentary";
            }

            if (factor < 1.5)
            {
                return "light";
            }

            if (factor < 1.7)
            {
                return "moderate";
            }

            if (factor < 1.9)
            {
                return "active";
            }

            return "very_active";
        }

        /// <summary>
        /// Compute MD5 hash of image content for caching
        /// </summary>
        private string ComputeImageHash(IFormFile file)
        {
            using var md5 = System.Security.Cryptography.MD5.Create();
            using var stream = file.OpenReadStream();
            var hashBytes = md5.ComputeHash(stream);
            return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
        }
    }
}

