using System.Security.Claims;
using EatFitAI.API.DTOs.Telemetry;
using EatFitAI.API.Helpers;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EatFitAI.API.Controllers;

[ApiController]
[Route("api/telemetry")]
[Authorize]
[EnableRateLimiting("GeneralPolicy")]
public sealed class TelemetryController : ControllerBase
{
    private readonly ITelemetryService _telemetryService;
    private readonly ILogger<TelemetryController> _logger;

    public TelemetryController(
        ITelemetryService telemetryService,
        ILogger<TelemetryController> logger)
    {
        _telemetryService = telemetryService;
        _logger = logger;
    }

    [HttpPost("events")]
    public async Task<IActionResult> PostEvents(
        [FromBody] TelemetryBatchRequestDto request,
        CancellationToken cancellationToken)
    {
        if (request.Events == null || request.Events.Count == 0)
        {
            return BadRequest(new { message = "events là bắt buộc." });
        }

        try
        {
            var acceptedCount = await _telemetryService.RecordEventsAsync(
                GetOptionalUserId(),
                request.Events,
                HttpContext.TraceIdentifier,
                cancellationToken);

            return Ok(new { acceptedCount });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ingesting telemetry events");
            return StatusCode(500, ErrorResponseHelper.SafeError(
                "Đã xảy ra lỗi khi ghi telemetry.",
                HttpContext));
        }
    }

    private Guid? GetOptionalUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        return Guid.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}
