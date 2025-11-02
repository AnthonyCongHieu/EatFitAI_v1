using System.Security.Claims;
using EatFitAI.API.DTOs.Analytics;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/summary")]
    [Authorize]
    public class SummaryController : ControllerBase
    {
        private readonly IAnalyticsService _analyticsService;

        public SummaryController(IAnalyticsService analyticsService)
        {
            _analyticsService = analyticsService;
        }

        [HttpGet("day")]
        public async Task<ActionResult<NutritionSummaryDto>> GetDaySummary([FromQuery] DateTime date)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var summary = await _analyticsService.GetDaySummaryAsync(userId, date);
                return Ok(summary);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while retrieving day summary", error = ex.Message });
            }
        }

        [HttpGet("week")]
        public async Task<ActionResult<NutritionSummaryDto>> GetWeekSummary([FromQuery] DateTime date)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var summary = await _analyticsService.GetWeekSummaryAsync(userId, date);
                return Ok(summary);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while retrieving week summary", error = ex.Message });
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