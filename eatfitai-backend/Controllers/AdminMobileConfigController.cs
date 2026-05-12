using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.Common;
using EatFitAI.API.Security;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers;

[ApiController]
[Route("api/admin/mobile-config")]
[Authorize(Policy = AdminPolicies.SettingsRead)]
public sealed class AdminMobileConfigController : ControllerBase
{
    private readonly MobileRuntimeConfigService _configService;
    private readonly IAdminAuditService _auditService;

    public AdminMobileConfigController(
        MobileRuntimeConfigService configService,
        IAdminAuditService auditService)
    {
        _configService = configService;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<IActionResult> GetConfig(
        [FromQuery] string? environment = "production",
        [FromQuery] string? platform = "all",
        [FromQuery] string? channel = "production",
        CancellationToken cancellationToken = default)
    {
        var config = await _configService.GetAsync(environment, platform, channel, cancellationToken);
        return Ok(ApiResponse<MobileRuntimeConfigDto>.SuccessResponse(
            config,
            "Mobile config ready.",
            requestId: HttpContext.TraceIdentifier));
    }

    [HttpPut]
    [Authorize(Policy = AdminPolicies.SettingsWrite)]
    public async Task<IActionResult> UpdateConfig(
        [FromBody] UpdateMobileRuntimeConfigRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var updated = await _configService.UpdateAsync(User, request, cancellationToken);
            await _auditService.WriteAsync(HttpContext, new AdminAuditWriteRequest
            {
                Action = "mobile-config.update",
                Entity = "mobile-runtime-config",
                EntityId = $"{updated.Environment}/{updated.Platform}/{updated.Channel}",
                Outcome = "success",
                Severity = updated.MaintenanceEnabled || updated.ForceUpdateEnabled ? "high" : "info",
                Justification = request.Justification,
                Detail = $"Version={updated.ConfigVersion};Maintenance={updated.MaintenanceEnabled};ForceUpdate={updated.ForceUpdateEnabled}"
            }, cancellationToken);

            return Ok(ApiResponse<MobileRuntimeConfigDto>.SuccessResponse(
                updated,
                "Mobile config updated.",
                requestId: HttpContext.TraceIdentifier,
                severity: updated.MaintenanceEnabled || updated.ForceUpdateEnabled ? "high" : "info"));
        }
        catch (InvalidOperationException ex) when (ex.Message == "mobile_config_version_conflict")
        {
            return Conflict(ApiResponse<object>.ErrorResponse(
                "Cấu hình đã thay đổi. Tải lại trước khi lưu.",
                "mobile_config_version_conflict",
                requestId: HttpContext.TraceIdentifier,
                severity: "warning"));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse(
                ex.Message,
                "invalid_mobile_config",
                requestId: HttpContext.TraceIdentifier,
                severity: "warning"));
        }
    }
}
