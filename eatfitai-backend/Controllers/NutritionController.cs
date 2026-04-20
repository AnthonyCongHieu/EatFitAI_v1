using System.Diagnostics;
using System.Security.Claims;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using EatFitAI.API.Contracts;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/ai/nutrition")]
    [Authorize]
    public sealed class NutritionController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<NutritionController> _logger;
        private readonly IAiLogService _aiLog;
        private readonly EatFitAIDbContext _db;

        public NutritionController(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<NutritionController> logger,
            IAiLogService aiLog, 
            EatFitAIDbContext db)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
            _aiLog = aiLog;
            _db = db;
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

        [HttpPost("suggest")]
        [ProducesResponseType(typeof(NutritionSuggestResponse), StatusCodes.Status200OK)]
        public async Task<ActionResult<NutritionSuggestResponse>> Suggest([FromBody] NutritionSuggestRequest req)
        {
            var sw = Stopwatch.StartNew();
            
            try
            {
                // Gọi AI Provider để tính toán bằng Ollama (không dùng công thức local)
                var aiProviderUrl = AiProviderUrlResolver.GetVisionBaseUrl(_configuration);
                
                using var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(60);
                
                var payload = new
                {
                    gender = req.Sex,
                    age = req.Age,
                    height = req.HeightCm,
                    weight = req.WeightKg,
                    activity = req.ActivityLevel switch
                    {
                        <= 1.2 => "sedentary",
                        <= 1.375 => "light",
                        <= 1.55 => "moderate",
                        <= 1.725 => "active",
                        _ => "very_active"
                    },
                    goal = req.Goal
                };
                
                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                
                _logger.LogInformation("Calling AI Provider for nutrition suggest: {Url}", $"{aiProviderUrl}/nutrition-advice");
                
                var response = await client.PostAsync($"{aiProviderUrl}/nutrition-advice", content);
                
                if (response.IsSuccessStatusCode)
                {
                    var resultJson = await response.Content.ReadAsStringAsync();
                    var result = JsonSerializer.Deserialize<JsonElement>(resultJson);
                    
                    var source = result.TryGetProperty("source", out var srcProp) ? srcProp.GetString() : "unknown";
                    _logger.LogInformation("AI Provider returned nutrition suggestion from source: {Source}", source);
                    
                    // Helper function để parse số từ JSON (handle number, double, string)
                    int ParseInt(JsonElement elem, string prop) {
                        try {
                            if (!elem.TryGetProperty(prop, out var val)) return 0;
                            
                            if (val.ValueKind == JsonValueKind.Number) {
                                // Handle cả int và double từ JSON
                                if (val.TryGetInt32(out var intVal)) return intVal;
                                if (val.TryGetDouble(out var doubleVal)) return (int)Math.Round(doubleVal);
                            }
                            if (val.ValueKind == JsonValueKind.String) {
                                var str = val.GetString()?.Replace("g", "").Replace("kcal", "").Trim();
                                if (double.TryParse(str, out var d)) return (int)Math.Round(d);
                            }
                            return 0;
                        } catch {
                            return 0;
                        }
                    }
                    
                    var cal = ParseInt(result, "calories");
                    var p = ParseInt(result, "protein");
                    var c = ParseInt(result, "carbs");
                    var f = ParseInt(result, "fat");
                    
                    // Parse explanation từ AI Provider
                    string? explanation = null;
                    if (result.TryGetProperty("explanation", out var explVal) && explVal.ValueKind == JsonValueKind.String)
                    {
                        explanation = explVal.GetString();
                    }
                    
                    var res = new NutritionSuggestResponse(cal, p, c, f, explanation);
                    sw.Stop();

                    try { await _aiLog.LogAsync(GetUserIdFromToken(), "NutritionSuggest", req, res, sw.ElapsedMilliseconds); } catch { }
                    return Ok(res);
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("AI Provider returned error: {StatusCode} - {Error}", response.StatusCode, errorContent);
                    return StatusCode(503, new { message = "Dịch vụ AI hiện không khả dụng", error = errorContent });
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Failed to connect to AI Provider");
                return StatusCode(503, new { message = "Không thể kết nối đến dịch vụ AI. Hãy đảm bảo Ollama đang chạy.", error = ex.Message });
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError(ex, "AI Provider request timed out");
                return StatusCode(504, new { message = "Dịch vụ AI phản hồi quá chậm", error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in nutrition suggest");
                return StatusCode(500, new { message = "Lỗi không xác định", error = ex.Message });
            }
        }

        [HttpPost("apply")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> Apply([FromBody] NutritionApplyRequest req)
        {
            try
            {
                var userId = GetUserIdFromToken();
                if (req.Calories <= 0 || req.Protein <= 0 || req.Carb < 0 || req.Fat <= 0)
                {
                    return BadRequest(new { message = "Mục tiêu dinh dưỡng không hợp lệ." });
                }

                var eff = req.EffectiveFrom ?? DateOnly.FromDateTime(DateTime.UtcNow.Date);

                var entity = new NutritionTarget
                {
                    UserId = userId,
                    TargetCalories = req.Calories,
                    TargetProtein = req.Protein,
                    TargetCarb = req.Carb,
                    TargetFat = req.Fat,
                    EffectiveFrom = eff,
                    EffectiveTo = null
                };
                _db.NutritionTargets.Add(entity);
                await _db.SaveChangesAsync();

                try
                {
                    await _aiLog.LogAsync(userId, "NutritionApply", req, new { id = entity.NutritionTargetId }, 0);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to persist nutrition apply AI log");
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to apply nutrition target");
                return StatusCode(500, new { message = "Không thể lưu mục tiêu dinh dưỡng.", error = ex.Message });
            }
        }

        [HttpGet("current")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetCurrent()
        {
            var userId = GetUserIdFromToken();
            var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
            var current = await _db.NutritionTargets
                .Where(t => t.UserId == userId && t.EffectiveFrom <= today && (t.EffectiveTo == null || t.EffectiveTo >= today))
                .OrderByDescending(t => t.EffectiveFrom)
                .ThenByDescending(t => t.NutritionTargetId) // Lấy record mới nhất nếu cùng ngày
                .FirstOrDefaultAsync();

            if (current == null)
            {
                return NotFound();
            }

            return Ok(new
            {
                calories = current.TargetCalories,
                protein = current.TargetProtein,
                carbs = current.TargetCarb,
                fat = current.TargetFat,
                effectiveFrom = current.EffectiveFrom
            });
        }
    }
}

