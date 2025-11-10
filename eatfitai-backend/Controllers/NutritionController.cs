using System.Diagnostics;
using System.Security.Claims;
using EatFitAI.API.Contracts;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/ai/nutrition")]
    [Authorize]
    public sealed class NutritionController : ControllerBase
    {
        private readonly INutritionCalcService _calc;
        private readonly IAiLogService _aiLog;
        private readonly EatFitAIDbContext _db;

        public NutritionController(INutritionCalcService calc, IAiLogService aiLog, EatFitAIDbContext db)
        {
            _calc = calc;
            _aiLog = aiLog;
            _db = db;
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

        [HttpPost("suggest")]
        [ProducesResponseType(typeof(NutritionSuggestResponse), StatusCodes.Status200OK)]
        public async Task<ActionResult<NutritionSuggestResponse>> Suggest([FromBody] NutritionSuggestRequest req)
        {
            var sw = Stopwatch.StartNew();
            var (cal, p, c, f) = _calc.Suggest(req.Sex, req.Age, req.HeightCm, req.WeightKg, req.ActivityLevel, req.Goal);
            var res = new NutritionSuggestResponse(cal, p, c, f);
            sw.Stop();

            try { await _aiLog.LogAsync(GetUserIdFromToken(), "NutritionSuggest", req, res, sw.ElapsedMilliseconds); } catch { }
            return Ok(res);
        }

        [HttpPost("apply")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> Apply([FromBody] NutritionApplyRequest req)
        {
            var userId = GetUserIdFromToken();
            var eff = req.EffectiveFrom ?? DateOnly.FromDateTime(DateTime.UtcNow.Date);

            var entity = new NutritionTarget
            {
                UserId = userId,
                TargetCalories = req.Calories,
                TargetProtein = req.Protein,
                TargetCarb = req.Carb,
                TargetFat = req.Fat,
                EffectiveFrom = eff,
                EffectiveTo = null
            };
            _db.NutritionTargets.Add(entity);
            await _db.SaveChangesAsync();

            try { await _aiLog.LogAsync(userId, "NutritionApply", req, new { id = entity.NutritionTargetId }, 0); } catch { }
            return NoContent();
        }

        [HttpGet("current")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetCurrent()
        {
            var userId = GetUserIdFromToken();
            var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
            var current = await _db.NutritionTargets
                .Where(t => t.UserId == userId && t.EffectiveFrom <= today && (t.EffectiveTo == null || t.EffectiveTo >= today))
                .OrderByDescending(t => t.EffectiveFrom)
                .FirstOrDefaultAsync();

            if (current == null)
            {
                return NotFound();
            }

            return Ok(new
            {
                calories = current.TargetCalories,
                protein = current.TargetProtein,
                carbs = current.TargetCarb,
                fat = current.TargetFat,
                effectiveFrom = current.EffectiveFrom
            });
        }
    }
}
