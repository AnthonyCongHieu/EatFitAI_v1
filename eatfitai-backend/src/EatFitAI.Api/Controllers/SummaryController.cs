using System.Data;
using Dapper;
using EatFitAI.Api.Contracts.Summary;
using EatFitAI.Api.Extensions;
using EatFitAI.Application.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.Api.Controllers;

[ApiController]
[Route("api/summary")]
[Authorize]
public sealed class SummaryController : ControllerBase
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public SummaryController(ISqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    [HttpGet("day")]
    public async Task<IActionResult> Day([FromQuery] DateOnly date, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        using var conn = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var row = await conn.QuerySingleOrDefaultAsync<DayDb>(
            "sp_Summary_Day",
            new { UserId = userId, MealDate = date.ToDateTime(TimeOnly.MinValue) },
            commandType: CommandType.StoredProcedure);

        var resp = new DaySummaryResponse
        {
            MealDate = date,
            TotalQuantityGrams = row?.TotalQuantityGrams ?? 0,
            TotalCaloriesKcal = row?.TotalCaloriesKcal ?? 0,
            TotalProteinGrams = row?.TotalProteinGrams ?? 0,
            TotalCarbohydrateGrams = row?.TotalCarbohydrateGrams ?? 0,
            TotalFatGrams = row?.TotalFatGrams ?? 0
        };

        return Ok(resp);
    }

    [HttpGet("week")]
    public async Task<IActionResult> Week([FromQuery] DateOnly date, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        using var conn = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var rows = await conn.QueryAsync<DayDb>(
            "sp_Summary_Week",
            new { UserId = userId, EndDate = date.ToDateTime(TimeOnly.MinValue) },
            commandType: CommandType.StoredProcedure);

        var items = rows.Select(r => new WeekSummaryItem
        {
            MealDate = DateOnly.FromDateTime(r.MealDate),
            TotalQuantityGrams = r.TotalQuantityGrams,
            TotalCaloriesKcal = r.TotalCaloriesKcal,
            TotalProteinGrams = r.TotalProteinGrams,
            TotalCarbohydrateGrams = r.TotalCarbohydrateGrams,
            TotalFatGrams = r.TotalFatGrams
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

