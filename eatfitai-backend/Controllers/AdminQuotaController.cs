using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.Common;
using EatFitAI.API.Security;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers;

[Route("api/admin/quota")]
[ApiController]
[Authorize(Policy = AdminPolicies.RuntimeRead)]
public class AdminQuotaController : ControllerBase
{
    private readonly IAdminQuotaOverviewService _quotaOverviewService;
    private readonly IAdminAuditService _auditService;

    public AdminQuotaController(
        IAdminQuotaOverviewService quotaOverviewService,
        IAdminAuditService auditService)
    {
        _quotaOverviewService = quotaOverviewService;
        _auditService = auditService;
    }

    [HttpGet("overview")]
    [ProducesResponseType(typeof(ApiResponse<AdminQuotaOverviewDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOverview([FromQuery] string? provider = "all", [FromQuery] string? window = "7d")
    {
        var overview = await _quotaOverviewService.GetOverviewAsync(
            new AdminQuotaOverviewQuery { Provider = provider, Window = window },
            HttpContext.RequestAborted);

        return Ok(ApiResponse<AdminQuotaOverviewDto>.SuccessResponse(overview, "Quota overview ready."));
    }

    [HttpPost("bulk-action/preview")]
    [Authorize(Policy = AdminPolicies.RuntimeKeysManage)]
    [ProducesResponseType(typeof(ApiResponse<AdminQuotaBulkActionPreviewDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> PreviewBulkAction([FromBody] AdminQuotaBulkActionRequest request)
    {
        try
        {
            var preview = await _quotaOverviewService.PreviewBulkActionAsync(request, HttpContext.RequestAborted);
            return Ok(ApiResponse<AdminQuotaBulkActionPreviewDto>.SuccessResponse(preview, "Quota bulk action preview ready."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message, "invalid_quota_bulk_action"));
        }
    }

    [HttpPost("bulk-action/commit")]
    [Authorize(Policy = AdminPolicies.RuntimeKeysManage)]
    [ProducesResponseType(typeof(ApiResponse<AdminQuotaBulkActionPreviewDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CommitBulkAction([FromBody] AdminQuotaBulkActionRequest request)
    {
        try
        {
            var result = await _quotaOverviewService.CommitBulkActionAsync(request, HttpContext.RequestAborted);
            var auditRef = await WriteAuditAsync(
                "quota-bulk-action",
                "quota-provider",
                result.Provider,
                "success",
                $"Action={result.Action};Affected={result.AffectedCount}",
                "high");

            return Ok(ApiResponse<AdminQuotaBulkActionPreviewDto>.SuccessResponse(
                result,
                "Quota bulk action committed.",
                requestId: HttpContext.TraceIdentifier,
                severity: "high",
                auditRef: auditRef));
        }
        catch (ArgumentException ex)
        {
            var auditRef = await WriteAuditAsync(
                "quota-bulk-action",
                "quota-provider",
                request.Provider,
                "failed",
                ex.Message,
                "warning");

            return BadRequest(ApiResponse<object>.ErrorResponse(
                ex.Message,
                "invalid_quota_bulk_action",
                requestId: HttpContext.TraceIdentifier,
                severity: "warning",
                auditRef: auditRef));
        }
    }

    private async Task<string?> WriteAuditAsync(
        string action,
        string entity,
        string entityId,
        string outcome,
        string? detail = null,
        string severity = "info")
    {
        var auditRef = Guid.NewGuid().ToString("N");
        await _auditService.WriteAsync(HttpContext, new AdminAuditWriteRequest
        {
            Action = action,
            Entity = entity,
            EntityId = entityId,
            Outcome = outcome,
            Severity = severity,
            DiffSummary = auditRef,
            Detail = detail,
        });
        return auditRef;
    }
}
