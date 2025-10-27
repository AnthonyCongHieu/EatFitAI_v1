using EatFitAI.Api.Contracts.Summary;
using EatFitAI.Api.Extensions;
using EatFitAI.Application.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.Api.Controllers;

[ApiController]
[Route("api/summary")]
[Authorize]
public sealed class SummaryController : ControllerBase
{
    private readonly ISummaryRepository _summaryRepository;

    public SummaryController(ISummaryRepository summaryRepository)
    {
        _summaryRepository = summaryRepository;
    }

    [HttpGet("day")]
    public async Task<IActionResult> Day([FromQuery] DateOnly date, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var summary = await _summaryRepository.GetDaySummaryAsync(userId, date, cancellationToken);

        var resp = new DaySummaryResponse
        {
            NgayAn = date,
            TongCalo = summary?.TotalCaloriesKcal ?? 0,
            TongProtein = summary?.TotalProteinGrams ?? 0,
            TongCarb = summary?.TotalCarbohydrateGrams ?? 0,
            TongFat = summary?.TotalFatGrams ?? 0
        };

        return Ok(resp);
    }

    [HttpGet("week")]
    public async Task<IActionResult> Week([FromQuery] DateOnly date, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var summaries = await _summaryRepository.GetWeekSummaryAsync(userId, date, cancellationToken);

        var items = summaries.Select(s => new WeekSummaryItem
        {
            NgayAn = s.MealDate,
            TongCalo = s.TotalCaloriesKcal,
            TongProtein = s.TotalProteinGrams,
            TongCarb = s.TotalCarbohydrateGrams,
            TongFat = s.TotalFatGrams
        }).ToList();

        return Ok(new WeekSummaryResponse { Days = items });
    }

    private sealed class DayDb
    {
        public DateTime MealDate { get; set; }
        public decimal TotalQuantityGrams { get; set; }
        public decimal TotalCaloriesKcal { get; set; }
        public decimal TotalProteinGrams { get; set; }
        public decimal TotalCarbohydrateGrams { get; set; }
        public decimal TotalFatGrams { get; set; }
    }
}
