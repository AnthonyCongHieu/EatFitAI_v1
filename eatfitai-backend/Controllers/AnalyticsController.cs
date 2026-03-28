using System.Security.Claims;
using EatFitAI.API.DTOs.Analytics;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/analytics")]
    [Authorize]
    public class AnalyticsController : ControllerBase
    {
        private readonly IAnalyticsService _analyticsService;

        public AnalyticsController(IAnalyticsService analyticsService)
        {
            _analyticsService = analyticsService;
        }

        [HttpGet("nutrition-summary")]
        public async Task<ActionResult<NutritionSummaryDto>> GetNutritionSummary(
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime? endDate = null)
        {
            if (startDate == default)
            {
                return BadRequest(new { message = "startDate is required and must be a valid date." });
            }

            var normalizedStartDate = startDate.Date;
            var effectiveEndDate = (endDate ?? DateTime.UtcNow.Date).Date;

            if (effectiveEndDate < normalizedStartDate)
            {
                return BadRequest(new { message = "endDate must be greater than or equal to startDate." });
            }

            try
            {
                var userId = GetUserIdFromToken();
                var summary = await _analyticsService.GetNutritionSummaryAsync(userId, normalizedStartDate, effectiveEndDate);
                return Ok(summary);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while retrieving nutrition summary", error = ex.Message });
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
    }
}