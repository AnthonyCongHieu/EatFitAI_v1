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
                return BadRequest(new { message = "startDate là bắt buộc và phải là ngày hợp lệ." });
            }

            var normalizedStartDate = startDate.Date;
            var effectiveEndDate = (endDate ?? DateTime.UtcNow.Date).Date;

            if (effectiveEndDate < normalizedStartDate)
            {
                return BadRequest(new { message = "endDate phải lớn hơn hoặc bằng startDate." });
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
                return StatusCode(500, new { message = "Đã xảy ra lỗi khi lấy tổng hợp dinh dưỡng", error = ex.Message });
            }
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
    }
}
