using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EatFitAI.API.DTOs;
using EatFitAI.API.Services;
using System.Security.Claims;

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
    private readonly ILogger<AIReviewController> _logger;

    public AIReviewController(AIReviewService reviewService, ILogger<AIReviewController> logger)
    {
        _reviewService = reviewService;
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
    public ActionResult ApplySuggestions([FromBody] ApplySuggestionsRequest request)
    {
        try
        {
            var userId = GetUserId();
            if (userId == Guid.Empty) return Unauthorized();

            _logger.LogInformation("[AIReview] Applying suggestions for user {UserId}", userId);

            // TODO: Implement auto-apply logic
            // Update nutrition targets based on suggestions
            
            return Ok(new { message = "Đã áp dụng gợi ý thành công" });
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

