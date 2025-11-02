using System.Security.Claims;
using EatFitAI.API.DTOs.MealDiary;
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
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while retrieving meal diaries", error = ex.Message });
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
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while retrieving meal diary", error = ex.Message });
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
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while creating meal diary", error = ex.Message });
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
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while updating meal diary", error = ex.Message });
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
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while deleting meal diary", error = ex.Message });
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