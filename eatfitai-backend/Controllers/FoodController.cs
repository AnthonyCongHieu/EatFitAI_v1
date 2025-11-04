using System.Security.Claims;
using EatFitAI.API.DTOs.Food;
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
                return BadRequest(new { message = "Search query is required" });
            }

            try
            {
                var foodItems = await _foodService.SearchFoodItemsAsync(q, limit);
                return Ok(foodItems);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while searching food items", error = ex.Message });
            }
        }

        [HttpGet("food/search-all")]
        public async Task<ActionResult<IEnumerable<FoodSearchResultDto>>> SearchAll(
            [FromQuery] string q,
            [FromQuery] int limit = 50)
        {
            if (string.IsNullOrWhiteSpace(q))
            {
                return BadRequest(new { message = "Search query is required" });
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
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while searching food items", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
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
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while retrieving food item", error = ex.Message });
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
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while creating custom dish", error = ex.Message });
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
