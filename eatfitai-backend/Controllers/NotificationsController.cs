using System.Security.Claims;
using EatFitAI.API.DTOs.Notifications;
using EatFitAI.API.Helpers;
using EatFitAI.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public sealed class NotificationsController : ControllerBase
{
    private readonly INotificationDecisionService _notificationDecisionService;

    public NotificationsController(INotificationDecisionService notificationDecisionService)
    {
        _notificationDecisionService = notificationDecisionService;
    }

    [HttpPost("should-nudge")]
    public async Task<ActionResult<NotificationDecisionDto>> ShouldNudge(
        [FromBody] NotificationDecisionRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var userId = GetUserId();
            var result = await _notificationDecisionService.ShouldNudgeAsync(
                userId,
                request,
                cancellationToken);
            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseHelper.SafeError("Token người dùng không hợp lệ", HttpContext));
        }
        catch (Exception)
        {
            return StatusCode(500, ErrorResponseHelper.SafeError(
                "Đã xảy ra lỗi khi kiểm tra thông báo.",
                HttpContext));
        }
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        return Guid.TryParse(userIdClaim, out var userId)
            ? userId
            : throw new UnauthorizedAccessException();
    }
}
