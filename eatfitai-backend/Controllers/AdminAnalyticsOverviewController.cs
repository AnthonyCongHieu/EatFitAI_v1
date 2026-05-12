using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.Common;
using EatFitAI.API.Security;
using EatFitAI.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers;

[ApiController]
[Route("api/admin/analytics")]
[Authorize(Policy = AdminPolicies.OpsRead)]
public sealed class AdminAnalyticsOverviewController : ControllerBase
{
    private readonly AdminAnalyticsOverviewService _analyticsService;

    public AdminAnalyticsOverviewController(AdminAnalyticsOverviewService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview(
        [FromQuery] string? window = "7d",
        CancellationToken cancellationToken = default)
    {
        var overview = await _analyticsService.GetOverviewAsync(window, cancellationToken);
        return Ok(ApiResponse<AdminAnalyticsOverviewDto>.SuccessResponse(
            overview,
            "Analytics overview ready.",
            requestId: HttpContext.TraceIdentifier));
    }
}
