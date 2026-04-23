using System.Security.Claims;
using EatFitAI.API.DTOs.Food;
using EatFitAI.API.DTOs.MealDiary;
using EatFitAI.API.Exceptions;
using EatFitAI.API.Helpers;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api")]
    public class FoodController : ControllerBase
    {
        private readonly IFoodService _foodService;
        private readonly ICustomDishService _customDishService;

        public FoodController(IFoodService foodService, ICustomDishService customDishService)
        {
            _foodService = foodService;
            _customDishService = customDishService;
        }

        [HttpGet("search")]
        [HttpGet("food/search")]
        public async Task<ActionResult<IEnumerable<FoodItemDto>>> SearchFoodItems(
            [FromQuery] string q,
            [FromQuery] int limit = 50)
        {
            if (string.IsNullOrWhiteSpace(q))
            {
                return BadRequest(new { message = "Từ khóa tìm kiếm là bắt buộc" });
            }

            try
            {
                var foodItems = await _foodService.SearchFoodItemsAsync(q, limit);
                return Ok(foodItems);
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi tìm kiếm món ăn", HttpContext));
            }
        }

        [HttpGet("food/search-all")]
        public async Task<ActionResult<IEnumerable<FoodSearchResultDto>>> SearchAll(
            [FromQuery] string q,
            [FromQuery] int limit = 50)
        {
            if (string.IsNullOrWhiteSpace(q))
            {
                return BadRequest(new { message = "Từ khóa tìm kiếm là bắt buộc" });
            }

            try
            {
                Guid? userId = null;
                var userIdClaim = User?.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value
                               ?? User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var parsed))
                {
                    userId = parsed;
                }

                var results = await _foodService.SearchAllAsync(q, userId, limit);
                return Ok(results);
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi tìm kiếm món ăn", HttpContext));
            }
        }

        [HttpGet("food/barcode/{barcode}")]
        public async Task<ActionResult<BarcodeLookupResultDto>> GetFoodByBarcode(
            string barcode,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(barcode))
            {
                return BadRequest(new { message = "Barcode là bắt buộc." });
            }

            try
            {
                var result = await _foodService.LookupByBarcodeAsync(barcode, cancellationToken);
                if (result == null)
                {
                    return NotFound(new { message = "Không tìm thấy sản phẩm cho mã vạch này." });
                }

                return Ok(result);
            }
            catch (BarcodeProviderUnavailableException)
            {
                return StatusCode(
                    StatusCodes.Status503ServiceUnavailable,
                    ErrorResponseHelper.SafeError(
                        "Dịch vụ tra cứu mã vạch tạm thời không khả dụng. Vui lòng thử lại sau.",
                        HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi tra cứu mã vạch", HttpContext));
            }
        }

        [HttpGet("food/recent")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<FoodSearchResultDto>>> GetRecentFoods([FromQuery] int limit = 20)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var result = await _foodService.GetRecentFoodsAsync(userId, limit);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi lấy món ăn gần đây", HttpContext));
            }
        }

        [HttpGet("{id:int}")]
        [HttpGet("food/{id:int}")]
        public async Task<ActionResult<dynamic>> GetFoodItem(int id)
        {
            try
            {
                var (foodItem, servings) = await _foodService.GetFoodItemWithServingsAsync(id);
                return Ok(new { foodItem, servings });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi lấy thông tin món ăn", HttpContext));
            }
        }

        [HttpPost("custom-dishes")]
        [Authorize]
        public async Task<ActionResult<CustomDishResponseDto>> CreateCustomDish([FromBody] CustomDishDto customDishDto)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var customDish = await _customDishService.CreateCustomDishAsync(userId, customDishDto);
                return Ok(customDish);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi tạo món thường dùng", HttpContext));
            }
        }

        [HttpGet("custom-dishes")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<CustomDishSummaryDto>>> GetCustomDishes()
        {
            try
            {
                var userId = GetUserIdFromToken();
                var customDishes = await _customDishService.GetCustomDishesAsync(userId);
                return Ok(customDishes);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi lấy món thường dùng", HttpContext));
            }
        }

        [HttpGet("custom-dishes/{id:int}")]
        [Authorize]
        public async Task<ActionResult<CustomDishResponseDto>> GetCustomDish(int id)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var customDish = await _customDishService.GetCustomDishAsync(userId, id);
                return Ok(customDish);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi lấy chi tiết món thường dùng", HttpContext));
            }
        }

        [HttpPut("custom-dishes/{id:int}")]
        [Authorize]
        public async Task<ActionResult<CustomDishResponseDto>> UpdateCustomDish(int id, [FromBody] CustomDishDto customDishDto)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var customDish = await _customDishService.UpdateCustomDishAsync(userId, id, customDishDto);
                return Ok(customDish);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi cập nhật món thường dùng", HttpContext));
            }
        }

        [HttpDelete("custom-dishes/{id:int}")]
        [Authorize]
        public async Task<IActionResult> DeleteCustomDish(int id)
        {
            try
            {
                var userId = GetUserIdFromToken();
                await _customDishService.DeleteCustomDishAsync(userId, id);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi xóa món thường dùng", HttpContext));
            }
        }

        [HttpPost("custom-dishes/{id:int}/apply")]
        [Authorize]
        public async Task<ActionResult<MealDiaryDto>> ApplyCustomDish(int id, [FromBody] ApplyCustomDishRequest? request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new { message = "Request body is required" });
                }

                var userId = GetUserIdFromToken();
                var mealDiary = await _customDishService.ApplyCustomDishAsync(userId, id, request);
                return Ok(mealDiary);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi thêm món thường dùng vào nhật ký", HttpContext));
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

