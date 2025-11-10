using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using EatFitAI.API.DTOs.AI;

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

        public AIController(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<AIController> logger)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        [HttpPost("vision/detect")]
        [RequestSizeLimit(25_000_000)]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> DetectVision(DetectVisionRequest input)
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
            return Content(body, "application/json");
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
            // TODO: Get current nutrition targets for the user
            var userId = GetUserIdFromToken();
            return StatusCode(501, new { message = "Get current nutrition targets not yet implemented" });
        }

        [HttpPost("nutrition/recalculate")]
        public async Task<IActionResult> RecalculateNutritionTargets([FromBody] object request)
        {
            // TODO: Recalculate nutrition targets based on user data
            var userId = GetUserIdFromToken();
            return StatusCode(501, new { message = "Nutrition target recalculation not yet implemented" });
        }

        [HttpPost("nutrition-targets")]
        public async Task<IActionResult> SetNutritionTargets([FromBody] object request)
        {
            // TODO: Set custom nutrition targets for the user
            var userId = GetUserIdFromToken();
            return StatusCode(501, new { message = "Set nutrition targets not yet implemented" });
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
            return (0, labels);
        }
    }
}
