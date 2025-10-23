using System.Data;
using Dapper;
using EatFitAI.Api.Contracts.NutritionTargets;
using EatFitAI.Api.Extensions;
using EatFitAI.Application.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.Api.Controllers;

[ApiController]
[Route("api/nutrition-targets")]
[Authorize]
public sealed class NutritionTargetsController : ControllerBase
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public NutritionTargetsController(ISqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        using var conn = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var row = await conn.QuerySingleOrDefaultAsync<NutritionTargetDb>(
            "sp_MucTieuDinhDuong_LayHienTai",
            new { UserId = userId },
            commandType: CommandType.StoredProcedure);

        if (row is null)
        {
            return Problem(statusCode: StatusCodes.Status404NotFound, title: "Chua co muc tieu dinh duong");
        }

        return Ok(ToResponse(row));
    }

    [HttpPost]
    public async Task<IActionResult> Upsert([FromBody] UpsertNutritionTargetRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var userId = User.GetUserId();
        using var conn = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var row = await conn.QuerySingleAsync<NutritionTargetDb>(
            "sp_MucTieuDinhDuong_Upsert",
            new
            {
                UserId = userId,
                request.CaloriesKcal,
                request.ProteinGrams,
                request.CarbohydrateGrams,
                request.FatGrams,
                EffectiveDate = request.EffectiveDate?.ToDateTime(TimeOnly.MinValue)
            },
            commandType: CommandType.StoredProcedure);

        return Ok(ToResponse(row));
    }

    private static NutritionTargetResponse ToResponse(NutritionTargetDb db)
    {
        return new NutritionTargetResponse
        {
            Id = db.Id,
            EffectiveDate = DateOnly.FromDateTime(db.EffectiveDate),
            CaloriesKcal = db.CaloriesKcal,
            ProteinGrams = db.ProteinGrams,
            CarbohydrateGrams = db.CarbohydrateGrams,
            FatGrams = db.FatGrams,
            IsActive = db.IsActive
        };
    }

    private sealed class NutritionTargetDb
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public DateTime EffectiveDate { get; set; }
        public decimal CaloriesKcal { get; set; }
        public decimal ProteinGrams { get; set; }
        public decimal CarbohydrateGrams { get; set; }
        public decimal FatGrams { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
