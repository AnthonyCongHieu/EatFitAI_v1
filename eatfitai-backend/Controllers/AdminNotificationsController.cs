using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.Common;
using EatFitAI.API.Security;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers;

[ApiController]
[Route("api/admin/notifications")]
[Authorize(Policy = AdminPolicies.NotificationsManage)]
public sealed class AdminNotificationsController : ControllerBase
{
    private readonly PushNotificationCampaignService _pushService;
    private readonly IAdminAuditService _auditService;

    public AdminNotificationsController(
        PushNotificationCampaignService pushService,
        IAdminAuditService auditService)
    {
        _pushService = pushService;
        _auditService = auditService;
    }

    [HttpGet("campaigns")]
    public async Task<IActionResult> ListCampaigns(CancellationToken cancellationToken)
    {
        var campaigns = await _pushService.ListCampaignsAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<PushCampaignDto>>.SuccessResponse(
            campaigns,
            "Push campaigns ready.",
            requestId: HttpContext.TraceIdentifier));
    }

    [HttpGet("audience-preview")]
    public async Task<IActionResult> PreviewAudience(CancellationToken cancellationToken)
    {
        var preview = await _pushService.PreviewAudienceAsync(cancellationToken);
        return Ok(ApiResponse<PushAudiencePreviewDto>.SuccessResponse(
            preview,
            "Push audience preview ready.",
            requestId: HttpContext.TraceIdentifier));
    }

    [HttpPost("campaigns")]
    public async Task<IActionResult> CreateCampaign(
        [FromBody] CreatePushCampaignRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var campaign = await _pushService.CreateCampaignAsync(User, request, cancellationToken);
            await WriteAuditAsync(
                "push-campaign.create",
                campaign.PushCampaignId.ToString(),
                "success",
                $"Status={campaign.Status};ScheduledAt={campaign.ScheduledAt:O}",
                request.Justification,
                cancellationToken);

            return Ok(ApiResponse<PushCampaignDto>.SuccessResponse(
                campaign,
                "Push campaign created.",
                requestId: HttpContext.TraceIdentifier,
                severity: campaign.Status == "scheduled" ? "high" : "info"));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse(
                ex.Message,
                "invalid_push_campaign",
                requestId: HttpContext.TraceIdentifier,
                severity: "warning"));
        }
    }

    [HttpPost("campaigns/{campaignId:guid}/schedule")]
    public async Task<IActionResult> ScheduleCampaign(
        Guid campaignId,
        [FromBody] CreatePushCampaignRequest request,
        CancellationToken cancellationToken)
    {
        var campaign = await _pushService.ScheduleCampaignAsync(
            campaignId,
            request.ScheduledAt,
            User,
            cancellationToken);
        await WriteAuditAsync(
            "push-campaign.schedule",
            campaign.PushCampaignId.ToString(),
            "success",
            $"ScheduledAt={campaign.ScheduledAt:O}",
            request.Justification,
            cancellationToken);

        return Ok(ApiResponse<PushCampaignDto>.SuccessResponse(
            campaign,
            "Push campaign scheduled.",
            requestId: HttpContext.TraceIdentifier,
            severity: "high"));
    }

    [HttpPost("campaigns/{campaignId:guid}/cancel")]
    public async Task<IActionResult> CancelCampaign(
        Guid campaignId,
        CancellationToken cancellationToken)
    {
        var campaign = await _pushService.CancelCampaignAsync(campaignId, User, cancellationToken);
        await WriteAuditAsync(
            "push-campaign.cancel",
            campaign.PushCampaignId.ToString(),
            "success",
            $"Status={campaign.Status}",
            null,
            cancellationToken);

        return Ok(ApiResponse<PushCampaignDto>.SuccessResponse(
            campaign,
            "Push campaign canceled.",
            requestId: HttpContext.TraceIdentifier,
            severity: "warning"));
    }

    private async Task WriteAuditAsync(
        string action,
        string entityId,
        string outcome,
        string detail,
        string? justification,
        CancellationToken cancellationToken)
    {
        await _auditService.WriteAsync(HttpContext, new AdminAuditWriteRequest
        {
            Action = action,
            Entity = "push-campaign",
            EntityId = entityId,
            Outcome = outcome,
            Severity = action.EndsWith(".schedule", StringComparison.OrdinalIgnoreCase) ? "high" : "info",
            Justification = justification,
            Detail = detail,
        }, cancellationToken);
    }
}
