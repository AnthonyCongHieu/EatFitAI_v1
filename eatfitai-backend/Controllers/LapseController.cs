using System.Security.Claims;
using EatFitAI.API.DTOs.Lapse;
using EatFitAI.API.Helpers;
using EatFitAI.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers;

[ApiController]
[Route("api/lapse")]
[Authorize]
public sealed class LapseController : ControllerBase
{
    private readonly ILapseRecoveryService _lapseRecoveryService;

    public LapseController(ILapseRecoveryService lapseRecoveryService)
    {
        _lapseRecoveryService = lapseRecoveryService;
    }

    [HttpGet("recovery")]
    public async Task<ActionResult<LapseRecoveryDto>> GetRecovery(
        [FromQuery] DateTime? localDate,
        CancellationToken cancellationToken)
    {
        try
        {
            var date = DateOnly.FromDateTime(localDate ?? DateTime.UtcNow);
            var result = await _lapseRecoveryService.GetRecoveryAsync(
                GetUserId(),
                date,
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
                "Đã xảy ra lỗi khi tạo gợi ý quay lại.",
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
