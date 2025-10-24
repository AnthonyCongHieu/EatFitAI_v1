using EatFitAI.Api.Contracts.BodyMetrics;
using EatFitAI.Api.Extensions;
using EatFitAI.Application.Repositories;
using EatFitAI.Domain.Nutrition;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.Api.Controllers;

[ApiController]
[Route("api/body-metrics")]
[Authorize]
public sealed class BodyMetricsController : ControllerBase
{
    private readonly IBodyMetricRepository _bodyMetricRepository;

    public BodyMetricsController(IBodyMetricRepository bodyMetricRepository)
    {
        _bodyMetricRepository = bodyMetricRepository;
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] AddBodyMetricRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var userId = User.GetUserId();

        var bodyMetric = new BodyMetric
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            RecordedAt = request.RecordedAt ?? DateTime.UtcNow,
            WeightKg = request.WeightKg,
            BodyFatPercent = request.BodyFatPercent,
            MuscleMassKg = request.MuscleMassKg,
            WaistCm = request.WaistCm,
            HipCm = request.HipCm,
            CreatedAt = DateTime.UtcNow
        };

        await _bodyMetricRepository.AddAsync(bodyMetric, cancellationToken);
        await _bodyMetricRepository.SaveChangesAsync(cancellationToken);

        var response = new BodyMetricResponse
        {
            Id = bodyMetric.Id,
            RecordedAt = bodyMetric.RecordedAt,
            WeightKg = bodyMetric.WeightKg,
            BodyFatPercent = bodyMetric.BodyFatPercent,
            MuscleMassKg = bodyMetric.MuscleMassKg,
            WaistCm = bodyMetric.WaistCm,
            HipCm = bodyMetric.HipCm
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
