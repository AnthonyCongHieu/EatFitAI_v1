using System.Text.Json;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.Common;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers;

[Route("api/admin/runtime")]
[ApiController]
[Authorize(Roles = "Admin")]
public class AdminRuntimeController : ControllerBase
{
    private static readonly TimeSpan SnapshotInterval = TimeSpan.FromSeconds(5);

    private readonly IAiRuntimeStatusService _runtimeStatusService;
    private readonly IAdminRealtimeEventBus _eventBus;
    private readonly ILogger<AdminRuntimeController> _logger;

    public AdminRuntimeController(
        IAiRuntimeStatusService runtimeStatusService,
        IAdminRealtimeEventBus eventBus,
        ILogger<AdminRuntimeController> logger)
    {
        _runtimeStatusService = runtimeStatusService;
        _eventBus = eventBus;
        _logger = logger;
    }

    [HttpGet("snapshot")]
    [ProducesResponseType(typeof(ApiResponse<AdminRuntimeSnapshotDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSnapshot(CancellationToken cancellationToken)
    {
        var snapshot = await _runtimeStatusService.GetSnapshotAsync(cancellationToken);
        return Ok(ApiResponse<AdminRuntimeSnapshotDto>.SuccessResponse(snapshot, "Runtime snapshot ready."));
    }

    [HttpGet("events")]
    public async Task GetEvents(CancellationToken cancellationToken)
    {
        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");
        Response.Headers.Append("X-Accel-Buffering", "no");

        var subscriber = _eventBus.Subscribe(cancellationToken);
        string? lastSnapshotFingerprint = null;

        async Task WriteEventAsync(string eventName, AdminRuntimeEventDto payload)
        {
            var json = JsonSerializer.Serialize(payload);
            await Response.WriteAsync($"id: {payload.EventId}\n", cancellationToken);
            await Response.WriteAsync($"event: {eventName}\n", cancellationToken);
            await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }

        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                var snapshot = await _runtimeStatusService.GetSnapshotAsync(cancellationToken);
                var fingerprint = JsonSerializer.Serialize(snapshot);
                if (!string.Equals(lastSnapshotFingerprint, fingerprint, StringComparison.Ordinal))
                {
                    lastSnapshotFingerprint = fingerprint;
                    var snapshotEvent = new AdminRuntimeEventDto
                    {
                        EventId = $"snapshot-{DateTime.UtcNow.Ticks}",
                        EventType = "runtime.snapshot",
                        EntityType = "runtime",
                        EntityId = "global",
                        OccurredAt = DateTime.UtcNow,
                        Version = _eventBus.CurrentVersion,
                        Payload = snapshot,
                    };
                    await WriteEventAsync("runtime.snapshot", snapshotEvent);

                    var healthEvent = new AdminRuntimeEventDto
                    {
                        EventId = $"health-{DateTime.UtcNow.Ticks}",
                        EventType = "runtime.health.updated",
                        EntityType = "runtime-health",
                        EntityId = "global",
                        OccurredAt = DateTime.UtcNow,
                        Version = _eventBus.CurrentVersion,
                        Payload = new
                        {
                            snapshot.PoolHealth,
                            snapshot.ActiveProject,
                            snapshot.AvailableProjectCount,
                            snapshot.ExhaustedProjectCount,
                            snapshot.CooldownProjectCount,
                        },
                    };
                    await WriteEventAsync("runtime.health.updated", healthEvent);
                }

                while (subscriber.TryRead(out var evt))
                {
                    await WriteEventAsync(evt.EventType, evt);
                }

                await Response.WriteAsync($": heartbeat {DateTime.UtcNow:O}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
                await Task.Delay(SnapshotInterval, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Runtime SSE loop hit an error.");
                var errorEvent = new AdminRuntimeEventDto
                {
                    EventId = $"error-{DateTime.UtcNow.Ticks}",
                    EventType = "runtime.health.updated",
                    EntityType = "runtime-health",
                    EntityId = "global",
                    OccurredAt = DateTime.UtcNow,
                    Version = _eventBus.CurrentVersion,
                    Payload = new
                    {
                        error = "runtime_stream_error",
                        detail = ex.Message,
                    },
                };
                await WriteEventAsync("runtime.health.updated", errorEvent);
                await Task.Delay(TimeSpan.FromSeconds(3), cancellationToken);
            }
        }
    }
}
