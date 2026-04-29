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
                return BadRequest(new { message = "T廙� kh籀a t穫m ki廕禦 l� b廕眩 bu廙緽" });
            }

            try
            {
                var foodItems = await _foodService.SearchFoodItemsAsync(q, limit);
                return Ok(foodItems);
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("�瓊 x廕ㄊ ra l廙𡟙 khi t穫m ki廕禦 m籀n �n", HttpContext));
            }
        }

        [HttpGet("food/search-all")]
        public async Task<ActionResult<IEnumerable<FoodSearchResultDto>>> SearchAll(
            [FromQuery] string q,
            [FromQuery] int limit = 50)
        {
            if (string.IsNullOrWhiteSpace(q))
            {
                return BadRequest(new { message = "T廙� kh籀a t穫m ki廕禦 l� b廕眩 bu廙緽" });
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
                return StatusCode(500, ErrorResponseHelper.SafeError("�瓊 x廕ㄊ ra l廙𡟙 khi t穫m ki廕禦 m籀n �n", HttpContext));
            }
        }

        [HttpGet("food/barcode/{barcode}")]
        public async Task<ActionResult<BarcodeLookupResultDto>> GetFoodByBarcode(
            string barcode,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(barcode))
            {
                return BadRequest(new { message = "Barcode l� b廕眩 bu廙緽." });
            }

            try
            {
                var result = await _foodService.LookupByBarcodeAsync(barcode, cancellationToken);
                if (result == null)
                {
                    return NotFound(new { message = "Kh繫ng t穫m th廕句 s廕τ ph廕姓 cho m瓊 v廕︷h n�y." });
                }

                return Ok(result);
            }
            catch (BarcodeProviderUnavailableException)
            {
                return StatusCode(
                    StatusCodes.Status503ServiceUnavailable,
                    ErrorResponseHelper.SafeError(
                        "D廙醶h v廙� tra c廙季 m瓊 v廕︷h t廕《 th廙𩥉 kh繫ng kh廕� d廙叩g. Vui l簷ng th廙� l廕【 sau.",
                        HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("�瓊 x廕ㄊ ra l廙𡟙 khi tra c廙季 m瓊 v廕︷h", HttpContext));
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
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Kh繫ng c籀 quy廙� truy c廕計", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("�瓊 x廕ㄊ ra l廙𡟙 khi l廕句 m籀n �n g廕吵 �璽y", HttpContext));
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
            catch (KeyNotFoundException)
            {
                return NotFound(ErrorResponseHelper.SafeError("Kh\u00f4ng t\u00ecm th\u1ea5y th\u00f4ng tin m\u00f3n \u0103n", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("�瓊 x廕ㄊ ra l廙𡟙 khi l廕句 th繫ng tin m籀n �n", HttpContext));
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
            catch (KeyNotFoundException)
            {
                return NotFound(ErrorResponseHelper.SafeError("Kh繫ng t穫m th廕句 m籀n �n ho廕搾 th�nh ph廕吵", HttpContext));
            }
            catch (ArgumentException)
            {
                return BadRequest(ErrorResponseHelper.SafeError("Th繫ng tin m籀n th⑹廙𩵚g d羅ng kh繫ng h廙φ l廙�", HttpContext));
            }
            catch (InvalidOperationException)
            {
                return Conflict(ErrorResponseHelper.SafeError("M籀n th⑹廙𩵚g d羅ng �瓊 t廙忛 t廕【 ho廕搾 xung �廙脌 d廙� li廙杮", HttpContext));
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Kh繫ng c籀 quy廙� truy c廕計", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("�瓊 x廕ㄊ ra l廙𡟙 khi t廕︽ m籀n th⑹廙𩵚g d羅ng", HttpContext));
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
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Kh繫ng c籀 quy廙� truy c廕計", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("�瓊 x廕ㄊ ra l廙𡟙 khi l廕句 m籀n th⑹廙𩵚g d羅ng", HttpContext));
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
            catch (KeyNotFoundException)
            {
                return NotFound(ErrorResponseHelper.SafeError("Kh繫ng t穫m th廕句 m籀n th⑹廙𩵚g d羅ng", HttpContext));
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Kh繫ng c籀 quy廙� truy c廕計", HttpContext));
            }
            catch (InvalidOperationException)
            {
                return Conflict(ErrorResponseHelper.SafeError("Xung �廙脌 d廙� li廙杮 khi truy c廕計 m籀n th⑹廙𩵚g d羅ng", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("�瓊 x廕ㄊ ra l廙𡟙 khi l廕句 chi ti廕篙 m籀n th⑹廙𩵚g d羅ng", HttpContext));
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
            catch (KeyNotFoundException)
            {
                return NotFound(ErrorResponseHelper.SafeError("Kh繫ng t穫m th廕句 m籀n th⑹廙𩵚g d羅ng �廙� c廕計 nh廕負", HttpContext));
            }
            catch (ArgumentException)
            {
                return BadRequest(ErrorResponseHelper.SafeError("Th繫ng tin c廕計 nh廕負 kh繫ng h廙φ l廙�", HttpContext));
            }
            catch (InvalidOperationException)
            {
                return Conflict(ErrorResponseHelper.SafeError("Xung �廙脌 d廙� li廙杮 khi c廕計 nh廕負", HttpContext));
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Kh繫ng c籀 quy廙� c廕計 nh廕負 m籀n n�y", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("�瓊 x廕ㄊ ra l廙𡟙 khi c廕計 nh廕負 m籀n th⑹廙𩵚g d羅ng", HttpContext));
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
            catch (KeyNotFoundException)
            {
                return NotFound(ErrorResponseHelper.SafeError("Kh繫ng t穫m th廕句 m籀n th⑹廙𩵚g d羅ng �廙� x籀a", HttpContext));
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Kh繫ng c籀 quy廙� x籀a m籀n n�y", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("�瓊 x廕ㄊ ra l廙𡟙 khi x籀a m籀n th⑹廙𩵚g d羅ng", HttpContext));
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
            catch (KeyNotFoundException)
            {
                return NotFound(ErrorResponseHelper.SafeError("Kh繫ng t穫m th廕句 m籀n th⑹廙𩵚g d羅ng �廙� 獺p d廙叩g", HttpContext));
            }
            catch (ArgumentException)
            {
                return BadRequest(ErrorResponseHelper.SafeError("Th繫ng tin 獺p d廙叩g kh繫ng h廙φ l廙�", HttpContext));
            }
            catch (InvalidOperationException)
            {
                return Conflict(ErrorResponseHelper.SafeError("Xung �廙脌 d廙� li廙杮 khi 獺p d廙叩g m籀n th⑹廙𩵚g d羅ng", HttpContext));
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Kh繫ng c籀 quy廙� 獺p d廙叩g m籀n n�y", HttpContext));
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("�瓊 x廕ㄊ ra l廙𡟙 khi th礙m m籀n th⑹廙𩵚g d羅ng v�o nh廕負 k羸", HttpContext));
            }
        }

        private Guid GetUserIdFromToken()
        {
            var userIdClaim = User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value
                            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                throw new UnauthorizedAccessException("Token ng⑹廙𩥉 d羅ng kh繫ng h廙φ l廙�");
            }

            return userId;
        }
    }
}

