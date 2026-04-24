using System.Text.Json;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.Services.Interfaces;
using Microsoft.Extensions.Hosting;

namespace EatFitAI.API.Services;

public sealed class AdminRuntimeSnapshotCache : IAdminRuntimeSnapshotCache
{
    private const string LocalFallbackSource = "local-runtime-fallback";
    private const string ProviderStatusUnavailableWarning = "ai_provider_runtime_status_unavailable";

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
    private string? _lastWarning;

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
            var result = await BuildSnapshotAsync(scope.ServiceProvider, cancellationToken);
            var snapshot = result.Snapshot;
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
                _lastWarning = result.Warning;
            }

            if (changed)
            {
                PublishSnapshotEvents(snapshot, result.Warning);
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
                _lastWarning = null;
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
                LastWarning = _lastWarning,
            };
        }
    }

    private async Task<(AdminRuntimeSnapshotDto Snapshot, string? Warning)> BuildSnapshotAsync(
        IServiceProvider services,
        CancellationToken cancellationToken)
    {
        try
        {
            var runtimeStatusService = services.GetRequiredService<IAiRuntimeStatusService>();
            var snapshot = await runtimeStatusService.GetSnapshotAsync(cancellationToken);
            return (snapshot, null);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to refresh admin runtime snapshot from AI provider; falling back to local runtime project state.");

            var providerStatusError = SanitizeRuntimeStatusError(ex);
            var runtimeProjectService = services.GetRequiredService<IGeminiRuntimeProjectService>();
            var fallbackSnapshot = await runtimeProjectService.BuildSnapshotAsync(cancellationToken);
            fallbackSnapshot.RuntimeStatusSource = LocalFallbackSource;
            fallbackSnapshot.RuntimeStatusWarning = ProviderStatusUnavailableWarning;
            fallbackSnapshot.RuntimeStatusError = providerStatusError;

            return (
                fallbackSnapshot,
                $"{ProviderStatusUnavailableWarning}: {providerStatusError}");
        }
    }

    private void PublishSnapshotEvents(AdminRuntimeSnapshotDto snapshot, string? warning)
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
            snapshot.RuntimeStatusSource,
            snapshot.RuntimeStatusWarning,
            snapshot.RuntimeStatusError,
            Warning = warning,
        });
    }

    private static string SanitizeRuntimeStatusError(Exception exception)
    {
        if (exception is AggregateException aggregate && aggregate.InnerExceptions.Count > 0)
        {
            exception = aggregate.InnerExceptions[0];
        }

        if (exception is HttpRequestException httpException && httpException.StatusCode.HasValue)
        {
            return $"http_{(int)httpException.StatusCode.Value}";
        }

        return exception switch
        {
            TaskCanceledException => "timeout",
            TimeoutException => "timeout",
            _ => exception.GetType().Name,
        };
    }
}

public sealed class AdminRuntimeSnapshotBackgroundService : BackgroundService
{
    private static readonly TimeSpan DefaultInterval = TimeSpan.FromSeconds(30);

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
            try
            {
                _logger.LogError(ex, "Unhandled exception while refreshing cached admin runtime snapshot.");
            }
            catch (ObjectDisposedException)
            {
                // Logger has been disposed during application shutdown — safe to ignore.
            }
        }
    }
}
