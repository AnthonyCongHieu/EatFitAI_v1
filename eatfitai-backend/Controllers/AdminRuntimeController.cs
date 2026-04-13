using System.Text.Json;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.Common;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http.Features;

namespace EatFitAI.API.Controllers;

[Route("api/admin/runtime")]
[ApiController]
[Authorize(Roles = "Admin")]
public class AdminRuntimeController : ControllerBase
{
    private static readonly TimeSpan SnapshotInterval = TimeSpan.FromSeconds(5);

    private readonly IAdminRuntimeSnapshotCache _runtimeSnapshotCache;
    private readonly IAdminRealtimeEventBus _eventBus;
    private readonly ILogger<AdminRuntimeController> _logger;

    public AdminRuntimeController(
        IAdminRuntimeSnapshotCache runtimeSnapshotCache,
        IAdminRealtimeEventBus eventBus,
        ILogger<AdminRuntimeController> logger)
    {
        _runtimeSnapshotCache = runtimeSnapshotCache;
        _eventBus = eventBus;
        _logger = logger;
    }

    [HttpGet("snapshot")]
    [ProducesResponseType(typeof(ApiResponse<AdminRuntimeSnapshotDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSnapshot(CancellationToken cancellationToken)
    {
        var snapshot = await _runtimeSnapshotCache.GetLatestAsync(cancellationToken);
        if (snapshot == null)
        {
            var cacheState = _runtimeSnapshotCache.GetState();
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                ApiResponse<object>.ErrorResponse(
                    $"Runtime snapshot unavailable. {cacheState.LastError ?? "No runtime snapshot has been cached yet."}"));
        }

        return Ok(ApiResponse<AdminRuntimeSnapshotDto>.SuccessResponse(snapshot, "Runtime snapshot ready."));
    }

    [HttpGet("events")]
    public async Task GetEvents(CancellationToken cancellationToken)
    {
        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache, no-transform");
        Response.Headers.Append("Connection", "keep-alive");
        Response.Headers.Append("X-Accel-Buffering", "no");
        Response.HttpContext.Features.Get<IHttpResponseBodyFeature>()?.DisableBuffering();
        await Response.StartAsync(cancellationToken);
        await Response.WriteAsync($": stream-open {DateTime.UtcNow:O}\n\n", cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);

        var subscriber = _eventBus.Subscribe(cancellationToken);

        async Task WriteEventAsync(string eventName, AdminRuntimeEventDto payload)
        {
            var json = JsonSerializer.Serialize(payload);
            await Response.WriteAsync($"id: {payload.EventId}\n", cancellationToken);
            await Response.WriteAsync($"event: {eventName}\n", cancellationToken);
            await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }

        async Task WriteHeartbeatAsync()
        {
            await Response.WriteAsync($": heartbeat {DateTime.UtcNow:O}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }

        async Task WriteCachedBootstrapAsync()
        {
            var cacheState = _runtimeSnapshotCache.GetState();
            if (cacheState.Snapshot != null)
            {
                await WriteEventAsync("runtime.snapshot", new AdminRuntimeEventDto
                {
                    EventId = $"bootstrap-snapshot-{DateTime.UtcNow.Ticks}",
                    EventType = "runtime.snapshot",
                    EntityType = "runtime",
                    EntityId = "global",
                    OccurredAt = DateTime.UtcNow,
                    Version = _eventBus.CurrentVersion,
                    Payload = cacheState.Snapshot,
                });

                await WriteEventAsync("runtime.health.updated", new AdminRuntimeEventDto
                {
                    EventId = $"bootstrap-health-{DateTime.UtcNow.Ticks}",
                    EventType = "runtime.health.updated",
                    EntityType = "runtime-health",
                    EntityId = "global",
                    OccurredAt = DateTime.UtcNow,
                    Version = _eventBus.CurrentVersion,
                    Payload = new
                    {
                        cacheState.Snapshot.PoolHealth,
                        cacheState.Snapshot.ActiveProject,
                        cacheState.Snapshot.AvailableProjectCount,
                        cacheState.Snapshot.ExhaustedProjectCount,
                        cacheState.Snapshot.CooldownProjectCount,
                    },
                });

                return;
            }

            if (!string.IsNullOrWhiteSpace(cacheState.LastError))
            {
                await WriteEventAsync("runtime.health.updated", new AdminRuntimeEventDto
                {
                    EventId = $"bootstrap-error-{DateTime.UtcNow.Ticks}",
                    EventType = "runtime.health.updated",
                    EntityType = "runtime-health",
                    EntityId = "global",
                    OccurredAt = DateTime.UtcNow,
                    Version = _eventBus.CurrentVersion,
                    Payload = new
                    {
                        error = "runtime_snapshot_unavailable",
                        detail = cacheState.LastError,
                    },
                });
            }
        }

        await WriteCachedBootstrapAsync();

        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                var waitForEventTask = subscriber.WaitToReadAsync(cancellationToken).AsTask();
                var heartbeatTask = Task.Delay(SnapshotInterval, cancellationToken);
                var completedTask = await Task.WhenAny(waitForEventTask, heartbeatTask);

                if (completedTask == waitForEventTask)
                {
                    if (!await waitForEventTask)
                    {
                        break;
                    }

                    while (subscriber.TryRead(out var evt))
                    {
                        await WriteEventAsync(evt.EventType, evt);
                    }
                }
                else
                {
                    await WriteHeartbeatAsync();
                }
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Runtime SSE loop hit an error.");
                try
                {
                    await WriteEventAsync("runtime.health.updated", new AdminRuntimeEventDto
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
                    });
                }
                catch
                {
                    break;
                }

                await Task.Delay(TimeSpan.FromSeconds(3), cancellationToken);
            }
        }
    }
}
