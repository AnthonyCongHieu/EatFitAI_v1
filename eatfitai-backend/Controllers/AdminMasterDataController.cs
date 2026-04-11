using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/admin/master-data")]
    [Authorize(Roles = "Admin")]
    public class AdminMasterDataController : ControllerBase
    {
        private readonly EatFitAIDbContext _context;
        private readonly ILogger<AdminMasterDataController> _logger;

        public AdminMasterDataController(EatFitAIDbContext context, ILogger<AdminMasterDataController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // --- Meal Type ---

        [HttpGet("meal-types")]
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
        public async Task<ActionResult<MealTypeDto>> CreateMealType([FromBody] CreateMealTypeRequest request)
        {
            var entity = new MealType
            {
                Name = request.Name
            };

            _context.MealTypes.Add(entity);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Admin user {User} created MealType ID {Id}", User.Identity?.Name, entity.MealTypeId);

            return CreatedAtAction(nameof(GetMealTypes), new { id = entity.MealTypeId }, new MealTypeDto
            {
                MealTypeId = entity.MealTypeId,
                Name = entity.Name
            });
        }

        [HttpPut("meal-types/{id}")]
        public async Task<IActionResult> UpdateMealType(int id, [FromBody] UpdateMealTypeRequest request)
        {
            var entity = await _context.MealTypes.FindAsync(id);
            if (entity == null) return NotFound(new { error = "Meal type not found" });

            entity.Name = request.Name;
            await _context.SaveChangesAsync();
            _logger.LogInformation("Admin user {User} updated MealType ID {Id}", User.Identity?.Name, id);

            return NoContent();
        }

        [HttpDelete("meal-types/{id}")]
        public async Task<IActionResult> DeleteMealType(int id)
        {
            var entity = await _context.MealTypes.Include(m => m.MealDiaries).FirstOrDefaultAsync(m => m.MealTypeId == id);
            if (entity == null) return NotFound(new { error = "Meal type not found" });

            if (entity.MealDiaries.Any())
            {
                return BadRequest(new { error = "Cannot delete meal type as it is used in meal diaries." });
            }

            _context.MealTypes.Remove(entity);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Admin user {User} deleted MealType ID {Id}", User.Identity?.Name, id);

            return NoContent();
        }

        // --- Activity Level ---

        [HttpGet("activity-levels")]
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
        public async Task<ActionResult<ActivityLevelDto>> CreateActivityLevel([FromBody] CreateActivityLevelRequest request)
        {
            var entity = new ActivityLevel
            {
                Name = request.Name,
                ActivityFactor = request.ActivityFactor
            };

            _context.ActivityLevels.Add(entity);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Admin user {User} created ActivityLevel ID {Id}", User.Identity?.Name, entity.ActivityLevelId);

            return CreatedAtAction(nameof(GetActivityLevels), new { id = entity.ActivityLevelId }, new ActivityLevelDto
            {
                ActivityLevelId = entity.ActivityLevelId,
                Name = entity.Name,
                ActivityFactor = entity.ActivityFactor
            });
        }

        [HttpPut("activity-levels/{id}")]
        public async Task<IActionResult> UpdateActivityLevel(int id, [FromBody] UpdateActivityLevelRequest request)
        {
            var entity = await _context.ActivityLevels.FindAsync(id);
            if (entity == null) return NotFound(new { error = "Activity level not found" });

            entity.Name = request.Name;
            entity.ActivityFactor = request.ActivityFactor;
            
            await _context.SaveChangesAsync();
            _logger.LogInformation("Admin user {User} updated ActivityLevel ID {Id}", User.Identity?.Name, id);

            return NoContent();
        }

        [HttpDelete("activity-levels/{id}")]
        public async Task<IActionResult> DeleteActivityLevel(int id)
        {
            var entity = await _context.ActivityLevels.Include(a => a.NutritionTargets).FirstOrDefaultAsync(a => a.ActivityLevelId == id);
            if (entity == null) return NotFound(new { error = "Activity level not found" });

            if (entity.NutritionTargets.Any())
            {
                return BadRequest(new { error = "Cannot delete activity level as it is used in nutrition targets." });
            }

            _context.ActivityLevels.Remove(entity);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Admin user {User} deleted ActivityLevel ID {Id}", User.Identity?.Name, id);

            return NoContent();
        }

        // --- Serving Unit ---

        [HttpGet("serving-units")]
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

            _logger.LogInformation("Admin user {User} created ServingUnit ID {Id}", User.Identity?.Name, entity.ServingUnitId);

            return CreatedAtAction(nameof(GetServingUnits), new { id = entity.ServingUnitId }, new ServingUnitDto
            {
                ServingUnitId = entity.ServingUnitId,
                Name = entity.Name,
                Symbol = entity.Symbol,
                IsBaseUnit = entity.IsBaseUnit
            });
        }

        [HttpPut("serving-units/{id}")]
        public async Task<IActionResult> UpdateServingUnit(int id, [FromBody] UpdateServingUnitRequest request)
        {
            var entity = await _context.ServingUnits.FindAsync(id);
            if (entity == null) return NotFound(new { error = "Serving unit not found" });

            entity.Name = request.Name;
            entity.Symbol = request.Symbol;
            entity.IsBaseUnit = request.IsBaseUnit;

            await _context.SaveChangesAsync();
            _logger.LogInformation("Admin user {User} updated ServingUnit ID {Id}", User.Identity?.Name, id);

            return NoContent();
        }

        [HttpDelete("serving-units/{id}")]
        public async Task<IActionResult> DeleteServingUnit(int id)
        {
            var entity = await _context.ServingUnits
                .Include(s => s.FoodServings)
                .Include(s => s.MealDiaries)
                .FirstOrDefaultAsync(s => s.ServingUnitId == id);
                
            if (entity == null) return NotFound(new { error = "Serving unit not found" });

            if (entity.FoodServings.Any() || entity.MealDiaries.Any())
            {
                return BadRequest(new { error = "Cannot delete serving unit as it is used in food servings or meal diaries." });
            }

            _context.ServingUnits.Remove(entity);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Admin user {User} deleted ServingUnit ID {Id}", User.Identity?.Name, id);

            return NoContent();
        }
    }
}
