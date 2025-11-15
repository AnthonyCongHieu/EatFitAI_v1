using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Services;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/ai")]
    [Authorize]
    public class AIController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AIController> _logger;
        private readonly IAiFoodMapService _aiFoodMapService;
        private readonly IAiLogService _aiLog;

        public AIController(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<AIController> logger,
            IAiFoodMapService aiFoodMapService,
            IAiLogService aiLog)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
            _aiFoodMapService = aiFoodMapService;
            _aiLog = aiLog;
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
                var userId = GetUserIdFromToken();
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

            try
            {
                var userId = GetUserIdFromToken();
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

        [HttpPost("recipes/suggest")]
        public async Task<IActionResult> SuggestRecipes([FromBody] object request)
        {
            // TODO: Implement AI recipe suggestions based on available ingredients
            return StatusCode(501, new { message = "AI recipe suggestions not yet implemented" });
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
            if (current == null) return NotFound();
            return Ok(new { caloriesKcal = current.TargetCalories, proteinGrams = current.TargetProtein, carbohydrateGrams = current.TargetCarb, fatGrams = current.TargetFat });
        }

        [HttpPost("nutrition/recalculate")]
        public async Task<IActionResult> RecalculateNutritionTargets([FromBody] object request)
        {
            // Recalculate using provided payload or defaults
            using var scope = HttpContext.RequestServices.CreateScope();
            var calc = scope.ServiceProvider.GetRequiredService<EatFitAI.API.Services.INutritionCalcService>();
            string sex = "male"; int age = 25; double heightCm = 170; double weightKg = 65; double activity = 1.38; string goal = "maintain";
            try
            {
                if (request is JsonElement je && je.ValueKind == JsonValueKind.Object)
                {
                    if (je.TryGetProperty("sex", out var v) && v.ValueKind == JsonValueKind.String) sex = v.GetString() ?? sex;
                    if (je.TryGetProperty("age", out v) && v.TryGetInt32(out var i)) age = i;
                    if (je.TryGetProperty("heightCm", out v) && v.TryGetDouble(out var d)) heightCm = d;
                    if (je.TryGetProperty("weightKg", out v) && v.TryGetDouble(out d)) weightKg = d;
                    if (je.TryGetProperty("activityLevel", out v) && v.TryGetDouble(out d)) activity = d;
                    if (je.TryGetProperty("goal", out v) && v.ValueKind == JsonValueKind.String) goal = v.GetString() ?? goal;
                }
            }
            catch { }
            var (cal, p, c, f) = calc.Suggest(sex, age, heightCm, weightKg, activity, goal);
            return Ok(new { calories = cal, protein = p, carbs = c, fat = f });
        }

        [HttpPost("nutrition-targets")]
        public async Task<IActionResult> SetNutritionTargets([FromBody] object request)
        {
            var userId = GetUserIdFromToken();
            int? calories = null, protein = null, carbs = null, fat = null;
            try
            {
                if (request is JsonElement je && je.ValueKind == JsonValueKind.Object)
                {
                    if (je.TryGetProperty("caloriesKcal", out var v) && v.TryGetInt32(out var i)) calories = i;
                    if (je.TryGetProperty("proteinGrams", out v) && v.TryGetInt32(out i)) protein = i;
                    if (je.TryGetProperty("carbohydrateGrams", out v) && v.TryGetInt32(out i)) carbs = i;
                    if (je.TryGetProperty("fatGrams", out v) && v.TryGetInt32(out i)) fat = i;
                }
            }
            catch { }
            if (calories is null || protein is null || carbs is null || fat is null)
            {
                return BadRequest(new { message = "Invalid payload" });
            }
            using var scope = HttpContext.RequestServices.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<EatFitAI.API.DbScaffold.Data.EatFitAIDbContext>();
            var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
            var entity = new EatFitAI.API.DbScaffold.Models.NutritionTarget
            {
                UserId = userId,
                TargetCalories = calories.Value,
                TargetProtein = protein.Value,
                TargetCarb = carbs.Value,
                TargetFat = fat.Value,
                EffectiveFrom = today,
                EffectiveTo = null
            };
            db.NutritionTargets.Add(entity);
            await db.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("vision/ingredients")]
        public async Task<IActionResult> DetectIngredientsFromImage([FromBody] object request)
        {
            // Backward-compatible placeholder
            return StatusCode(501, new { message = "Use POST /api/ai/vision/detect (multipart/form-data)" });
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

        [HttpPost("labels/teach")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> TeachLabel([FromBody] TeachLabelRequestDto request, CancellationToken cancellationToken)
        {
            await _aiFoodMapService.TeachLabelAsync(request, cancellationToken);
            return NoContent();
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
    }
}
