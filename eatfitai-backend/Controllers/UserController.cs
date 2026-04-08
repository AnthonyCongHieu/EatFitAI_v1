using System.Security.Claims;
using EatFitAI.API.DTOs.User;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet("profile")]
        public async Task<ActionResult<UserProfileDto>> GetProfile()
        {
            try
            {
                var userId = GetUserIdFromToken();
                var user = await _userService.GetUserProfileAsync(userId);
                return Ok(user);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPut("profile")]
        public async Task<ActionResult<UserProfileDto>> UpdateProfile([FromBody] UserProfileDto userDto)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var updatedUser = await _userService.UpdateUserProfileAsync(userId, userDto);
                return Ok(updatedUser);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost("body-metrics")]
        public async Task<ActionResult<BodyMetricDto>> RecordBodyMetrics([FromBody] BodyMetricDto bodyMetricDto)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var recordedMetrics = await _userService.RecordBodyMetricsAsync(userId, bodyMetricDto);
                return Ok(recordedMetrics);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi khi ghi nhận chỉ số cơ thể", error = ex.Message });
            }
        }

        [HttpGet("body-metrics/history")]
        public async Task<ActionResult<List<BodyMetricDto>>> GetBodyMetricsHistory([FromQuery] int limit = 30)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var history = await _userService.GetBodyMetricsHistoryAsync(userId, limit);
                return Ok(history);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi khi lấy lịch sử chỉ số cơ thể", error = ex.Message });
            }
        }


        [HttpDelete("profile")]
        public async Task<IActionResult> DeleteProfile()
        {
            try
            {
                var userId = GetUserIdFromToken();
                await _userService.DeleteUserAsync(userId);
                return Ok(new { message = "Tài khoản đã được xóa thành công" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
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

