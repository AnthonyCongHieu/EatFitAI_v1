using EatFitAI.API.DTOs.Food;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/food")]
    public class FoodController : ControllerBase
    {
        private readonly IFoodService _foodService;

        public FoodController(IFoodService foodService)
        {
            _foodService = foodService;
        }

        [HttpGet("search")]
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
    }
}