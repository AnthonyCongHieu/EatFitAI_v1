using System;
using System.Linq;
using System.Threading.Tasks;
using EatFitAI.API.Data;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.Common;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Controllers;

[Route("api/admin")]
[ApiController]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAiRuntimeStatusService _runtimeStatusService;
    private readonly IAdminRealtimeEventBus _eventBus;

    public AdminController(
        ApplicationDbContext context,
        IHttpClientFactory httpClientFactory,
        IAiRuntimeStatusService runtimeStatusService,
        IAdminRealtimeEventBus eventBus)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _runtimeStatusService = runtimeStatusService;
        _eventBus = eventBus;
    }

    // ===================== DASHBOARD =====================

    [HttpGet("dashboard-stats")]
    [ProducesResponseType(typeof(ApiResponse<AdminDashboardStatsDto>), 200)]
    public async Task<IActionResult> GetDashboardStats()
    {
        try
        {
            var totalUsers = await _context.Users.CountAsync();
            var runtime = await _runtimeStatusService.GetSnapshotAsync();

            var totalRequests = runtime.Projects.Sum(project => project.TotalRequests);
            var activeKeys = runtime.AvailableProjectCount;
            var totalKeys = runtime.Projects.Count;
            var poolHealth = runtime.Projects.Select(project => new PoolHealthDto
            {
                KeyName = string.IsNullOrWhiteSpace(project.ProjectAlias) ? project.ProjectId : project.ProjectAlias,
                Used = project.RpdUsed ?? 0,
                Limit = runtime.Limits.Rpd ?? 0,
                Status = project.Available ? "Active" : project.State,
            }).ToList();

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
                Health = runtime.PoolHealth,
                HealthMessage = runtime.ActiveProject is not null
                    ? $"Runtime authority active on {runtime.ActiveProject}"
                    : "Runtime authority is reporting no available project",
                NewUsersToday = newUsersToday,
                RequestsGrowth = 5.2m,
                TotalFoods = totalFoods,
                ChartData = runtime.Projects.Take(6).Select(project => new ChartDataDto
                {
                    Name = string.IsNullOrWhiteSpace(project.ProjectAlias) ? project.ProjectId : project.ProjectAlias,
                    Requests = project.RpdUsed ?? 0,
                    Quota = runtime.Limits.Rpd ?? 0,
                }).ToList(),
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
        PublishResourceUpdated("user", user.UserId.ToString(), new { user.UserId, user.Role });
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
        PublishResourceUpdated("user", user.UserId.ToString(), new { user.UserId, Status = status });
        return Ok(ApiResponse<object>.SuccessResponse(new { Id = user.UserId, Status = status }, $"User {status}."));
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var user = await _context.Users.FirstOrDefaultAsync(x => x.UserId == id);
        if (user == null) return NotFound(ApiResponse<object>.ErrorResponse("User not found"));

        // Cascade delete related data
        try
        {
            var meals = _context.MealDiaries.Where(m => m.UserId == id);
            _context.MealDiaries.RemoveRange(meals);
        } catch { }
        try
        {
            var corrections = _context.AiCorrectionEvents.Where(c => c.UserId == id);
            _context.AiCorrectionEvents.RemoveRange(corrections);
        } catch { }

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
        PublishResourceUpdated("user", user.UserId.ToString(), new { user.UserId, Deleted = true });
        return Ok(ApiResponse<object>.SuccessResponse(null, "User đã bị xóa vĩnh viễn."));
    }

    // ===================== FOODS CRUD =====================

    [HttpGet("foods")]
    public async Task<IActionResult> GetFoods(
        [FromQuery] string? search,
        [FromQuery] bool? isVerified,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _context.FoodItems.Where(f => !f.IsDeleted).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.ToLower();
            query = query.Where(f => f.FoodName.ToLower().Contains(q));
        }

        if (isVerified.HasValue)
        {
            query = query.Where(f => f.IsVerified == isVerified.Value);
        }

        var total = await query.CountAsync();
        var foods = await query
            .OrderBy(f => f.IsVerified)
            .ThenByDescending(f => f.CreatedAt)
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
        PublishResourceUpdated("food", food.FoodItemId.ToString(), new { food.FoodItemId, food.FoodName });
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
        PublishResourceUpdated("food", food.FoodItemId.ToString(), new { food.FoodItemId, food.FoodName });
        return Ok(ApiResponse<object>.SuccessResponse(new { Id = food.FoodItemId }, "Cập nhật food thành công."));
    }

    [HttpDelete("foods/{id}")]
    public async Task<IActionResult> DeleteFood(int id)
    {
        var food = await _context.FoodItems.FindAsync(id);
        if (food == null) return NotFound(ApiResponse<object>.ErrorResponse("Food not found"));

        _context.FoodItems.Remove(food);
        await _context.SaveChangesAsync();
        PublishResourceUpdated("food", id.ToString(), new { FoodItemId = id, Deleted = true });
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
        PublishResourceUpdated("food", food.FoodItemId.ToString(), new { food.FoodItemId, food.IsVerified });
        return Ok(ApiResponse<object>.SuccessResponse(new { Id = food.FoodItemId, IsVerified = food.IsVerified }, "Cập nhật verify thành công."));
    }

    // ===================== SYSTEM HEALTH =====================

    [HttpGet("system/health")]
    public async Task<IActionResult> GetSystemHealth()
    {
        var health = new SystemHealthDto { BackendStatus = "Live" };
        AdminRuntimeSnapshotDto? runtime = null;

        try
        {
            await _context.Database.ExecuteSqlRawAsync("SELECT 1");
            health.DatabaseStatus = "Connected";
        }
        catch { health.DatabaseStatus = "Disconnected"; }

        try
        {
            runtime = await _runtimeStatusService.GetSnapshotAsync();
            health.AiProviderStatus = runtime.AvailableProjectCount > 0 ? "Live" : "Down";
            health.ActiveProject = runtime.ActiveProject;
            health.AvailableProjectCount = runtime.AvailableProjectCount;
            health.ExhaustedProjectCount = runtime.ExhaustedProjectCount;
            health.CooldownProjectCount = runtime.CooldownProjectCount;
            health.Limits = runtime.Limits;
        }
        catch { health.AiProviderStatus = "Unreachable"; }

        try { health.TotalUsers = await _context.Users.CountAsync(); } catch { }
        try { health.TotalFoods = await _context.FoodItems.CountAsync(); } catch { }
        try { health.TotalKeys = await _context.GeminiKeys.CountAsync(); } catch { }

        health.CheckedAt = runtime?.CheckedAt ?? DateTime.UtcNow;

        return Ok(ApiResponse<SystemHealthDto>.SuccessResponse(health, "System health check complete"));
    }

    // ===================== KEEP-ALIVE =====================

    [AllowAnonymous]
    [HttpGet("keep-alive")]
    public async Task<IActionResult> KeepAlive()
    {
        var results = new Dictionary<string, string>();
        
        // Ping database
        try { await _context.Database.ExecuteSqlRawAsync("SELECT 1"); results["database"] = "alive"; } 
        catch { results["database"] = "error"; }
        
        // Touch key tables to keep EF Core connection pool warm
        try { var _ = await _context.GeminiKeys.CountAsync(); results["gemini_keys"] = "alive"; }
        catch { results["gemini_keys"] = "error"; }
        
        try { var _ = await _context.FoodItems.CountAsync(); results["food_items"] = "alive"; }
        catch { results["food_items"] = "error"; }
        
        try { var _ = await _context.Users.CountAsync(); results["users"] = "alive"; }
        catch { results["users"] = "error"; }

        return Ok(new { 
            status = "alive", 
            timestamp = DateTime.UtcNow,
            services = results
        });
    }

    private void PublishResourceUpdated(string entityType, string entityId, object payload)
    {
        _eventBus.Publish("admin.resource.updated", entityType, entityId, payload);
    }
}
