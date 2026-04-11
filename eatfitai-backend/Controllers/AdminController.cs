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

[Route("api/admin")]
[ApiController]
// [Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;

    public AdminController(ApplicationDbContext context, IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
    }

    // ===================== DASHBOARD =====================

    [HttpGet("dashboard-stats")]
    [ProducesResponseType(typeof(ApiResponse<AdminDashboardStatsDto>), 200)]
    public async Task<IActionResult> GetDashboardStats()
    {
        try
        {
            var totalUsers = await _context.Users.CountAsync();

            int totalRequests = 0, activeKeys = 0, totalKeys = 0;
            var poolHealth = new List<PoolHealthDto>();
            try
            {
                var keys = await _context.GeminiKeys.ToListAsync();
                totalRequests = keys.Sum(k => k.TotalRequestsUsed);
                activeKeys = keys.Count(k => k.IsActive);
                totalKeys = keys.Count;
                poolHealth = keys.Select(k => new PoolHealthDto
                {
                    KeyName = k.KeyName,
                    Used = k.DailyRequestsUsed,
                    Limit = k.DailyQuotaLimit,
                    Status = k.IsActive ? "Active" : "Exhausted"
                }).ToList();
            }
            catch { /* GeminiKeys query failed */ }

            int totalFoods = 0;
            try { totalFoods = await _context.FoodItems.CountAsync(); } catch { }

            var today = DateTime.UtcNow.Date;
            var newUsersToday = await _context.Users.CountAsync(u => u.CreatedAt >= today);

            var stats = new AdminDashboardStatsDto
            {
                TotalUsers = totalUsers,
                ActiveKeys = activeKeys,
                TotalKeys = totalKeys,
                TotalRequests = totalRequests,
                Health = (totalKeys > 0 && activeKeys > 0) ? "Healthy" : "Warning",
                HealthMessage = (totalKeys > 0 && activeKeys > 0) ? "Platform stable" : "Key exhausted or not configured",
                NewUsersToday = newUsersToday,
                RequestsGrowth = 5.2m,
                TotalFoods = totalFoods,
                ChartData = new List<ChartDataDto>
                {
                    new ChartDataDto { Name = "Mon", Requests = 120, Quota = 1500 },
                    new ChartDataDto { Name = "Tue", Requests = 350, Quota = 1500 },
                    new ChartDataDto { Name = "Wed", Requests = 200, Quota = 1500 },
                    new ChartDataDto { Name = "Thu", Requests = 400, Quota = 1500 }
                },
                PoolHealth = poolHealth
            };

            return Ok(ApiResponse<AdminDashboardStatsDto>.SuccessResponse(stats, "Thành công"));
        }
        catch (Exception)
        {
            var fallback = new AdminDashboardStatsDto
            {
                TotalUsers = 0, ActiveKeys = 0, TotalKeys = 0, TotalRequests = 0,
                Health = "Unknown", HealthMessage = "Could not fetch stats",
                NewUsersToday = 0, RequestsGrowth = 0, TotalFoods = 0,
                ChartData = new List<ChartDataDto>(),
                PoolHealth = new List<PoolHealthDto>()
            };
            return Ok(ApiResponse<AdminDashboardStatsDto>.SuccessResponse(fallback, "Partial data"));
        }
    }

    // ===================== USERS CRUD =====================

    [HttpGet("users")]
    [ProducesResponseType(typeof(ApiResponse<List<AdminUserDto>>), 200)]
    public async Task<IActionResult> GetUsers([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var query = _context.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.ToLower();
            query = query.Where(u => u.Email.ToLower().Contains(q) ||
                                     (u.DisplayName != null && u.DisplayName.ToLower().Contains(q)));
        }

        var total = await query.CountAsync();
        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = users.Select(u => new AdminUserDto
        {
            Id = u.UserId,
            Name = string.IsNullOrEmpty(u.DisplayName) ? "No Name" : u.DisplayName,
            Email = u.Email,
            Status = u.EmailVerified ? "Active" : "Unverified",
            Role = u.Role ?? "User",
            LastActive = u.CreatedAt.ToString("MMM dd, yyyy")
        }).ToList();

        return Ok(ApiResponse<object>.SuccessResponse(new { data = result, total, page, pageSize }, "Thành công"));
    }

    [HttpGet("users/{id}")]
    public async Task<IActionResult> GetUserDetail(Guid id)
    {
        var u = await _context.Users.FirstOrDefaultAsync(x => x.UserId == id);
        if (u == null) return NotFound(ApiResponse<object>.ErrorResponse("User not found"));

        int mealsLogged = 0;
        try { mealsLogged = await _context.MealDiaries.CountAsync(m => m.UserId == id); } catch { }

        var detail = new AdminUserDetailDto
        {
            Id = u.UserId,
            Name = string.IsNullOrEmpty(u.DisplayName) ? "No Name" : u.DisplayName,
            Email = u.Email,
            Status = u.EmailVerified ? "Active" : "Unverified",
            Role = u.Role ?? "User",
            LastActive = u.CreatedAt.ToString("MMM dd, yyyy"),
            TotalMealsLogged = mealsLogged,
            OnboardingCompleted = u.OnboardingCompleted,
            AvatarUrl = u.AvatarUrl,
            CreatedAt = u.CreatedAt
        };

        return Ok(ApiResponse<AdminUserDetailDto>.SuccessResponse(detail, "Thành công"));
    }

    [HttpPut("users/{id}/role")]
    public async Task<IActionResult> UpdateUserRole(Guid id, [FromBody] UpdateUserRoleRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(x => x.UserId == id);
        if (user == null) return NotFound(ApiResponse<object>.ErrorResponse("User not found"));

        user.Role = request.Role;
        await _context.SaveChangesAsync();
        return Ok(ApiResponse<object>.SuccessResponse(new { Id = user.UserId, Role = user.Role }, "Đã cập nhật role."));
    }

    [HttpPut("users/{id}/suspend")]
    public async Task<IActionResult> SuspendUser(Guid id)
    {
        var user = await _context.Users.FirstOrDefaultAsync(x => x.UserId == id);
        if (user == null) return NotFound(ApiResponse<object>.ErrorResponse("User not found"));

        // Toggle email verified as suspend mechanism
        user.EmailVerified = !user.EmailVerified;
        await _context.SaveChangesAsync();
        var status = user.EmailVerified ? "Active" : "Suspended";
        return Ok(ApiResponse<object>.SuccessResponse(new { Id = user.UserId, Status = status }, $"User {status}."));
    }

    // ===================== FOODS CRUD =====================

    [HttpGet("foods")]
    public async Task<IActionResult> GetFoods([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var query = _context.FoodItems.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.ToLower();
            query = query.Where(f => f.FoodName.ToLower().Contains(q));
        }

        var total = await query.CountAsync();
        var foods = await query
            .OrderByDescending(f => f.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = foods.Select(f => new AdminFoodDto
        {
            FoodItemId = f.FoodItemId,
            FoodName = f.FoodName,
            CaloriesPer100g = f.CaloriesPer100g,
            ProteinPer100g = f.ProteinPer100g,
            FatPer100g = f.FatPer100g,
            CarbPer100g = f.CarbPer100g,
            IsVerified = f.IsVerified,
            CredibilityScore = f.CredibilityScore,
            CreatedAt = f.CreatedAt
        }).ToList();

        return Ok(ApiResponse<object>.SuccessResponse(new { data = result, total, page, pageSize }, "Thành công"));
    }

    [HttpPost("foods")]
    public async Task<IActionResult> CreateFood([FromBody] CreateFoodRequest request)
    {
        var food = new Models.FoodItem
        {
            FoodName = request.FoodName.Trim(),
            CaloriesPer100g = request.CaloriesPer100g,
            ProteinPer100g = request.ProteinPer100g,
            FatPer100g = request.FatPer100g,
            CarbPer100g = request.CarbPer100g,
            IsVerified = false,
            CredibilityScore = 0,
            CreatedAt = DateTime.UtcNow
        };

        _context.FoodItems.Add(food);
        await _context.SaveChangesAsync();
        return Created("", ApiResponse<object>.SuccessResponse(new { Id = food.FoodItemId }, "Thêm food mới thành công."));
    }

    [HttpPut("foods/{id}")]
    public async Task<IActionResult> UpdateFood(int id, [FromBody] UpdateFoodRequest request)
    {
        var food = await _context.FoodItems.FindAsync(id);
        if (food == null) return NotFound(ApiResponse<object>.ErrorResponse("Food not found"));

        if (request.FoodName != null) food.FoodName = request.FoodName.Trim();
        if (request.CaloriesPer100g.HasValue) food.CaloriesPer100g = request.CaloriesPer100g.Value;
        if (request.ProteinPer100g.HasValue) food.ProteinPer100g = request.ProteinPer100g.Value;
        if (request.FatPer100g.HasValue) food.FatPer100g = request.FatPer100g.Value;
        if (request.CarbPer100g.HasValue) food.CarbPer100g = request.CarbPer100g.Value;

        await _context.SaveChangesAsync();
        return Ok(ApiResponse<object>.SuccessResponse(new { Id = food.FoodItemId }, "Cập nhật food thành công."));
    }

    [HttpDelete("foods/{id}")]
    public async Task<IActionResult> DeleteFood(int id)
    {
        var food = await _context.FoodItems.FindAsync(id);
        if (food == null) return NotFound(ApiResponse<object>.ErrorResponse("Food not found"));

        _context.FoodItems.Remove(food);
        await _context.SaveChangesAsync();
        return Ok(ApiResponse<object>.SuccessResponse(null, "Xóa food thành công."));
    }

    [HttpPost("foods/{id}/verify")]
    public async Task<IActionResult> VerifyFood(int id)
    {
        var food = await _context.FoodItems.FindAsync(id);
        if (food == null) return NotFound(ApiResponse<object>.ErrorResponse("Food not found"));

        food.IsVerified = !food.IsVerified;
        if (food.IsVerified) food.CredibilityScore = 100;
        await _context.SaveChangesAsync();
        return Ok(ApiResponse<object>.SuccessResponse(new { Id = food.FoodItemId, IsVerified = food.IsVerified }, "Cập nhật verify thành công."));
    }

    // ===================== SYSTEM HEALTH =====================

    [HttpGet("system/health")]
    public async Task<IActionResult> GetSystemHealth()
    {
        var health = new SystemHealthDto { BackendStatus = "Live" };

        try
        {
            await _context.Database.ExecuteSqlRawAsync("SELECT 1");
            health.DatabaseStatus = "Connected";
        }
        catch { health.DatabaseStatus = "Disconnected"; }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(8);
            var r = await client.GetAsync("https://eatfitai-ai-provider.onrender.com/healthz");
            health.AiProviderStatus = r.IsSuccessStatusCode ? "Live" : "Down";
        }
        catch { health.AiProviderStatus = "Unreachable"; }

        try { health.TotalUsers = await _context.Users.CountAsync(); } catch { }
        try { health.TotalFoods = await _context.FoodItems.CountAsync(); } catch { }
        try { health.TotalKeys = await _context.GeminiKeys.CountAsync(); } catch { }

        health.CheckedAt = DateTime.UtcNow;

        return Ok(ApiResponse<SystemHealthDto>.SuccessResponse(health, "System health check complete"));
    }

    // ===================== KEEP-ALIVE =====================

    [HttpGet("keep-alive")]
    public async Task<IActionResult> KeepAlive()
    {
        // Ping database
        try { await _context.Database.ExecuteSqlRawAsync("SELECT 1"); } catch { }
        return Ok(new { status = "alive", timestamp = DateTime.UtcNow });
    }
}
