using System.Security.Claims;
using EatFitAI.API.DTOs.Food;
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
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while listing user food items", error = ex.Message });
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
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while retrieving user food item", error = ex.Message });
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
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while creating user food item", error = ex.Message });
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
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while updating user food item", error = ex.Message });
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
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while deleting user food item", error = ex.Message });
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

