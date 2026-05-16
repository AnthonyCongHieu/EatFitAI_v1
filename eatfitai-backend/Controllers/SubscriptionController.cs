using System.Security.Claims;
using EatFitAI.API.DTOs.Subscription;
using EatFitAI.API.Helpers;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers;

[ApiController]
[Route("api/subscription")]
[Authorize]
public sealed class SubscriptionController : ControllerBase
{
    private readonly IEntitlementService _entitlementService;

    public SubscriptionController(IEntitlementService entitlementService)
    {
        _entitlementService = entitlementService;
    }

    [HttpGet("me")]
    [ProducesResponseType(typeof(SubscriptionStatusDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<SubscriptionStatusDto>> GetCurrent(CancellationToken cancellationToken)
    {
        try
        {
            var userId = GetUserIdFromToken();
            var status = await _entitlementService.GetSubscriptionStatusAsync(userId, cancellationToken);
            return Ok(status);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseHelper.SafeError("Token người dùng không hợp lệ", HttpContext));
        }
    }

    private Guid GetUserIdFromToken()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Token người dùng không hợp lệ");
        }

        return userId;
    }
}
