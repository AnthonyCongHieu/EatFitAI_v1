using System.Security.Claims;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Controllers;

/// <summary>
/// AI Review Controller - Intelligent weekly reviews
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AIReviewController : ControllerBase
{
    private readonly AIReviewService _reviewService;
    private readonly INutritionInsightService _nutritionInsightService;
    private readonly EatFitAIDbContext _db;
    private readonly ILogger<AIReviewController> _logger;

    public AIReviewController(
        AIReviewService reviewService,
        INutritionInsightService nutritionInsightService,
        EatFitAIDbContext db,
        ILogger<AIReviewController> logger)
    {
        _reviewService = reviewService;
        _nutritionInsightService = nutritionInsightService;
        _db = db;
        _logger = logger;
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }

    /// <summary>
    /// Check if AI review should trigger
    /// </summary>
    [HttpGet("check-trigger")]
    public async Task<ActionResult<ReviewTriggerDto>> CheckTrigger()
    {
        try
        {
            var userId = GetUserId();
            if (userId == Guid.Empty) return Unauthorized();

            _logger.LogInformation("[AIReview] Checking trigger for user {UserId}", userId);

            var trigger = await _reviewService.CheckReviewTrigger(userId);
            return Ok(trigger);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AIReview] Error checking trigger");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get weekly AI review
    /// </summary>
    [HttpGet("weekly")]
    public async Task<ActionResult<WeeklyReviewDto>> GetWeeklyReview()
    {
        try
        {
            var userId = GetUserId();
            if (userId == Guid.Empty) return Unauthorized();

            _logger.LogInformation("[AIReview] Getting weekly review for user {UserId}", userId);

            var review = await _reviewService.AnalyzeWeeklyProgress(userId);
            return Ok(review);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AIReview] Error getting review");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Apply AI suggestions (auto-update targets)
    /// </summary>
    [HttpPost("apply-suggestions")]
    public async Task<IActionResult> ApplySuggestions([FromBody] ApplySuggestionsRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var userId = GetUserId();
            if (userId == Guid.Empty) return Unauthorized();

            _logger.LogInformation("[AIReview] Applying suggestions for user {UserId}", userId);

            var currentTarget = await _db.NutritionTargets
                .Where(target => target.UserId == userId)
                .OrderByDescending(target => target.EffectiveFrom)
                .ThenByDescending(target => target.NutritionTargetId)
                .FirstOrDefaultAsync(cancellationToken);

            var calories = request.NewTargetCalories
                ?? currentTarget?.TargetCalories
                ?? 0;
            var macros = request.NewMacros ?? new Dictionary<string, int>();

            int ReadMacro(int fallback, params string[] keys)
            {
                foreach (var key in keys)
                {
                    if (macros.TryGetValue(key, out var value) && value > 0)
                    {
                        return value;
                    }
                }

                return fallback;
            }

            var target = new NutritionTargetDto
            {
                TargetCalories = calories,
                TargetProtein = ReadMacro(currentTarget?.TargetProtein ?? 0, "protein", "proteins"),
                TargetCarbs = ReadMacro(currentTarget?.TargetCarb ?? 0, "carb", "carbs"),
                TargetFat = ReadMacro(currentTarget?.TargetFat ?? 0, "fat")
            };

            if (target.TargetCalories <= 0 || target.TargetProtein <= 0 || target.TargetCarbs < 0 || target.TargetFat <= 0)
            {
                return BadRequest(new { message = "Thiếu dữ liệu mục tiêu dinh dưỡng hợp lệ để áp dụng." });
            }

            await _nutritionInsightService.ApplyAdaptiveTargetAsync(userId, target, cancellationToken);

            return Ok(new
            {
                message = "Đã áp dụng gợi ý thành công",
                target = new
                {
                    calories = target.TargetCalories,
                    protein = target.TargetProtein,
                    carbs = target.TargetCarbs,
                    fat = target.TargetFat
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AIReview] Error applying suggestions");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

public class ApplySuggestionsRequest
{
    public int? NewTargetCalories { get; set; }
    public Dictionary<string, int>? NewMacros { get; set; }
}
