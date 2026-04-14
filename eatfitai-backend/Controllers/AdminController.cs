using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EatFitAI.API.Data;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.Common;
using EatFitAI.API.Security;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Controllers;

[Route("api/admin")]
[ApiController]
[Authorize(Policy = AdminPolicies.Access)]
public class AdminController : ControllerBase
{
    private static readonly IReadOnlyList<AdminMutationDefinitionDto> MutationRegistry = new List<AdminMutationDefinitionDto>
    {
        new()
        {
            Key = "users.access-state",
            Category = "users",
            Label = "Update user access state",
            Description = "Suspend, restore, or deactivate a user account with explicit confirmation and audit evidence.",
            Capability = AdminCapabilities.UsersDeactivate,
            Severity = "high",
            JustificationRequired = true,
            ConfirmPhraseTemplate = "USER:{email}:{state}",
            Rollback = "Restore the user to active state through the same governed workflow.",
            AuditSchema = "user-access-state.v1",
        },
        new()
        {
            Key = "users.role",
            Category = "users",
            Label = "Change platform role",
            Description = "Update the user's platform role and capability set from the DB-backed authority model.",
            Capability = AdminCapabilities.UsersRoleManage,
            Severity = "high",
            JustificationRequired = true,
            Rollback = "Reapply the previous role assignment and refresh claims.",
            AuditSchema = "user-role.v1",
        },
        new()
        {
            Key = "foods.verify",
            Category = "foods",
            Label = "Verify or unverify food",
            Description = "Curate food credibility without exposing raw database access.",
            Capability = AdminCapabilities.FoodsWrite,
            Severity = "medium",
            JustificationRequired = false,
            Rollback = "Toggle verification back to the prior state.",
            AuditSchema = "food-verify.v1",
        },
        new()
        {
            Key = "foods.delete",
            Category = "foods",
            Label = "Delete food item",
            Description = "Destructive food mutation that should eventually move to retire or soft-delete semantics with impact preview.",
            Capability = AdminCapabilities.FoodsWrite,
            Severity = "critical",
            JustificationRequired = true,
            ConfirmPhraseTemplate = "FOOD:{id}:DELETE",
            Rollback = "Restore from backup or re-create the food record.",
            AuditSchema = "food-delete.v1",
        },
        new()
        {
            Key = "runtime.keys.delete",
            Category = "runtime",
            Label = "Delete runtime credential",
            Description = "Delete a Gemini key only after disable or revoke workflows are exhausted.",
            Capability = AdminCapabilities.RuntimeKeysDelete,
            Severity = "critical",
            JustificationRequired = true,
            ConfirmPhraseTemplate = "KEY:{id}:DELETE",
            Rollback = "Re-import the credential and rebind runtime ownership if needed.",
            AuditSchema = "runtime-key-delete.v1",
        },
        new()
        {
            Key = "runtime.keys.manage",
            Category = "runtime",
            Label = "Manage runtime credential",
            Description = "Rotate, toggle, bulk-import, or test runtime credentials through curated operations.",
            Capability = AdminCapabilities.RuntimeKeysManage,
            Severity = "high",
            JustificationRequired = false,
            Rollback = "Disable or revert the credential configuration through the same governed API.",
            AuditSchema = "runtime-key-manage.v1",
        },
        new()
        {
            Key = "master-data.write",
            Category = "master-data",
            Label = "Mutate master data",
            Description = "Change meal types, serving units, and activity levels with reference checks and audit logging.",
            Capability = AdminCapabilities.MasterDataWrite,
            Severity = "high",
            JustificationRequired = true,
            Rollback = "Reapply the previous master-data value or restore from audit evidence.",
            AuditSchema = "master-data.v1",
        },
    };

    private readonly ApplicationDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAdminRuntimeSnapshotCache _runtimeSnapshotCache;
    private readonly IAdminRealtimeEventBus _eventBus;
    private readonly IAdminAuditService _auditService;

    public AdminController(
        ApplicationDbContext context,
        IHttpClientFactory httpClientFactory,
        IAdminRuntimeSnapshotCache runtimeSnapshotCache,
        IAdminRealtimeEventBus eventBus,
        IAdminAuditService auditService)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _runtimeSnapshotCache = runtimeSnapshotCache;
        _eventBus = eventBus;
        _auditService = auditService;
    }

    [HttpGet("session")]
    [Authorize(Policy = AdminPolicies.Access)]
    [ProducesResponseType(typeof(ApiResponse<AdminSessionDto>), 200)]
    public async Task<IActionResult> GetAdminSession()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value
            ?? User.FindFirst("email")?.Value;
        Models.User? user = null;

        if (Guid.TryParse(userIdClaim, out var userId))
        {
            user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(item => item.UserId == userId);
        }

        if (user == null && !string.IsNullOrWhiteSpace(email))
        {
            var normalizedEmail = email.Trim();
            user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(item => item.Email == normalizedEmail);
        }

        if (user == null)
        {
            return Unauthorized(ApiResponse<object>.ErrorResponse("Admin user was not found."));
        }

        var accessControl = await _context.UserAccessControls
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.UserId == user.UserId);
        var resolvedRole = PlatformRoles.ResolveEffectiveRole(User, user.Role);
        var session = new AdminSessionDto
        {
            UserId = user.UserId,
            Email = user.Email,
            DisplayName = user.DisplayName ?? user.Email,
            PlatformRole = resolvedRole,
            AccessState = accessControl?.AccessState ?? AdminAccessStates.Active,
            Capabilities = AdminCapabilities.GetForRole(resolvedRole).ToList(),
            RequestId = HttpContext.TraceIdentifier,
        };

        return Ok(ApiResponse<AdminSessionDto>.SuccessResponse(
            session,
            "Admin session ready.",
            requestId: HttpContext.TraceIdentifier));
    }

    [HttpGet("mutations")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<AdminMutationDefinitionDto>>), 200)]
    public IActionResult GetMutationRegistry()
    {
        var registry = MutationRegistry
            .Where(item => User.HasCapability(item.Capability))
            .ToList();

        return Ok(ApiResponse<IReadOnlyList<AdminMutationDefinitionDto>>.SuccessResponse(
            registry,
            "Admin mutation registry ready.",
            requestId: HttpContext.TraceIdentifier));
    }

    // ===================== DASHBOARD =====================

    [HttpGet("dashboard-stats")]
    [ProducesResponseType(typeof(ApiResponse<AdminDashboardStatsDto>), 200)]
    public async Task<IActionResult> GetDashboardStats()
    {
        try
        {
            var totalUsers = await _context.Users.CountAsync();
            var runtime = await _runtimeSnapshotCache.GetLatestAsync() ?? new AdminRuntimeSnapshotDto();

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
    [Authorize(Policy = AdminPolicies.UsersRead)]
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

        var accessControlLookup = await _context.UserAccessControls
            .AsNoTracking()
            .ToDictionaryAsync(item => item.UserId, item => item);

        var total = await query.CountAsync();
        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = users.Select(u =>
        {
            var accessControl = accessControlLookup.GetValueOrDefault(u.UserId);
            return new AdminUserDto
            {
                Id = u.UserId,
                Name = string.IsNullOrEmpty(u.DisplayName) ? "No Name" : u.DisplayName,
                Email = u.Email,
                Status = ResolveUserStatus(u, accessControl),
                AccessState = accessControl?.AccessState ?? AdminAccessStates.Active,
                Role = PlatformRoles.Normalize(u.Role),
                Capabilities = AdminCapabilities.GetForRole(u.Role).ToList(),
                LastActive = u.CreatedAt.ToString("MMM dd, yyyy")
            };
        }).ToList();

        return Ok(ApiResponse<object>.SuccessResponse(new { data = result, total, page, pageSize }, "Thành công"));
    }

    [HttpGet("users/{id}")]
    [Authorize(Policy = AdminPolicies.UsersRead)]
    public async Task<IActionResult> GetUserDetail(Guid id)
    {
        var u = await _context.Users.FirstOrDefaultAsync(x => x.UserId == id);
        if (u == null) return NotFound(ApiResponse<object>.ErrorResponse("User not found"));
        var accessControl = await _context.UserAccessControls.AsNoTracking().FirstOrDefaultAsync(item => item.UserId == id);

        int mealsLogged = 0;
        try { mealsLogged = await _context.MealDiaries.CountAsync(m => m.UserId == id); } catch { }

        var detail = new AdminUserDetailDto
        {
            Id = u.UserId,
            Name = string.IsNullOrEmpty(u.DisplayName) ? "No Name" : u.DisplayName,
            Email = u.Email,
            Status = ResolveUserStatus(u, accessControl),
            AccessState = accessControl?.AccessState ?? AdminAccessStates.Active,
            Role = PlatformRoles.Normalize(u.Role),
            Capabilities = AdminCapabilities.GetForRole(u.Role).ToList(),
            LastActive = u.CreatedAt.ToString("MMM dd, yyyy"),
            TotalMealsLogged = mealsLogged,
            OnboardingCompleted = u.OnboardingCompleted,
            AvatarUrl = u.AvatarUrl,
            CreatedAt = u.CreatedAt,
            SuspendedAt = accessControl?.SuspendedAt,
            SuspendedReason = accessControl?.SuspendedReason,
            SuspendedBy = accessControl?.SuspendedBy,
            DeactivatedAt = accessControl?.DeactivatedAt,
            DeactivatedBy = accessControl?.DeactivatedBy
        };

        return Ok(ApiResponse<AdminUserDetailDto>.SuccessResponse(detail, "Thành công"));
    }

    [HttpGet("support/users/{id}/overview")]
    [Authorize(Policy = AdminPolicies.SupportRead)]
    [ProducesResponseType(typeof(ApiResponse<AdminSupportOverviewDto>), 200)]
    public async Task<IActionResult> GetSupportOverview(Guid id)
    {
        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(item => item.UserId == id);
        if (user == null)
        {
            return NotFound(ApiResponse<object>.ErrorResponse("User not found"));
        }

        var accessControl = await _context.UserAccessControls.AsNoTracking().FirstOrDefaultAsync(item => item.UserId == id);
        var recentMeals = await _context.MealDiaries
            .AsNoTracking()
            .Where(item => item.UserId == id)
            .OrderByDescending(item => item.CreatedAt)
            .Take(6)
            .Select(item => new AdminSupportMealDto
            {
                MealDiaryId = item.MealDiaryId,
                EatenDate = item.EatenDate,
                MealType = item.MealType.Name,
                FoodName = item.FoodItem != null ? item.FoodItem.FoodName : null,
                Calories = item.Calories,
                IsDeleted = item.IsDeleted,
            })
            .ToListAsync();

        var recentCorrections = await _context.AiCorrectionEvents
            .AsNoTracking()
            .Where(item => item.UserId == id)
            .OrderByDescending(item => item.CreatedAt)
            .Take(6)
            .Select(item => new AdminSupportCorrectionDto
            {
                AiCorrectionEventId = item.AiCorrectionEventId,
                Label = item.Label,
                SelectedFoodName = item.SelectedFoodName,
                Source = item.Source,
                DetectedConfidence = item.DetectedConfidence,
                CreatedAt = item.CreatedAt,
            })
            .ToListAsync();

        var recentAuditEvents = await _context.AdminAuditEvents
            .AsNoTracking()
            .Where(item => item.EntityId == id.ToString() || item.ActorId == id.ToString())
            .OrderByDescending(item => item.OccurredAt)
            .Take(8)
            .Select(item => new AdminAuditEventDto
            {
                Id = item.AdminAuditEventId,
                Actor = item.Actor,
                ActorId = item.ActorId,
                ActorEmail = item.ActorEmail,
                EffectiveRole = item.EffectiveRole,
                CapabilitySnapshot = item.CapabilitySnapshot,
                Action = item.Action,
                Entity = item.Entity,
                EntityId = item.EntityId,
                Outcome = item.Outcome,
                Severity = item.Severity,
                OccurredAt = item.OccurredAt,
                RequestId = item.RequestId,
                CorrelationId = item.CorrelationId,
                Environment = item.Environment,
                DiffSummary = item.DiffSummary,
                Justification = item.Justification,
                Detail = item.Detail,
            })
            .ToListAsync();

        int mealsLogged = 0;
        try { mealsLogged = await _context.MealDiaries.CountAsync(item => item.UserId == id); } catch { }

        var overview = new AdminSupportOverviewDto
        {
            User = new AdminUserDetailDto
            {
                Id = user.UserId,
                Name = string.IsNullOrWhiteSpace(user.DisplayName) ? "No Name" : user.DisplayName,
                Email = user.Email,
                Status = ResolveUserStatus(user, accessControl),
                AccessState = accessControl?.AccessState ?? AdminAccessStates.Active,
                Role = PlatformRoles.Normalize(user.Role),
                Capabilities = AdminCapabilities.GetForRole(user.Role).ToList(),
                LastActive = user.CreatedAt.ToString("MMM dd, yyyy"),
                TotalMealsLogged = mealsLogged,
                OnboardingCompleted = user.OnboardingCompleted,
                AvatarUrl = user.AvatarUrl,
                CreatedAt = user.CreatedAt,
                SuspendedAt = accessControl?.SuspendedAt,
                SuspendedReason = accessControl?.SuspendedReason,
                SuspendedBy = accessControl?.SuspendedBy,
                DeactivatedAt = accessControl?.DeactivatedAt,
                DeactivatedBy = accessControl?.DeactivatedBy
            },
            RecentMeals = recentMeals,
            RecentCorrections = recentCorrections,
            RecentAuditEvents = recentAuditEvents,
        };

        return Ok(ApiResponse<AdminSupportOverviewDto>.SuccessResponse(
            overview,
            "Support overview ready.",
            requestId: HttpContext.TraceIdentifier));
    }

    [HttpPut("users/{id}/role")]
    [Authorize(Policy = AdminPolicies.UsersRoleManage)]
    public async Task<IActionResult> UpdateUserRole(Guid id, [FromBody] UpdateUserRoleRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(x => x.UserId == id);
        if (user == null)
        {
            await WriteAuditAsync("update-role", "user", id.ToString(), "failed", "User not found", severity: "warning", justification: request.Justification);
            return NotFound(ApiResponse<object>.ErrorResponse("User not found"));
        }

        user.Role = PlatformRoles.Normalize(request.Role);
        await _context.SaveChangesAsync();
        var auditRef = await WriteAuditAsync("update-role", "user", user.UserId.ToString(), "success", $"Role={user.Role}", severity: "high", justification: request.Justification);
        PublishResourceUpdated("user", user.UserId.ToString(), new { user.UserId, user.Role });
        return Ok(BuildMutationResponse(
            "Đã cập nhật role.",
            "high",
            auditRef,
            new { Id = user.UserId, Role = user.Role }));
    }

    [HttpPut("users/{id}/suspend")]
    [Authorize(Policy = AdminPolicies.UsersDeactivate)]
    public async Task<IActionResult> SuspendUser(Guid id)
    {
        var user = await _context.Users.FirstOrDefaultAsync(x => x.UserId == id);
        if (user == null)
        {
            await WriteAuditAsync("toggle-suspend-legacy", "user", id.ToString(), "failed", "User not found", severity: "warning");
            return NotFound(ApiResponse<object>.ErrorResponse("User not found"));
        }

        var accessControl = await _context.UserAccessControls.FirstOrDefaultAsync(item => item.UserId == user.UserId);
        if (accessControl == null)
        {
            accessControl = new Models.UserAccessControl
            {
                UserId = user.UserId,
            };
            _context.UserAccessControls.Add(accessControl);
        }

        var nextState = accessControl.AccessState == AdminAccessStates.Suspended
            ? AdminAccessStates.Active
            : AdminAccessStates.Suspended;

        accessControl.AccessState = nextState;
        accessControl.UpdatedAt = DateTime.UtcNow;
        if (nextState == AdminAccessStates.Suspended)
        {
            accessControl.SuspendedAt = DateTime.UtcNow;
            accessControl.SuspendedBy = User.Identity?.Name ?? User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
            accessControl.SuspendedReason = "Legacy suspend endpoint invoked.";
            accessControl.DeactivatedAt = null;
            accessControl.DeactivatedBy = null;
        }
        else
        {
            accessControl.SuspendedAt = null;
            accessControl.SuspendedBy = null;
            accessControl.SuspendedReason = null;
        }

        await _context.SaveChangesAsync();
        var status = ResolveUserStatus(user, accessControl);
        var auditRef = await WriteAuditAsync("toggle-suspend-legacy", "user", user.UserId.ToString(), "success", $"AccessState={nextState}", severity: "high");
        PublishResourceUpdated("user", user.UserId.ToString(), new { user.UserId, Status = status, AccessState = nextState });
        return Ok(BuildMutationResponse(
            $"User {status}.",
            "high",
            auditRef,
            new { Id = user.UserId, Status = status, AccessState = nextState },
            warning: "Use /users/{id}/access-state for governed mutations."));
    }

    [HttpDelete("users/{id}")]
    [Authorize(Policy = AdminPolicies.UsersDeactivate)]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        await WriteAuditAsync("delete-legacy-blocked", "user", id.ToString(), "failed", "Legacy hard-delete endpoint is blocked. Use deactivation workflow instead.", severity: "critical");
        return StatusCode(StatusCodes.Status410Gone, ApiResponse<object>.ErrorResponse("Hard delete is blocked. Use the governed deactivation workflow instead."));
    }

    [HttpPut("users/{id}/access-state")]
    [Authorize(Policy = AdminPolicies.UsersDeactivate)]
    public async Task<IActionResult> UpdateUserAccessState(Guid id, [FromBody] UpdateUserAccessRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(item => item.UserId == id);
        if (user == null)
        {
            await WriteAuditAsync("update-access", "user", id.ToString(), "failed", "User not found", severity: "warning", justification: request.Justification);
            return NotFound(ApiResponse<object>.ErrorResponse("User not found"));
        }

        var normalizedState = NormalizeAccessState(request.AccessState);
        var expectedConfirm = $"USER:{user.Email}:{normalizedState}".ToUpperInvariant();
        if (!string.Equals(request.ConfirmText?.Trim(), expectedConfirm, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(ApiResponse<object>.ErrorResponse($"Confirmation text mismatch. Expected {expectedConfirm}."));
        }

        var accessControl = await _context.UserAccessControls.FirstOrDefaultAsync(item => item.UserId == user.UserId);
        if (accessControl == null)
        {
            accessControl = new Models.UserAccessControl
            {
                UserId = user.UserId,
            };
            _context.UserAccessControls.Add(accessControl);
        }

        accessControl.AccessState = normalizedState;
        accessControl.UpdatedAt = DateTime.UtcNow;
        if (normalizedState == AdminAccessStates.Suspended)
        {
            accessControl.SuspendedAt = DateTime.UtcNow;
            accessControl.SuspendedReason = request.Justification;
            accessControl.SuspendedBy = User.Identity?.Name ?? User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
            accessControl.DeactivatedAt = null;
            accessControl.DeactivatedBy = null;
        }
        else if (normalizedState == AdminAccessStates.Deactivated)
        {
            accessControl.DeactivatedAt = DateTime.UtcNow;
            accessControl.DeactivatedBy = User.Identity?.Name ?? User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        }
        else
        {
            accessControl.SuspendedAt = null;
            accessControl.SuspendedReason = null;
            accessControl.SuspendedBy = null;
            accessControl.DeactivatedAt = null;
            accessControl.DeactivatedBy = null;
        }

        await _context.SaveChangesAsync();
        var auditRef = await WriteAuditAsync("update-access", "user", user.UserId.ToString(), "success", $"AccessState={normalizedState}", severity: "high", justification: request.Justification);
        var status = ResolveUserStatus(user, accessControl);
        PublishResourceUpdated("user", user.UserId.ToString(), new { user.UserId, Status = status, AccessState = normalizedState });

        return Ok(BuildMutationResponse(
            "User access updated.",
            "high",
            auditRef,
            new { Id = user.UserId, Status = status, AccessState = normalizedState }));
    }

    [HttpPost("users/{id}/deactivate")]
    [Authorize(Policy = AdminPolicies.UsersDeactivate)]
    public async Task<IActionResult> DeactivateUser(Guid id, [FromBody] UpdateUserAccessRequest request)
    {
        request.AccessState = AdminAccessStates.Deactivated;
        return await UpdateUserAccessState(id, request);
    }

    // ===================== FOODS CRUD =====================

    [HttpGet("foods")]
    [Authorize(Policy = AdminPolicies.FoodsRead)]
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
    [Authorize(Policy = AdminPolicies.FoodsWrite)]
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
        var auditRef = await WriteAuditAsync("create", "food", food.FoodItemId.ToString(), "success", $"FoodName={food.FoodName}");
        PublishResourceUpdated("food", food.FoodItemId.ToString(), new { food.FoodItemId, food.FoodName });
        return StatusCode(StatusCodes.Status201Created, BuildMutationResponse(
            "Thêm food mới thành công.",
            "medium",
            auditRef,
            new { Id = food.FoodItemId }));
    }

    [HttpPut("foods/{id}")]
    [Authorize(Policy = AdminPolicies.FoodsWrite)]
    public async Task<IActionResult> UpdateFood(int id, [FromBody] UpdateFoodRequest request)
    {
        var food = await _context.FoodItems.FindAsync(id);
        if (food == null)
        {
            await WriteAuditAsync("update", "food", id.ToString(), "failed", "Food not found");
            return NotFound(ApiResponse<object>.ErrorResponse("Food not found"));
        }

        if (request.FoodName != null) food.FoodName = request.FoodName.Trim();
        if (request.CaloriesPer100g.HasValue) food.CaloriesPer100g = request.CaloriesPer100g.Value;
        if (request.ProteinPer100g.HasValue) food.ProteinPer100g = request.ProteinPer100g.Value;
        if (request.FatPer100g.HasValue) food.FatPer100g = request.FatPer100g.Value;
        if (request.CarbPer100g.HasValue) food.CarbPer100g = request.CarbPer100g.Value;

        await _context.SaveChangesAsync();
        var auditRef = await WriteAuditAsync("update", "food", food.FoodItemId.ToString(), "success", $"FoodName={food.FoodName}");
        PublishResourceUpdated("food", food.FoodItemId.ToString(), new { food.FoodItemId, food.FoodName });
        return Ok(BuildMutationResponse(
            "Cập nhật food thành công.",
            "medium",
            auditRef,
            new { Id = food.FoodItemId }));
    }

    [HttpDelete("foods/{id}")]
    [Authorize(Policy = AdminPolicies.FoodsWrite)]
    public async Task<IActionResult> DeleteFood(int id)
    {
        var food = await _context.FoodItems.FindAsync(id);
        if (food == null)
        {
            await WriteAuditAsync("delete", "food", id.ToString(), "failed", "Food not found");
            return NotFound(ApiResponse<object>.ErrorResponse("Food not found"));
        }

        _context.FoodItems.Remove(food);
        await _context.SaveChangesAsync();
        var auditRef = await WriteAuditAsync("delete", "food", id.ToString(), "success", $"FoodName={food.FoodName}", severity: "critical");
        PublishResourceUpdated("food", id.ToString(), new { FoodItemId = id, Deleted = true });
        return Ok(BuildMutationResponse(
            "Xóa food thành công.",
            "critical",
            auditRef,
            new { FoodItemId = id, Deleted = true }));
    }

    [HttpPost("foods/{id}/verify")]
    [Authorize(Policy = AdminPolicies.FoodsWrite)]
    public async Task<IActionResult> VerifyFood(int id)
    {
        var food = await _context.FoodItems.FindAsync(id);
        if (food == null)
        {
            await WriteAuditAsync("verify", "food", id.ToString(), "failed", "Food not found");
            return NotFound(ApiResponse<object>.ErrorResponse("Food not found"));
        }

        food.IsVerified = !food.IsVerified;
        if (food.IsVerified) food.CredibilityScore = 100;
        await _context.SaveChangesAsync();
        var auditRef = await WriteAuditAsync("verify", "food", food.FoodItemId.ToString(), "success", $"IsVerified={food.IsVerified}", severity: "medium");
        PublishResourceUpdated("food", food.FoodItemId.ToString(), new { food.FoodItemId, food.IsVerified });
        return Ok(BuildMutationResponse(
            "Cập nhật verify thành công.",
            "medium",
            auditRef,
            new { Id = food.FoodItemId, IsVerified = food.IsVerified }));
    }

    // ===================== SYSTEM HEALTH =====================

    [HttpGet("system/health")]
    [Authorize(Policy = AdminPolicies.SettingsRead)]
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
            runtime = await _runtimeSnapshotCache.GetLatestAsync();
            if (runtime != null)
            {
                health.AiProviderStatus = runtime.AvailableProjectCount > 0 ? "Live" : "Down";
                health.ActiveProject = runtime.ActiveProject;
                health.AvailableProjectCount = runtime.AvailableProjectCount;
                health.ExhaustedProjectCount = runtime.ExhaustedProjectCount;
                health.CooldownProjectCount = runtime.CooldownProjectCount;
                health.Limits = runtime.Limits;
            }
            else
            {
                health.AiProviderStatus = "Unreachable";
            }
        }
        catch { health.AiProviderStatus = "Unreachable"; }

        try { health.TotalUsers = await _context.Users.CountAsync(); } catch { }
        try { health.TotalFoods = await _context.FoodItems.CountAsync(); } catch { }
        try { health.TotalKeys = await _context.GeminiKeys.CountAsync(); } catch { }

        health.CheckedAt = runtime?.CheckedAt ?? DateTime.UtcNow;

        return Ok(ApiResponse<SystemHealthDto>.SuccessResponse(health, "System health check complete"));
    }

    [HttpGet("inbox")]
    [Authorize(Policy = AdminPolicies.AuditRead)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<AdminInboxItemDto>>), 200)]
    public async Task<IActionResult> GetAdminInbox()
    {
        var auditItems = await _context.AdminAuditEvents
            .AsNoTracking()
            .Where(item =>
                item.Outcome == "failed"
                || item.Severity == "critical"
                || item.Severity == "high")
            .OrderByDescending(item => item.OccurredAt)
            .Take(10)
            .Select(item => new AdminInboxItemDto
            {
                Id = item.AdminAuditEventId.ToString(),
                Kind = "audit",
                Severity = item.Severity ?? "warning",
                Title = $"{item.Action} on {item.Entity}",
                Summary = item.Detail ?? $"{item.Entity} {item.EntityId} requires attention.",
                EntityType = item.Entity,
                EntityId = item.EntityId,
                RequestId = item.RequestId,
                AuditRef = item.AdminAuditEventId.ToString(),
                OccurredAt = item.OccurredAt,
            })
            .ToListAsync();

        var accessItems = await _context.UserAccessControls
            .AsNoTracking()
            .Join(
                _context.Users.AsNoTracking(),
                access => access.UserId,
                user => user.UserId,
                (access, user) => new { access, user })
            .Where(item => item.access.AccessState != AdminAccessStates.Active)
            .OrderByDescending(item => item.access.UpdatedAt)
            .Take(6)
            .Select(item => new AdminInboxItemDto
            {
                Id = $"access-{item.user.UserId}",
                Kind = "access-state",
                Severity = item.access.AccessState == AdminAccessStates.Deactivated ? "high" : "medium",
                Title = $"{item.user.Email} is {item.access.AccessState}",
                Summary = item.access.SuspendedReason ?? "Access state changed and should be reviewed in support flows.",
                EntityType = "user",
                EntityId = item.user.UserId.ToString(),
                OccurredAt = item.access.UpdatedAt,
            })
            .ToListAsync();

        var inbox = auditItems
            .Concat(accessItems)
            .OrderByDescending(item => item.OccurredAt)
            .Take(12)
            .ToList();

        return Ok(ApiResponse<IReadOnlyList<AdminInboxItemDto>>.SuccessResponse(
            inbox,
            "Admin inbox ready.",
            requestId: HttpContext.TraceIdentifier));
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

    private async Task<string?> WriteAuditAsync(
        string action,
        string entity,
        string entityId,
        string outcome,
        string? detail = null,
        string severity = "info",
        string? justification = null)
    {
        var auditRef = Guid.NewGuid().ToString("N");
        await _auditService.WriteAsync(HttpContext, new AdminAuditWriteRequest
        {
            Action = action,
            Entity = entity,
            EntityId = entityId,
            Outcome = outcome,
            Severity = severity,
            Justification = justification,
            DiffSummary = auditRef,
            Detail = detail
        });
        return auditRef;
    }

    private ApiResponse<AdminMutationResponseDto> BuildMutationResponse(
        string message,
        string severity,
        string? auditRef,
        object? data = null,
        string? warning = null)
    {
        var warnings = string.IsNullOrWhiteSpace(warning)
            ? null
            : new List<string> { warning };

        return ApiResponse<AdminMutationResponseDto>.SuccessResponse(
            new AdminMutationResponseDto
            {
                Status = "success",
                Severity = severity,
                RequestId = HttpContext.TraceIdentifier,
                AuditRef = auditRef,
                Warning = warning,
                Data = data
            },
            message,
            requestId: HttpContext.TraceIdentifier,
            severity: severity,
            auditRef: auditRef,
            warnings: warnings);
    }

    private static string NormalizeAccessState(string? accessState)
    {
        return accessState?.Trim().ToLowerInvariant() switch
        {
            AdminAccessStates.Suspended => AdminAccessStates.Suspended,
            AdminAccessStates.Deactivated => AdminAccessStates.Deactivated,
            _ => AdminAccessStates.Active,
        };
    }

    private static string ResolveUserStatus(Models.User user, Models.UserAccessControl? accessControl)
    {
        var accessState = accessControl?.AccessState ?? AdminAccessStates.Active;
        if (accessState == AdminAccessStates.Deactivated)
        {
            return "Deactivated";
        }

        if (accessState == AdminAccessStates.Suspended)
        {
            return "Suspended";
        }

        return user.EmailVerified ? "Active" : "Unverified";
    }
}
