using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.Common;
using EatFitAI.API.Security;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers;

[ApiController]
[Route("api/admin/control-plane")]
[Authorize(Policy = AdminPolicies.OpsRead)]
public sealed class AdminControlPlaneController : ControllerBase
{
    private readonly IAdminControlPlaneService _controlPlaneService;

    public AdminControlPlaneController(IAdminControlPlaneService controlPlaneService)
    {
        _controlPlaneService = controlPlaneService;
    }

    [HttpGet("snapshot")]
    [ProducesResponseType(typeof(ApiResponse<AdminControlPlaneSnapshotDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSnapshot(CancellationToken cancellationToken)
    {
        var snapshot = await _controlPlaneService.GetSnapshotAsync(cancellationToken);

        return Ok(ApiResponse<AdminControlPlaneSnapshotDto>.SuccessResponse(
            snapshot,
            "Production control-plane snapshot ready.",
            requestId: HttpContext.TraceIdentifier));
    }

    [HttpPost("refresh")]
    [Authorize(Policy = AdminPolicies.OpsRefresh)]
    [ProducesResponseType(typeof(ApiResponse<AdminControlPlaneRefreshResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Refresh(
        [FromBody] AdminControlPlaneRefreshRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _controlPlaneService.RefreshAsync(request, HttpContext, cancellationToken);
            var warnings = result.Targets
                .Where(target => target.Status is "rate_limited" or "failed")
                .Select(target => $"{target.Target}:{target.Status}")
                .ToList();

            return Ok(ApiResponse<AdminControlPlaneRefreshResultDto>.SuccessResponse(
                result,
                "Production control-plane refresh processed.",
                requestId: HttpContext.TraceIdentifier,
                warnings: warnings.Count == 0 ? null : warnings));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse(
                ex.Message,
                "invalid_control_plane_refresh",
                requestId: HttpContext.TraceIdentifier,
                severity: "warning"));
        }
    }
}
