using System.Security.Claims;
using EatFitAI.API.DTOs.Food;
using EatFitAI.API.Helpers;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/user-food-items")] 
    [Authorize]
    public class UserFoodItemsController : ControllerBase
    {
        private readonly IUserFoodItemService _service;
        private readonly IWebHostEnvironment _env;

        public UserFoodItemsController(IUserFoodItemService service, IWebHostEnvironment env)
        {
            _service = service;
            _env = env;
        }

        [HttpGet]
        public async Task<ActionResult<dynamic>> List([FromQuery] string? q, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var (items, total) = await _service.ListAsync(userId, q, page, pageSize);
                return Ok(new { items, total, page, pageSize });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Token người dùng không hợp lệ", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi lấy danh sách món ăn tự tạo", HttpContext));
            }
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<UserFoodItemDto>> Get(int id)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var item = await _service.GetAsync(userId, id);
                return Ok(item);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(ErrorResponseHelper.SafeError("Không tìm thấy món ăn tự tạo", HttpContext));
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Token người dùng không hợp lệ", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi lấy món ăn tự tạo", HttpContext));
            }
        }

        [HttpPost]
        [RequestSizeLimit(10 * 1024 * 1024)] // 10MB
        public async Task<ActionResult<UserFoodItemDto>> Create([FromForm] CreateUserFoodItemRequest request)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var uploadsRoot = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "user-food");
                var created = await _service.CreateAsync(userId, request, uploadsRoot);
                return Ok(created);
            }
            catch (ArgumentException)
            {
                return BadRequest(ErrorResponseHelper.SafeError("Dữ liệu món ăn không hợp lệ", HttpContext));
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Token người dùng không hợp lệ", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi tạo món ăn tự tạo", HttpContext));
            }
        }

        [HttpPut("{id:int}")]
        [RequestSizeLimit(10 * 1024 * 1024)] // 10MB
        public async Task<ActionResult<UserFoodItemDto>> Update(int id, [FromForm] UpdateUserFoodItemRequest request)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var uploadsRoot = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "user-food");
                var updated = await _service.UpdateAsync(userId, id, request, uploadsRoot);
                return Ok(updated);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(ErrorResponseHelper.SafeError("Không tìm thấy món ăn tự tạo", HttpContext));
            }
            catch (ArgumentException)
            {
                return BadRequest(ErrorResponseHelper.SafeError("Dữ liệu món ăn không hợp lệ", HttpContext));
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Token người dùng không hợp lệ", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi cập nhật món ăn tự tạo", HttpContext));
            }
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult> Delete(int id)
        {
            try
            {
                var userId = GetUserIdFromToken();
                await _service.DeleteAsync(userId, id);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(ErrorResponseHelper.SafeError("Không tìm thấy món ăn tự tạo", HttpContext));
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Token người dùng không hợp lệ", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi xóa món ăn tự tạo", HttpContext));
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


