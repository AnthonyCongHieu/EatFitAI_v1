using System.Security.Claims;
using EatFitAI.API.DTOs.Food;
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

        public FoodController(IFoodService foodService)
        {
            _foodService = foodService;
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
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi tra cứu mã vạch", HttpContext));
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
                var customDish = await _foodService.CreateCustomDishAsync(userId, customDishDto);
                return Ok(customDish);
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Đã xảy ra lỗi khi tạo món tự tạo", HttpContext));
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

