using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EatFitAI.API.Data;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Controllers;

[Route("api/admin/foods")]
[ApiController]
// [Authorize(Roles = "Admin")]
public class AdminFoodController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AdminFoodController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<AdminFoodDto>>), 200)]
    public async Task<IActionResult> GetFoods([FromQuery] bool verifiedOnly = false)
    {
        var query = _context.FoodItems.Where(f => !f.IsDeleted);
        
        if (verifiedOnly)
        {
            query = query.Where(f => f.IsActive); // Using IsActive as IsVerified equivalent
        }

        var foods = await query
            .OrderBy(f => f.IsActive) // Unverified (Inactive) first
            .ThenByDescending(f => f.CreatedAt)
            .Take(100) // Paging
            .Select(f => new AdminFoodDto
            {
                FoodItemId = f.FoodItemId,
                FoodName = f.FoodName,
                CaloriesPer100g = f.CaloriesPer100g,
                ProteinPer100g = f.ProteinPer100g,
                FatPer100g = f.FatPer100g,
                CarbPer100g = f.CarbPer100g,
                IsVerified = f.IsActive,
                CredibilityScore = f.IsActive ? 100 : 50,
                CreatedAt = f.CreatedAt
            })
            .ToListAsync();

        return Ok(ApiResponse<List<AdminFoodDto>>.SuccessResponse(foods, "Thành công"));
    }

    [HttpPost("{id}/verify")]
    public async Task<IActionResult> VerifyFood(int id)
    {
        var food = await _context.FoodItems.FindAsync(id);
        if (food == null || food.IsDeleted) return NotFound(ApiResponse<object>.ErrorResponse("Not found"));

        food.IsActive = true;
        food.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        return Ok(ApiResponse<object>.SuccessResponse(null, "Verified food successfully"));
    }
}
