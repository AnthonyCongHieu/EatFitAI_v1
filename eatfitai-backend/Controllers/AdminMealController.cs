using System;
using System.Linq;
using System.Threading.Tasks;
using EatFitAI.API.Data;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Controllers;

[Route("api/admin/meals")]
[ApiController]
[Authorize(Roles = "Admin")]
public class AdminMealController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AdminMealController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetMeals(
        [FromQuery] string? search,
        [FromQuery] Guid? userId,
        [FromQuery] string? mealType,
        [FromQuery] string? sourceMethod,
        [FromQuery] string? dateFrom,
        [FromQuery] string? dateTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _context.MealDiaries
            .Include(m => m.User)
            .Include(m => m.FoodItem)
            .Include(m => m.MealType)
            .Where(m => !m.IsDeleted)
            .AsQueryable();

        if (userId.HasValue)
            query = query.Where(m => m.UserId == userId.Value);

        if (!string.IsNullOrWhiteSpace(mealType))
            query = query.Where(m => m.MealType.Name.ToLower() == mealType.ToLower());

        if (!string.IsNullOrWhiteSpace(sourceMethod))
            query = query.Where(m => m.SourceMethod != null && m.SourceMethod.ToLower() == sourceMethod.ToLower());

        if (!string.IsNullOrWhiteSpace(dateFrom) && DateOnly.TryParse(dateFrom, out var from))
            query = query.Where(m => m.EatenDate >= from);

        if (!string.IsNullOrWhiteSpace(dateTo) && DateOnly.TryParse(dateTo, out var to))
            query = query.Where(m => m.EatenDate <= to);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.ToLower();
            query = query.Where(m => 
                (m.FoodItem != null && m.FoodItem.FoodName.ToLower().Contains(q)) ||
                m.User.Email.ToLower().Contains(q) ||
                (m.User.DisplayName != null && m.User.DisplayName.ToLower().Contains(q)));
        }

        var total = await query.CountAsync();
        var meals = await query
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = meals.Select(m => new AdminMealDto
        {
            MealDiaryId = m.MealDiaryId,
            UserId = m.UserId,
            UserName = string.IsNullOrEmpty(m.User?.DisplayName) ? "No Name" : m.User.DisplayName,
            UserEmail = m.User?.Email ?? "",
            FoodName = m.FoodItem?.FoodName ?? "Custom/Unknown",
            MealType = m.MealType?.Name ?? "Unknown",
            EatenDate = m.EatenDate.ToString("yyyy-MM-dd"),
            Grams = m.Grams,
            Calories = m.Calories,
            Protein = m.Protein,
            Carb = m.Carb,
            Fat = m.Fat,
            SourceMethod = m.SourceMethod,
            PhotoUrl = m.PhotoUrl,
            Note = m.Note,
            CreatedAt = m.CreatedAt,
            IsDeleted = m.IsDeleted
        }).ToList();

        return Ok(ApiResponse<object>.SuccessResponse(new { data = result, total, page, pageSize }, "Thành công"));
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetMealStats()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var weekAgo = today.AddDays(-7);

        var allMeals = _context.MealDiaries.Where(m => !m.IsDeleted);

        var stats = new AdminMealStatsDto
        {
            TotalMeals = await allMeals.CountAsync(),
            MealsToday = await allMeals.CountAsync(m => m.EatenDate == today),
            MealsThisWeek = await allMeals.CountAsync(m => m.EatenDate >= weekAgo),
        };

        // By source method
        try
        {
            var bySource = await allMeals
                .GroupBy(m => m.SourceMethod ?? "unknown")
                .Select(g => new { Key = g.Key, Count = g.Count() })
                .ToListAsync();
            stats.BySource = bySource.ToDictionary(x => x.Key, x => x.Count);
        }
        catch { }

        // By meal type
        try
        {
            var byType = await allMeals
                .Include(m => m.MealType)
                .GroupBy(m => m.MealType.Name)
                .Select(g => new { Key = g.Key, Count = g.Count() })
                .ToListAsync();
            stats.ByMealType = byType.ToDictionary(x => x.Key, x => x.Count);
        }
        catch { }

        return Ok(ApiResponse<AdminMealStatsDto>.SuccessResponse(stats, "Thành công"));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteMeal(int id)
    {
        var meal = await _context.MealDiaries.FindAsync(id);
        if (meal == null) return NotFound(ApiResponse<object>.ErrorResponse("Meal not found"));

        meal.IsDeleted = true;
        await _context.SaveChangesAsync();
        return Ok(ApiResponse<object>.SuccessResponse(null, "Xóa meal thành công."));
    }
}
