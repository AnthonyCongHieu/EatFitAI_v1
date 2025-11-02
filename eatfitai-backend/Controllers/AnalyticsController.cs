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
            try
            {
                var userId = GetUserIdFromToken();
                var effectiveEndDate = endDate ?? DateTime.UtcNow.Date;
                var summary = await _analyticsService.GetNutritionSummaryAsync(userId, startDate, effectiveEndDate);
                return Ok(summary);
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