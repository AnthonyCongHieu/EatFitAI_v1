using System.Text.Json;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.Services.Interfaces;
using Microsoft.Extensions.Hosting;

namespace EatFitAI.API.Services;

public sealed class AdminRuntimeSnapshotCache : IAdminRuntimeSnapshotCache
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IAdminRealtimeEventBus _eventBus;
    private readonly ILogger<AdminRuntimeSnapshotCache> _logger;
    private readonly SemaphoreSlim _refreshLock = new(1, 1);
    private readonly object _sync = new();

    private AdminRuntimeSnapshotDto? _snapshot;
    private string? _snapshotFingerprint;
    private DateTimeOffset? _lastAttemptAt;
    private DateTimeOffset? _lastSuccessAt;
    private string? _lastError;

    public AdminRuntimeSnapshotCache(
        IServiceScopeFactory scopeFactory,
        IAdminRealtimeEventBus eventBus,
        ILogger<AdminRuntimeSnapshotCache> logger)
    {
        _scopeFactory = scopeFactory;
        _eventBus = eventBus;
        _logger = logger;
    }

    public async Task<AdminRuntimeSnapshotDto?> GetLatestAsync(CancellationToken cancellationToken = default)
    {
        var state = GetState();
        if (state.Snapshot != null)
        {
            return state.Snapshot;
        }

        return await RefreshNowAsync(cancellationToken);
    }

    public async Task<AdminRuntimeSnapshotDto?> RefreshNowAsync(CancellationToken cancellationToken = default)
    {
        await _refreshLock.WaitAsync(cancellationToken);
        try
        {
            lock (_sync)
            {
                _lastAttemptAt = DateTimeOffset.UtcNow;
            }

            using var scope = _scopeFactory.CreateScope();
            var runtimeProjectService = scope.ServiceProvider.GetRequiredService<IGeminiRuntimeProjectService>();
            var snapshot = await runtimeProjectService.BuildSnapshotAsync(cancellationToken);
            var fingerprint = JsonSerializer.Serialize(snapshot);
            var now = DateTimeOffset.UtcNow;
            var changed = false;

            lock (_sync)
            {
                changed = !string.Equals(_snapshotFingerprint, fingerprint, StringComparison.Ordinal);
                _snapshot = snapshot;
                _snapshotFingerprint = fingerprint;
                _lastSuccessAt = now;
                _lastError = null;
            }

            if (changed)
            {
                PublishSnapshotEvents(snapshot);
            }

            return snapshot;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            lock (_sync)
            {
                _lastError = ex.Message;
            }

            _logger.LogWarning(ex, "Failed to refresh cached admin runtime snapshot.");
            return GetState().Snapshot;
        }
        finally
        {
            _refreshLock.Release();
        }
    }

    public AdminRuntimeSnapshotCacheState GetState()
    {
        lock (_sync)
        {
            return new AdminRuntimeSnapshotCacheState
            {
                Snapshot = _snapshot,
                LastAttemptAt = _lastAttemptAt,
                LastSuccessAt = _lastSuccessAt,
                LastError = _lastError,
            };
        }
    }

    private void PublishSnapshotEvents(AdminRuntimeSnapshotDto snapshot)
    {
        _eventBus.Publish("runtime.snapshot", "runtime", "global", snapshot);
        _eventBus.Publish("runtime.health.updated", "runtime-health", "global", new
        {
            snapshot.PoolHealth,
            snapshot.ActiveProject,
            snapshot.ActiveProjectId,
            snapshot.ActiveProjectAlias,
            snapshot.AvailableProjectCount,
            snapshot.ExhaustedProjectCount,
            snapshot.CooldownProjectCount,
            snapshot.AuthInvalidProjectCount,
        });
    }
}

public sealed class AdminRuntimeSnapshotBackgroundService : BackgroundService
{
    private static readonly TimeSpan DefaultInterval = TimeSpan.FromSeconds(5);

    private readonly IConfiguration _configuration;
    private readonly IAdminRuntimeSnapshotCache _runtimeSnapshotCache;
    private readonly ILogger<AdminRuntimeSnapshotBackgroundService> _logger;

    public AdminRuntimeSnapshotBackgroundService(
        IConfiguration configuration,
        IAdminRuntimeSnapshotCache runtimeSnapshotCache,
        ILogger<AdminRuntimeSnapshotBackgroundService> logger)
    {
        _configuration = configuration;
        _runtimeSnapshotCache = runtimeSnapshotCache;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = GetInterval();
        _logger.LogInformation(
            "Starting admin runtime snapshot monitor with interval {IntervalSeconds}s",
            interval.TotalSeconds);

        await SafeRefreshAsync(stoppingToken);

        using var timer = new PeriodicTimer(interval);
        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            await SafeRefreshAsync(stoppingToken);
        }
    }

    private TimeSpan GetInterval()
    {
        var configuredSeconds = _configuration.GetValue<int?>("AIProvider:RuntimeSnapshotIntervalSeconds");
        return configuredSeconds.HasValue && configuredSeconds.Value > 0
            ? TimeSpan.FromSeconds(configuredSeconds.Value)
            : DefaultInterval;
    }

    private async Task SafeRefreshAsync(CancellationToken stoppingToken)
    {
        try
        {
            await _runtimeSnapshotCache.RefreshNowAsync(stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception while refreshing cached admin runtime snapshot.");
        }
    }
}
