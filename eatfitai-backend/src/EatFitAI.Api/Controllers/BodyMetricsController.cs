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
            MaChiSo = 0, // Will be set by database
            MaNguoiDung = userId,
            NgayCapNhat = request.ThoiGianGhiNhan ?? DateTime.UtcNow,
            CanNangKg = request.CanNangKg,
            PhanTramMoCoThe = request.PhanTramMoCoThe,
            KhoiLuongCoKg = request.KhoiLuongCoKg,
            VongEoCm = request.VongEoCm,
            VongMongCm = request.VongMongCm,
            GhiChu = null
        };

        await _bodyMetricRepository.AddAsync(bodyMetric, cancellationToken);
        await _bodyMetricRepository.SaveChangesAsync(cancellationToken);

        var response = new BodyMetricResponse
        {
            MaChiSo = bodyMetric.MaChiSo,
            NgayCapNhat = bodyMetric.NgayCapNhat,
            CanNangKg = bodyMetric.CanNangKg ?? 0,
            PhanTramMoCoThe = bodyMetric.PhanTramMoCoThe,
            KhoiLuongCoKg = bodyMetric.KhoiLuongCoKg,
            VongEoCm = bodyMetric.VongEoCm,
            VongMongCm = bodyMetric.VongMongCm
        };

        return Ok(response);
    }

    private sealed class BodyMetricDb
    {
        public long MaChiSo { get; set; }
        public Guid MaNguoiDung { get; set; }
        public decimal? ChieuCaoCm { get; set; }
        public decimal? CanNangKg { get; set; }
        public string? MaMucDo { get; set; }
        public string? MaMucTieu { get; set; }
        public DateTime NgayCapNhat { get; set; }
        public string? GhiChu { get; set; }
    }
}
