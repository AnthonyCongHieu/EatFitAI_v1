using System.Security.Claims;
using EatFitAI.API.DTOs;
using EatFitAI.API.DTOs.Analytics;
using EatFitAI.API.Helpers;
using EatFitAI.API.Services;
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
        private readonly IBusinessDateService _businessDateService;

        public AnalyticsController(
            IAnalyticsService analyticsService,
            IBusinessDateService businessDateService)
        {
            _analyticsService = analyticsService;
            _businessDateService = businessDateService;
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

            try
            {
                var userId = GetUserIdFromToken();
                var normalizedStartDate = startDate.Date;
                var effectiveEndDate = endDate.HasValue
                    ? endDate.Value.Date
                    : (await _businessDateService.GetTodayAsync(userId, HttpContext.RequestAborted)).ToDateTime(TimeOnly.MinValue);

                if (effectiveEndDate < normalizedStartDate)
                {
                    return BadRequest(new { message = "endDate phải lớn hơn hoặc bằng startDate." });
                }

                var summary = await _analyticsService.GetNutritionSummaryAsync(userId, normalizedStartDate, effectiveEndDate);
                return Ok(summary);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Không có quyền truy cập", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi lấy tổng hợp dinh dưỡng", HttpContext));
            }
        }

        [HttpGet("weekly-review")]
        public async Task<ActionResult<WeeklyReviewDto>> GetWeeklyReview()
        {
            try
            {
                var userId = GetUserIdFromToken();
                var review = await _analyticsService.GetWeeklyReviewAsync(userId);
                return Ok(review);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Không có quyền truy cập", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi lấy weekly review", HttpContext));
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
