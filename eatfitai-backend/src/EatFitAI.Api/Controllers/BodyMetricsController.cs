using System.Data;
using Dapper;
using EatFitAI.Api.Contracts.BodyMetrics;
using EatFitAI.Api.Extensions;
using EatFitAI.Application.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.Api.Controllers;

[ApiController]
[Route("api/body-metrics")]
[Authorize]
public sealed class BodyMetricsController : ControllerBase
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public BodyMetricsController(ISqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] AddBodyMetricRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var userId = User.GetUserId();
        using var conn = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var row = await conn.QuerySingleAsync<BodyMetricDb>(
            "sp_ChiSoCoThe_Them",
            new
            {
                UserId = userId,
                RecordedAt = request.RecordedAt,
                request.WeightKg,
                request.BodyFatPercent,
                request.MuscleMassKg,
                request.WaistCm,
                request.HipCm
            },
            commandType: CommandType.StoredProcedure);

        var response = new BodyMetricResponse
        {
            Id = row.Id,
            RecordedAt = row.RecordedAt,
            WeightKg = row.WeightKg,
            BodyFatPercent = row.BodyFatPercent,
            MuscleMassKg = row.MuscleMassKg,
            WaistCm = row.WaistCm,
            HipCm = row.HipCm
        };

        return Ok(response);
    }

    private sealed class BodyMetricDb
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public DateTime RecordedAt { get; set; }
        public decimal WeightKg { get; set; }
        public decimal? BodyFatPercent { get; set; }
        public decimal? MuscleMassKg { get; set; }
        public decimal? WaistCm { get; set; }
        public decimal? HipCm { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
