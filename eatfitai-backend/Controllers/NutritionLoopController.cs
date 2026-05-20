using System.Security.Claims;
using EatFitAI.API.DTOs.Common;
using EatFitAI.API.Helpers;
using EatFitAI.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers;

[ApiController]
[Route("api/nutrition")]
[Authorize]
public sealed class NutritionLoopController : ControllerBase
{
    private readonly IDailyNutritionLoopService _dailyLoopService;
    private readonly IFlexibleNutritionPlanService _planService;
    private readonly IBusinessDateService _businessDateService;

    public NutritionLoopController(
        IDailyNutritionLoopService dailyLoopService,
        IFlexibleNutritionPlanService planService,
        IBusinessDateService businessDateService)
    {
        _dailyLoopService = dailyLoopService;
        _planService = planService;
        _businessDateService = businessDateService;
    }

    [HttpGet("daily-loop")]
    public async Task<ActionResult<DailyNutritionLoopDto>> GetDailyLoop(
        [FromQuery] DateTime? date,
        CancellationToken cancellationToken)
    {
        try
        {
            var userId = GetUserId();
            var localDate = date.HasValue
                ? _businessDateService.ToDateOnly(date.Value)
                : await _businessDateService.GetTodayAsync(userId, cancellationToken);

            var result = await _dailyLoopService.GetDailyLoopAsync(
                userId,
                localDate,
                cancellationToken);

            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseHelper.SafeError("Token người dùng không hợp lệ", HttpContext));
        }
        catch (Exception)
        {
            return StatusCode(500, ErrorResponseHelper.SafeError(
                "Đã xảy ra lỗi khi lấy vòng lặp dinh dưỡng hôm nay",
                HttpContext));
        }
    }

    [HttpGet("flexible-plan")]
    public ActionResult<FlexibleNutritionPlanDto> GetFlexiblePlan(
        [FromQuery] string? goal,
        [FromQuery] string? preference,
        [FromQuery] int? targetCalories,
        [FromQuery] int? targetProtein,
        [FromQuery] int? targetCarbs,
        [FromQuery] int? targetFat)
    {
        try
        {
            _ = GetUserId();

            var result = _planService.BuildPlan(new FlexibleNutritionPlanRequest
            {
                Goal = goal,
                Preference = preference,
                TargetCalories = targetCalories.GetValueOrDefault(),
                TargetProtein = targetProtein.GetValueOrDefault(),
                TargetCarbs = targetCarbs.GetValueOrDefault(),
                TargetFat = targetFat.GetValueOrDefault()
            });

            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseHelper.SafeError("Token người dùng không hợp lệ", HttpContext));
        }
        catch (Exception)
        {
            return StatusCode(500, ErrorResponseHelper.SafeError(
                "Đã xảy ra lỗi khi lấy lộ trình dinh dưỡng linh hoạt",
                HttpContext));
        }
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        return Guid.TryParse(userIdClaim, out var userId)
            ? userId
            : throw new UnauthorizedAccessException("Token người dùng không hợp lệ");
    }
}
