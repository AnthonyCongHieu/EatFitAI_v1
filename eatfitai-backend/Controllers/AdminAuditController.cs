using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.Common;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers;

[Route("api/admin/audit-events")]
[ApiController]
[Authorize(Roles = "Admin")]
public class AdminAuditController : ControllerBase
{
    private readonly IAdminAuditService _auditService;

    public AdminAuditController(IAdminAuditService auditService)
    {
        _auditService = auditService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<AdminAuditFeedDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAuditEvents([FromQuery] AdminAuditQuery query, CancellationToken cancellationToken)
    {
        var feed = await _auditService.QueryAsync(query, cancellationToken);
        return Ok(ApiResponse<AdminAuditFeedDto>.SuccessResponse(feed, "Audit events loaded."));
    }
}
