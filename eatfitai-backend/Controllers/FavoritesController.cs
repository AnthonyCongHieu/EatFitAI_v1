using System.Security.Claims;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.Food;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/favorites")]
    [Authorize]
    public class FavoritesController : ControllerBase
    {
        private readonly EatFitAIDbContext _context;
        private readonly ILogger<FavoritesController> _logger;

        public FavoritesController(EatFitAIDbContext context, ILogger<FavoritesController> logger)
        {
            _context = context;
            _logger = logger;
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

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FoodItemDto>>> GetFavorites()
        {
            try
            {
                var userId = GetUserIdFromToken();
                var favorites = await _context.UserFavoriteFoods
                    .Include(f => f.FoodItem)
                    .Where(f => f.UserId == userId)
                    .OrderByDescending(f => f.CreatedAt)
                    .Select(f => new FoodItemDto
                    {
                        FoodItemId = f.FoodItem.FoodItemId,
                        FoodName = f.FoodItem.FoodName,
                        FoodNameEn = f.FoodItem.FoodNameEn,
                        CaloriesPer100g = f.FoodItem.CaloriesPer100g,
                        ProteinPer100g = f.FoodItem.ProteinPer100g,
                        CarbPer100g = f.FoodItem.CarbPer100g,
                        FatPer100g = f.FoodItem.FatPer100g,
                        ThumbNail = f.FoodItem.ThumbNail,
                        IsActive = f.FoodItem.IsActive,
                        CreatedAt = f.FoodItem.CreatedAt,
                        UpdatedAt = f.FoodItem.UpdatedAt
                    })
                    .ToListAsync();

                return Ok(favorites);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving favorites");
                return StatusCode(500, new { message = "An error occurred while retrieving favorites" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> ToggleFavorite([FromBody] ToggleFavoriteRequest request)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var existing = await _context.UserFavoriteFoods
                    .FirstOrDefaultAsync(f => f.UserId == userId && f.FoodItemId == request.FoodItemId);

                if (existing != null)
                {
                    _context.UserFavoriteFoods.Remove(existing);
                    await _context.SaveChangesAsync();
                    return Ok(new { isFavorite = false });
                }

                var newFavorite = new UserFavoriteFood
                {
                    UserId = userId,
                    FoodItemId = request.FoodItemId,
                    CreatedAt = DateTime.UtcNow
                };

                _context.UserFavoriteFoods.Add(newFavorite);
                await _context.SaveChangesAsync();
                return Ok(new { isFavorite = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling favorite");
                return StatusCode(500, new { message = "An error occurred while updating favorites" });
            }
        }

        [HttpGet("check/{foodId}")]
        public async Task<ActionResult<bool>> CheckIsFavorite(int foodId)
        {
             try
            {
                var userId = GetUserIdFromToken();
                var exists = await _context.UserFavoriteFoods
                    .AnyAsync(f => f.UserId == userId && f.FoodItemId == foodId);
                return Ok(new { isFavorite = exists });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking favorite status");
                return StatusCode(500, new { message = "An error occurred" });
            }
        }
    }
}
