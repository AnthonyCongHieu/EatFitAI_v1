using System.Security.Claims;
using EatFitAI.API.DTOs.Analytics;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

        /// <summary>
        /// Get day summary with meals grouped by meal type
        /// </summary>
        /// <param name="date">Date to get summary for</param>
        /// <returns>Complete day summary including nutrition totals, target calories, and meals</returns>
        [HttpGet("day")]
        public async Task<ActionResult<DaySummaryDto>> GetDaySummary([FromQuery] DateTime date)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var summary = await _analyticsService.GetDaySummaryWithMealsAsync(userId, date);
                return Ok(summary);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while retrieving day summary", error = ex.Message });
            }
        }

        /// <summary>
        /// Get week summary for nutrition totals
        /// </summary>
        /// <param name="date">Any date within the week to get summary for</param>
        /// <returns>Week nutrition summary with daily calories breakdown</returns>
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
