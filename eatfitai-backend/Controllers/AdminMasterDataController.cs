using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.Common;
using EatFitAI.API.Security;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/admin/master-data")]
    [Authorize(Policy = AdminPolicies.Access)]
    public class AdminMasterDataController : ControllerBase
    {
        private readonly EatFitAIDbContext _context;
        private readonly ILogger<AdminMasterDataController> _logger;
        private readonly IAdminAuditService _auditService;

        public AdminMasterDataController(EatFitAIDbContext context, ILogger<AdminMasterDataController> logger, IAdminAuditService auditService)
        {
            _context = context;
            _logger = logger;
            _auditService = auditService;
        }

        // --- Meal Type ---

        [HttpGet("meal-types")]
        [Authorize(Policy = AdminPolicies.MasterDataRead)]
        public async Task<ActionResult<List<MealTypeDto>>> GetMealTypes()
        {
            var items = await _context.MealTypes
                .Select(m => new MealTypeDto
                {
                    MealTypeId = m.MealTypeId,
                    Name = m.Name
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpPost("meal-types")]
        [Authorize(Policy = AdminPolicies.MasterDataWrite)]
        public async Task<ActionResult<MealTypeDto>> CreateMealType([FromBody] CreateMealTypeRequest request)
        {
            var entity = new MealType
            {
                Name = request.Name
            };

            _context.MealTypes.Add(entity);
            await _context.SaveChangesAsync();
            var auditRef = await WriteAuditAsync("create", "meal-type", entity.MealTypeId.ToString(), "success", $"Name={entity.Name}", severity: "high");

            _logger.LogInformation("Admin user {User} created MealType ID {Id}", User.Identity?.Name, entity.MealTypeId);

            return StatusCode(StatusCodes.Status201Created, BuildMutationResponse(
                "Meal type created.",
                "high",
                auditRef,
                new MealTypeDto
                {
                    MealTypeId = entity.MealTypeId,
                    Name = entity.Name
                }));
        }

        [HttpPut("meal-types/{id}")]
        [Authorize(Policy = AdminPolicies.MasterDataWrite)]
        public async Task<IActionResult> UpdateMealType(int id, [FromBody] UpdateMealTypeRequest request)
        {
            var entity = await _context.MealTypes.FindAsync(id);
            if (entity == null)
            {
                await WriteAuditAsync("update", "meal-type", id.ToString(), "failed", "Meal type not found");
                return NotFound(new { error = "Meal type not found" });
            }

            entity.Name = request.Name;
            await _context.SaveChangesAsync();
            var auditRef = await WriteAuditAsync("update", "meal-type", id.ToString(), "success", $"Name={entity.Name}", severity: "high");
            _logger.LogInformation("Admin user {User} updated MealType ID {Id}", User.Identity?.Name, id);

            return Ok(BuildMutationResponse(
                "Meal type updated.",
                "high",
                auditRef,
                new MealTypeDto
                {
                    MealTypeId = entity.MealTypeId,
                    Name = entity.Name
                }));
        }

        [HttpDelete("meal-types/{id}")]
        [Authorize(Policy = AdminPolicies.MasterDataWrite)]
        public async Task<IActionResult> DeleteMealType(int id)
        {
            var entity = await _context.MealTypes.Include(m => m.MealDiaries).FirstOrDefaultAsync(m => m.MealTypeId == id);
            if (entity == null)
            {
                await WriteAuditAsync("delete", "meal-type", id.ToString(), "failed", "Meal type not found");
                return NotFound(new { error = "Meal type not found" });
            }

            if (entity.MealDiaries.Any())
            {
                await WriteAuditAsync("delete", "meal-type", id.ToString(), "failed", "Meal type is still referenced by meal diaries");
                return BadRequest(new { error = "Cannot delete meal type as it is used in meal diaries." });
            }

            _context.MealTypes.Remove(entity);
            await _context.SaveChangesAsync();
            var auditRef = await WriteAuditAsync("delete", "meal-type", id.ToString(), "success", $"Name={entity.Name}", severity: "critical");
            _logger.LogInformation("Admin user {User} deleted MealType ID {Id}", User.Identity?.Name, id);

            return Ok(BuildMutationResponse(
                "Meal type deleted.",
                "critical",
                auditRef,
                new { Id = id, Deleted = true }));
        }

        // --- Activity Level ---

        [HttpGet("activity-levels")]
        [Authorize(Policy = AdminPolicies.MasterDataRead)]
        public async Task<ActionResult<List<ActivityLevelDto>>> GetActivityLevels()
        {
            var items = await _context.ActivityLevels
                .Select(a => new ActivityLevelDto
                {
                    ActivityLevelId = a.ActivityLevelId,
                    Name = a.Name,
                    ActivityFactor = a.ActivityFactor
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpPost("activity-levels")]
        [Authorize(Policy = AdminPolicies.MasterDataWrite)]
        public async Task<ActionResult<ActivityLevelDto>> CreateActivityLevel([FromBody] CreateActivityLevelRequest request)
        {
            var entity = new ActivityLevel
            {
                Name = request.Name,
                ActivityFactor = request.ActivityFactor
            };

            _context.ActivityLevels.Add(entity);
            await _context.SaveChangesAsync();
            var auditRef = await WriteAuditAsync("create", "activity-level", entity.ActivityLevelId.ToString(), "success", $"Name={entity.Name}", severity: "high");

            _logger.LogInformation("Admin user {User} created ActivityLevel ID {Id}", User.Identity?.Name, entity.ActivityLevelId);

            return StatusCode(StatusCodes.Status201Created, BuildMutationResponse(
                "Activity level created.",
                "high",
                auditRef,
                new ActivityLevelDto
                {
                    ActivityLevelId = entity.ActivityLevelId,
                    Name = entity.Name,
                    ActivityFactor = entity.ActivityFactor
                }));
        }

        [HttpPut("activity-levels/{id}")]
        [Authorize(Policy = AdminPolicies.MasterDataWrite)]
        public async Task<IActionResult> UpdateActivityLevel(int id, [FromBody] UpdateActivityLevelRequest request)
        {
            var entity = await _context.ActivityLevels.FindAsync(id);
            if (entity == null)
            {
                await WriteAuditAsync("update", "activity-level", id.ToString(), "failed", "Activity level not found");
                return NotFound(new { error = "Activity level not found" });
            }

            entity.Name = request.Name;
            entity.ActivityFactor = request.ActivityFactor;
            
            await _context.SaveChangesAsync();
            var auditRef = await WriteAuditAsync("update", "activity-level", id.ToString(), "success", $"Name={entity.Name};Factor={entity.ActivityFactor}", severity: "high");
            _logger.LogInformation("Admin user {User} updated ActivityLevel ID {Id}", User.Identity?.Name, id);

            return Ok(BuildMutationResponse(
                "Activity level updated.",
                "high",
                auditRef,
                new ActivityLevelDto
                {
                    ActivityLevelId = entity.ActivityLevelId,
                    Name = entity.Name,
                    ActivityFactor = entity.ActivityFactor
                }));
        }

        [HttpDelete("activity-levels/{id}")]
        [Authorize(Policy = AdminPolicies.MasterDataWrite)]
        public async Task<IActionResult> DeleteActivityLevel(int id)
        {
            var entity = await _context.ActivityLevels.Include(a => a.NutritionTargets).FirstOrDefaultAsync(a => a.ActivityLevelId == id);
            if (entity == null)
            {
                await WriteAuditAsync("delete", "activity-level", id.ToString(), "failed", "Activity level not found");
                return NotFound(new { error = "Activity level not found" });
            }

            if (entity.NutritionTargets.Any())
            {
                await WriteAuditAsync("delete", "activity-level", id.ToString(), "failed", "Activity level is still referenced by nutrition targets");
                return BadRequest(new { error = "Cannot delete activity level as it is used in nutrition targets." });
            }

            _context.ActivityLevels.Remove(entity);
            await _context.SaveChangesAsync();
            var auditRef = await WriteAuditAsync("delete", "activity-level", id.ToString(), "success", $"Name={entity.Name}", severity: "critical");
            _logger.LogInformation("Admin user {User} deleted ActivityLevel ID {Id}", User.Identity?.Name, id);

            return Ok(BuildMutationResponse(
                "Activity level deleted.",
                "critical",
                auditRef,
                new { Id = id, Deleted = true }));
        }

        // --- Serving Unit ---

        [HttpGet("serving-units")]
        [Authorize(Policy = AdminPolicies.MasterDataRead)]
        public async Task<ActionResult<List<ServingUnitDto>>> GetServingUnits()
        {
            var items = await _context.ServingUnits
                .Select(s => new ServingUnitDto
                {
                    ServingUnitId = s.ServingUnitId,
                    Name = s.Name,
                    Symbol = s.Symbol,
                    IsBaseUnit = s.IsBaseUnit
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpPost("serving-units")]
        [Authorize(Policy = AdminPolicies.MasterDataWrite)]
        public async Task<ActionResult<ServingUnitDto>> CreateServingUnit([FromBody] CreateServingUnitRequest request)
        {
            var entity = new ServingUnit
            {
                Name = request.Name,
                Symbol = request.Symbol,
                IsBaseUnit = request.IsBaseUnit
            };

            _context.ServingUnits.Add(entity);
            await _context.SaveChangesAsync();
            var auditRef = await WriteAuditAsync("create", "serving-unit", entity.ServingUnitId.ToString(), "success", $"Name={entity.Name};Symbol={entity.Symbol}", severity: "high");

            _logger.LogInformation("Admin user {User} created ServingUnit ID {Id}", User.Identity?.Name, entity.ServingUnitId);

            return StatusCode(StatusCodes.Status201Created, BuildMutationResponse(
                "Serving unit created.",
                "high",
                auditRef,
                new ServingUnitDto
                {
                    ServingUnitId = entity.ServingUnitId,
                    Name = entity.Name,
                    Symbol = entity.Symbol,
                    IsBaseUnit = entity.IsBaseUnit
                }));
        }

        [HttpPut("serving-units/{id}")]
        [Authorize(Policy = AdminPolicies.MasterDataWrite)]
        public async Task<IActionResult> UpdateServingUnit(int id, [FromBody] UpdateServingUnitRequest request)
        {
            var entity = await _context.ServingUnits.FindAsync(id);
            if (entity == null)
            {
                await WriteAuditAsync("update", "serving-unit", id.ToString(), "failed", "Serving unit not found");
                return NotFound(new { error = "Serving unit not found" });
            }

            entity.Name = request.Name;
            entity.Symbol = request.Symbol;
            entity.IsBaseUnit = request.IsBaseUnit;

            await _context.SaveChangesAsync();
            var auditRef = await WriteAuditAsync("update", "serving-unit", id.ToString(), "success", $"Name={entity.Name};Symbol={entity.Symbol}", severity: "high");
            _logger.LogInformation("Admin user {User} updated ServingUnit ID {Id}", User.Identity?.Name, id);

            return Ok(BuildMutationResponse(
                "Serving unit updated.",
                "high",
                auditRef,
                new ServingUnitDto
                {
                    ServingUnitId = entity.ServingUnitId,
                    Name = entity.Name,
                    Symbol = entity.Symbol,
                    IsBaseUnit = entity.IsBaseUnit
                }));
        }

        [HttpDelete("serving-units/{id}")]
        [Authorize(Policy = AdminPolicies.MasterDataWrite)]
        public async Task<IActionResult> DeleteServingUnit(int id)
        {
            var entity = await _context.ServingUnits
                .Include(s => s.FoodServings)
                .Include(s => s.MealDiaries)
                .FirstOrDefaultAsync(s => s.ServingUnitId == id);
                
            if (entity == null)
            {
                await WriteAuditAsync("delete", "serving-unit", id.ToString(), "failed", "Serving unit not found");
                return NotFound(new { error = "Serving unit not found" });
            }

            if (entity.FoodServings.Any() || entity.MealDiaries.Any())
            {
                await WriteAuditAsync("delete", "serving-unit", id.ToString(), "failed", "Serving unit is still referenced");
                return BadRequest(new { error = "Cannot delete serving unit as it is used in food servings or meal diaries." });
            }

            _context.ServingUnits.Remove(entity);
            await _context.SaveChangesAsync();
            var auditRef = await WriteAuditAsync("delete", "serving-unit", id.ToString(), "success", $"Name={entity.Name}", severity: "critical");
            _logger.LogInformation("Admin user {User} deleted ServingUnit ID {Id}", User.Identity?.Name, id);

            return Ok(BuildMutationResponse(
                "Serving unit deleted.",
                "critical",
                auditRef,
                new { Id = id, Deleted = true }));
        }

        private async Task<string?> WriteAuditAsync(
            string action,
            string entity,
            string entityId,
            string outcome,
            string? detail = null,
            string severity = "info")
        {
            var auditRef = Guid.NewGuid().ToString("N");
            await _auditService.WriteAsync(HttpContext, new AdminAuditWriteRequest
            {
                Action = action,
                Entity = entity,
                EntityId = entityId,
                Outcome = outcome,
                Severity = severity,
                DiffSummary = auditRef,
                Detail = detail
            });
            return auditRef;
        }

        private ApiResponse<AdminMutationResponseDto> BuildMutationResponse(
            string message,
            string severity,
            string? auditRef,
            object? data = null)
        {
            return ApiResponse<AdminMutationResponseDto>.SuccessResponse(
                new AdminMutationResponseDto
                {
                    Status = "success",
                    Severity = severity,
                    RequestId = HttpContext.TraceIdentifier,
                    AuditRef = auditRef,
                    Data = data
                },
                message,
                requestId: HttpContext.TraceIdentifier,
                severity: severity,
                auditRef: auditRef);
        }
    }
}
