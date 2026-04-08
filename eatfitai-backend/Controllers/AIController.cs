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
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AIController> _logger;
        private readonly IAiFoodMapService _aiFoodMapService;
        private readonly IAiCorrectionService _aiCorrectionService;
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
            _aiLog = aiLog;
            _recipeSuggestionService = recipeSuggestionService;
            _nutritionInsightService = nutritionInsightService;
            _nutritionCalcService = nutritionCalcService;
            _visionCacheService = visionCacheService;
            _cache = cache;
        }

        [HttpPost("vision/detect")]
        [RequestSizeLimit(25_000_000)]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(EatFitAI.API.DTOs.AI.VisionDetectResultDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<EatFitAI.API.DTOs.AI.VisionDetectResultDto>> DetectVision(DetectVisionRequest input)
        {
            var file = input.File;
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { error = "no file" });
            }

            // Compute image hash for caching
            var imageHash = ComputeImageHash(file);
            var userId = GetUserIdFromToken();

            // Check cache first
            var cachedResult = await _visionCacheService.GetCachedDetectionAsync(imageHash);
            if (cachedResult != null)
            {
                _logger.LogInformation("Returning cached detection for user {UserId}, hash: {Hash}", userId, imageHash);
                return Ok(cachedResult);
            }

            var baseUrl = _configuration["AIProvider:VisionBaseUrl"] ?? "http://127.0.0.1:5050";
            var url = $"{baseUrl.TrimEnd('/')}/detect";

            using var client = _httpClientFactory.CreateClient();
            using var content = new MultipartFormDataContent();
            await using var stream = file.OpenReadStream();
            var streamContent = new StreamContent(stream);
            streamContent.Headers.ContentType = new MediaTypeHeaderValue(file.ContentType ?? "application/octet-stream");
            content.Add(streamContent, "file", file.FileName);

            using var resp = await client.PostAsync(url, content);
            var body = await resp.Content.ReadAsStringAsync();
            if (!resp.IsSuccessStatusCode)
            {
                return StatusCode((int)resp.StatusCode, new { error = "ai-provider_error", detail = body });
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
                        FileName = file.FileName,
                        ContentType = file.ContentType,
                        Size = file.Length
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

                // Log AI activity
                await _aiLog.LogAsync(userId, "RecipeSuggestion", request, new { RecipeCount = recipes.Count }, 0);

                return Ok(recipes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error suggesting recipes");
                return StatusCode(500, new { message = "An error occurred while suggesting recipes", error = ex.Message });
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
                    return NotFound(new { message = "Recipe not found" });
                }

                return Ok(recipe);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting recipe detail for RecipeId {RecipeId}", recipeId);
                return StatusCode(500, new { message = "An error occurred while retrieving recipe detail", error = ex.Message });
            }
        }

        [HttpGet("nutrition-targets/current")]
    public async Task<IActionResult> GetCurrentNutritionTargets()
    {
        var userId = GetUserIdFromToken();
        using var scope = HttpContext.RequestServices.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EatFitAI.API.DbScaffold.Data.EatFitAIDbContext>();
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
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
                // Gọi AI Provider để tính toán bằng Ollama (không dùng công thức local)
                var aiProviderUrl = _configuration["AIProvider:VisionBaseUrl"] ?? "http://127.0.0.1:5050";
                
                using var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(60); // Ollama có thể mất thời gian
                
                var payload = new
                {
                    gender = request.Sex ?? "male",
                    age = request.Age ?? 25,
                    height = request.HeightCm ?? 170,
                    weight = request.WeightKg ?? 65,
                    activity = request.Goal?.ToLower() == "cut" ? "moderate" : 
                              request.Goal?.ToLower() == "bulk" ? "active" : "moderate",
                    goal = request.Goal ?? "maintain"
                };
                
                var json = System.Text.Json.JsonSerializer.Serialize(payload);
                var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
                
                _logger.LogInformation("Calling AI Provider for nutrition advice: {Url}", $"{aiProviderUrl}/nutrition-advice");
                
                HttpResponseMessage response;
                try
                {
                    response = await client.PostAsync($"{aiProviderUrl}/nutrition-advice", content);
                }
                catch (HttpRequestException ex)
                {
                    _logger.LogError(ex, "Failed to connect to AI Provider");
                    return BuildOfflineFallback("Không thể kết nối đến AI Provider. Đã chuyển sang công thức offline.");
                }
                catch (TaskCanceledException ex)
                {
                    _logger.LogError(ex, "AI Provider request timed out");
                    return BuildOfflineFallback("AI Provider timeout. Đã chuyển sang công thức offline.");
                }

                if (!response.IsSuccessStatusCode)
                {
                    return BuildOfflineFallback("AI Provider không khả dụng, đã chuyển sang công thức offline.");
                }
                
                if (response.IsSuccessStatusCode)
                {
                    var resultJson = await response.Content.ReadAsStringAsync();
                    var result = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(resultJson);
                    
                    var source = result.TryGetProperty("source", out var srcProp) ? srcProp.GetString() : "unknown";
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
                        offlineMode = false,
                        explanation = result.TryGetProperty("explanation", out var expProp) ? expProp.GetString() : null
                    });
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("AI Provider returned error: {StatusCode} - {Error}", response.StatusCode, errorContent);
                    return StatusCode(503, new { message = "AI Provider không khả dụng", error = errorContent });
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Failed to connect to AI Provider");
                return StatusCode(503, new { message = "Không thể kết nối đến AI Provider. Hãy đảm bảo Ollama đang chạy.", error = ex.Message });
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError(ex, "AI Provider request timed out");
                return StatusCode(504, new { message = "AI Provider timeout", error = ex.Message });
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

                // Log AI activity
                await _aiLog.LogAsync(userId, "NutritionInsight", request, new { 
                    AdherenceScore = insights.AdherenceScore,
                    RecommendationCount = insights.Recommendations.Count
                }, 0);

                return Ok(insights);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "No nutrition target found for user");
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating nutrition insights");
                return StatusCode(500, new { message = "An error occurred while generating insights", error = ex.Message });
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

                // Log AI activity
                await _aiLog.LogAsync(userId, "AdaptiveTarget", request, new {
                    ConfidenceScore = adaptiveTarget.ConfidenceScore,
                    Applied = adaptiveTarget.Applied
                }, 0);

                return Ok(adaptiveTarget);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "No nutrition target found for user");
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating adaptive target");
                return StatusCode(500, new { message = "An error occurred while calculating adaptive target", error = ex.Message });
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

                // Log AI activity
                await _aiLog.LogAsync(userId, "ApplyTarget", newTarget, new { Success = true }, 0);

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error applying nutrition target");
                return StatusCode(500, new { message = "An error occurred while applying target", error = ex.Message });
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
                return StatusCode(500, new { message = "An error occurred while retrieving history", error = ex.Message });
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
                return StatusCode(500, new { message = "An error occurred while retrieving stats", error = ex.Message });
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
                return StatusCode(500, new { message = "An error occurred while suggesting items", error = ex.Message });
            }
        }

        private Guid GetUserIdFromToken()
        {
            var userIdClaim = User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value
                            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                throw new UnauthorizedAccessException("Invalid user token");
            }

            return userId;
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

                var aiProviderUrl = _configuration["AIProvider:VisionBaseUrl"] ?? "http://127.0.0.1:5050";
                
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
                
                var response = await client.PostAsync($"{aiProviderUrl}/cooking-instructions", content, cancellationToken);
                
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
                    return StatusCode(503, new { message = "AI Provider không khả dụng", error = errorContent });
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Failed to connect to AI Provider for cooking instructions");
                return StatusCode(503, new { message = "Không thể kết nối đến AI Provider", error = ex.Message });
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError(ex, "AI Provider cooking-instructions request timed out");
                return StatusCode(504, new { message = "AI Provider timeout", error = ex.Message });
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
