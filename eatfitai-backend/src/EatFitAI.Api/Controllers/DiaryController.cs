using System.Data;
using Dapper;
using EatFitAI.Api.Contracts.Diary;
using EatFitAI.Api.Extensions;
using EatFitAI.Application.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.Api.Controllers;

[ApiController]
[Route("api/diary")]
[Authorize]
public sealed class DiaryController : ControllerBase
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public DiaryController(ISqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] DiaryCreateRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var userId = User.GetUserId();
        using var conn = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var row = await conn.QuerySingleAsync<DiaryDb>(
            "sp_NhatKy_Tao",
            new
            {
                UserId = userId,
                MealDate = request.MealDate.ToDateTime(TimeOnly.MinValue),
                request.MealCode,
                request.Source,
                request.ItemId,
                request.QuantityGrams,
                request.Notes
            },
            commandType: CommandType.StoredProcedure);

        var resp = new DiaryEntryResponse
        {
            Id = row.Id,
            MealDate = DateOnly.FromDateTime(row.MealDate),
            MealCode = row.MealCode,
            FoodId = row.FoodId,
            CustomDishId = row.CustomDishId,
            AiRecipeId = row.AiRecipeId,
            ItemId = row.ItemId,
            Source = row.Source,
            QuantityGrams = row.QuantityGrams,
            CaloriesKcal = row.CaloriesKcal,
            ProteinGrams = row.ProteinGrams,
            CarbohydrateGrams = row.CarbohydrateGrams,
            FatGrams = row.FatGrams,
            Notes = row.Notes
        };

        return Ok(resp);
    }

    [HttpGet]
    public async Task<IActionResult> GetByDate([FromQuery] DateOnly date, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        using var conn = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var rows = await conn.QueryAsync<DiaryDb>(
            "sp_NhatKy_LayTheoNgay",
            new { UserId = userId, MealDate = date.ToDateTime(TimeOnly.MinValue) },
            commandType: CommandType.StoredProcedure);

        var items = rows.Select(row => new DiaryEntryResponse
        {
            Id = row.Id,
            MealDate = DateOnly.FromDateTime(row.MealDate),
            MealCode = row.MealCode,
            FoodId = row.FoodId,
            CustomDishId = row.CustomDishId,
            AiRecipeId = row.AiRecipeId,
            ItemId = row.ItemId,
            Source = row.Source,
            QuantityGrams = row.QuantityGrams,
            CaloriesKcal = row.CaloriesKcal,
            ProteinGrams = row.ProteinGrams,
            CarbohydrateGrams = row.CarbohydrateGrams,
            FatGrams = row.FatGrams,
            Notes = row.Notes
        });

        return Ok(items);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        using var conn = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var affected = await conn.ExecuteScalarAsync<int>(
            "sp_NhatKy_Xoa",
            new { UserId = userId, DiaryEntryId = id },
            commandType: CommandType.StoredProcedure);

        if (affected <= 0)
        {
            return NotFound();
        }

        return NoContent();
    }

    private sealed class DiaryDb
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public DateTime MealDate { get; set; }
        public string MealCode { get; set; } = string.Empty;
        public Guid? FoodId { get; set; }
        public Guid? CustomDishId { get; set; }
        public Guid? AiRecipeId { get; set; }
        public Guid ItemId { get; set; }
        public string Source { get; set; } = string.Empty;
        public decimal QuantityGrams { get; set; }
        public decimal CaloriesKcal { get; set; }
        public decimal ProteinGrams { get; set; }
        public decimal CarbohydrateGrams { get; set; }
        public decimal FatGrams { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
