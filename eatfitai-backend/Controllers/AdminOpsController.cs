using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.Common;
using EatFitAI.API.Security;
using EatFitAI.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers;

[ApiController]
[Route("api/admin/ops")]
[Authorize(Policy = AdminPolicies.OpsRead)]
public sealed class AdminOpsController : ControllerBase
{
    private readonly AdminOpsMetricsService _opsMetricsService;

    public AdminOpsController(AdminOpsMetricsService opsMetricsService)
    {
        _opsMetricsService = opsMetricsService;
    }

    [HttpGet("traffic")]
    public async Task<IActionResult> GetTraffic(
        [FromQuery] string? window = "24h",
        [FromQuery] string? granularity = null,
        CancellationToken cancellationToken = default)
    {
        var overview = await _opsMetricsService.GetTrafficOverviewAsync(
            new AdminOpsTrafficQuery
            {
                Window = window,
                Granularity = granularity,
            },
            cancellationToken);

        return Ok(ApiResponse<AdminOpsTrafficOverviewDto>.SuccessResponse(
            overview,
            "Traffic aggregate ready.",
            requestId: HttpContext.TraceIdentifier));
    }
}
