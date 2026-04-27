using System.Security.Claims;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.Food;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
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
        private readonly IMediaUrlResolver _mediaUrlResolver;
        private readonly ILogger<FavoritesController> _logger;

        public FavoritesController(
            EatFitAIDbContext context,
            IMediaUrlResolver mediaUrlResolver,
            ILogger<FavoritesController> logger)
        {
            _context = context;
            _mediaUrlResolver = mediaUrlResolver;
            _logger = logger;
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
                    .Select(f => new
                    {
                        f.FoodItem.FoodItemId,
                        f.FoodItem.FoodName,
                        f.FoodItem.CaloriesPer100g,
                        f.FoodItem.ProteinPer100g,
                        f.FoodItem.CarbPer100g,
                        f.FoodItem.FatPer100g,
                        f.FoodItem.ThumbNail,
                        f.FoodItem.IsActive,
                        f.FoodItem.CreatedAt,
                        f.FoodItem.UpdatedAt
                    })
                    .ToListAsync();

                return Ok(favorites.Select(f =>
                {
                    var thumbNail = _mediaUrlResolver.NormalizePublicUrl(f.ThumbNail);
                    return new FoodItemDto
                    {
                        FoodItemId = f.FoodItemId,
                        FoodName = f.FoodName,
                        CaloriesPer100g = f.CaloriesPer100g,
                        ProteinPer100g = f.ProteinPer100g,
                        CarbPer100g = f.CarbPer100g,
                        FatPer100g = f.FatPer100g,
                        ThumbNail = thumbNail,
                        ImageVariants = MediaVariantHelper.FromThumbUrl(thumbNail),
                        IsActive = f.IsActive,
                        CreatedAt = f.CreatedAt,
                        UpdatedAt = f.UpdatedAt
                    };
                }));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving favorites");
                return StatusCode(500, new { message = "Đã xảy ra lỗi khi lấy danh sách yêu thích" });
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
                return StatusCode(500, new { message = "Đã xảy ra lỗi khi cập nhật yêu thích" });
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
                return StatusCode(500, new { message = "Đã xảy ra lỗi" });
            }
        }
    }
}

