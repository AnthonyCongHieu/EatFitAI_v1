using System.Security.Claims;
using EatFitAI.API.DTOs.MealDiary;
using EatFitAI.API.Helpers;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/meal-diary")]
    [Authorize]
    public class MealDiaryController : ControllerBase
    {
        private readonly IMealDiaryService _mealDiaryService;

        public MealDiaryController(IMealDiaryService mealDiaryService)
        {
            _mealDiaryService = mealDiaryService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<MealDiaryDto>>> GetMealDiaries([FromQuery] DateTime? date)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var mealDiaries = await _mealDiaryService.GetUserMealDiariesAsync(userId, date);
                return Ok(mealDiaries);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Token người dùng không hợp lệ", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi lấy nhật ký bữa ăn", HttpContext));
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<MealDiaryDto>> GetMealDiary(int id)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var mealDiary = await _mealDiaryService.GetMealDiaryByIdAsync(id, userId);
                return Ok(mealDiary);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(ErrorResponseHelper.SafeError("Không tìm thấy nhật ký bữa ăn", HttpContext));
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Token người dùng không hợp lệ", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi lấy chi tiết nhật ký bữa ăn", HttpContext));
            }
        }

        [HttpPost]
        public async Task<ActionResult<MealDiaryDto>> CreateMealDiary([FromBody] CreateMealDiaryRequest request)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var mealDiary = await _mealDiaryService.CreateMealDiaryAsync(userId, request);
                return CreatedAtAction(nameof(GetMealDiary), new { id = mealDiary.MealDiaryId }, mealDiary);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Token người dùng không hợp lệ", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi tạo nhật ký bữa ăn", HttpContext));
            }
        }

        [HttpPost("copy-previous-day")]
        public async Task<ActionResult<IEnumerable<MealDiaryDto>>> CopyPreviousDay([FromBody] CopyPreviousDayRequest? request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new { message = "Request body is required" });
                }

                var userId = GetUserIdFromToken();
                var copiedEntries = await _mealDiaryService.CopyPreviousDayAsync(userId, request);
                return Ok(copiedEntries);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(ErrorResponseHelper.SafeError("Không tìm thấy dữ liệu ngày trước", HttpContext));
            }
            catch (ArgumentException)
            {
                return BadRequest(ErrorResponseHelper.SafeError("Dữ liệu yêu cầu không hợp lệ", HttpContext));
            }
            catch (InvalidOperationException)
            {
                return Conflict(ErrorResponseHelper.SafeError("Dữ liệu ngày này đã tồn tại", HttpContext));
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Token người dùng không hợp lệ", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi sao chép nhật ký bữa ăn", HttpContext));
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<MealDiaryDto>> UpdateMealDiary(int id, [FromBody] UpdateMealDiaryRequest request)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var mealDiary = await _mealDiaryService.UpdateMealDiaryAsync(id, userId, request);
                return Ok(mealDiary);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(ErrorResponseHelper.SafeError("Không tìm thấy nhật ký bữa ăn", HttpContext));
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Token người dùng không hợp lệ", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi cập nhật nhật ký bữa ăn", HttpContext));
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMealDiary(int id)
        {
            try
            {
                var userId = GetUserIdFromToken();
                await _mealDiaryService.DeleteMealDiaryAsync(id, userId);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(ErrorResponseHelper.SafeError("Không tìm thấy nhật ký bữa ăn", HttpContext));
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Token người dùng không hợp lệ", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi xóa nhật ký bữa ăn", HttpContext));
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
