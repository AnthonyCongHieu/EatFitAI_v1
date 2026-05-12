using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using EatFitAI.API.Data;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public interface IOpsMetricsRecorder
{
    void Record(HttpContext context, long durationMs);
}

public sealed class OpsMetricsBuffer : IOpsMetricsRecorder
{
    private static readonly Regex GuidRegex = new(
        @"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b",
        RegexOptions.Compiled);
    private static readonly Regex NumberSegmentRegex = new(@"/\d+(?=/|$)", RegexOptions.Compiled);

    private readonly ConcurrentDictionary<OpsMetricKey, OpsMetricAccumulator> _metrics = new();

    public void Record(HttpContext context, long durationMs)
    {
        var method = NormalizeMethod(context.Request.Method);
        var routeGroup = ResolveRouteGroup(context.Request.Path);
        var source = ResolveSource(context.Request.Path);
        var statusClass = ResolveStatusClass(context.Response.StatusCode);
        var bucketStart = TruncateToMinute(DateTime.UtcNow);
        var key = new OpsMetricKey(source, method, routeGroup, statusClass, bucketStart);

        _metrics.GetOrAdd(key, _ => new OpsMetricAccumulator()).Add(durationMs, statusClass);
    }

    public IReadOnlyList<OpsMetricSnapshot> SnapshotAndReset()
    {
        var snapshots = new List<OpsMetricSnapshot>();
        foreach (var entry in _metrics.ToArray())
        {
            if (!_metrics.TryRemove(entry.Key, out var accumulator))
            {
                continue;
            }

            snapshots.Add(accumulator.ToSnapshot(entry.Key));
        }

        return snapshots;
    }

    private static string NormalizeMethod(string? method)
    {
        var value = string.IsNullOrWhiteSpace(method) ? "GET" : method.Trim().ToUpperInvariant();
        return value.Length <= 12 ? value : value[..12];
    }

    private static string ResolveStatusClass(int statusCode)
    {
        if (statusCode <= 0)
        {
            return "0xx";
        }

        return $"{Math.Clamp(statusCode / 100, 0, 9)}xx";
    }

    private static string ResolveSource(PathString path)
    {
        var value = path.Value ?? "/";
        if (value.StartsWith("/api/admin", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("/api/admin-ai", StringComparison.OrdinalIgnoreCase))
        {
            return "admin";
        }

        if (value.StartsWith("/api/telemetry", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("/api/mobile", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("/api/notifications", StringComparison.OrdinalIgnoreCase))
        {
            return "mobile";
        }

        if (value.StartsWith("/api/ai", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("/api/voice", StringComparison.OrdinalIgnoreCase))
        {
            return "ai";
        }

        if (value.StartsWith("/health", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("/api/health", StringComparison.OrdinalIgnoreCase))
        {
            return "health";
        }

        return "api";
    }

    private static string ResolveRouteGroup(PathString path)
    {
        var value = (path.Value ?? "/").Trim();
        if (string.IsNullOrWhiteSpace(value))
        {
            return "/";
        }

        value = GuidRegex.Replace(value, ":id");
        value = NumberSegmentRegex.Replace(value, "/:id");

        var segments = value
            .Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Take(4)
            .ToArray();

        return segments.Length == 0
            ? "/"
            : "/" + string.Join('/', segments);
    }

    private static DateTime TruncateToMinute(DateTime value)
    {
        var utc = value.Kind == DateTimeKind.Utc ? value : value.ToUniversalTime();
        return new DateTime(utc.Year, utc.Month, utc.Day, utc.Hour, utc.Minute, 0, DateTimeKind.Utc);
    }
}

public sealed class OpsMetricsFlushService : BackgroundService
{
    private readonly OpsMetricsBuffer _buffer;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OpsMetricsFlushService> _logger;

    public OpsMetricsFlushService(
        OpsMetricsBuffer buffer,
        IServiceScopeFactory scopeFactory,
        ILogger<OpsMetricsFlushService> logger)
    {
        _buffer = buffer;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(60));
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await timer.WaitForNextTickAsync(stoppingToken);
                await FlushOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to flush ops metric buckets.");
            }
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        try
        {
            await FlushOnceAsync(cancellationToken);
        }
        catch (ObjectDisposedException)
        {
            _logger.LogDebug("Skipping final ops metric flush because the service provider is already disposed.");
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("disposed", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogDebug("Skipping final ops metric flush because the host is already disposing.");
        }

        await base.StopAsync(cancellationToken);
    }

    private async Task FlushOnceAsync(CancellationToken cancellationToken)
    {
        var snapshots = _buffer.SnapshotAndReset();
        if (snapshots.Count == 0)
        {
            return;
        }

        using var scope = _scopeFactory.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<AdminOpsMetricsService>();
        await service.FlushSnapshotsAsync(snapshots, cancellationToken);
    }
}

public sealed class AdminOpsMetricsService
{
    private static readonly int[] HistogramUpperBounds = { 100, 250, 500, 1000, 2500, 5000 };
    private readonly ApplicationDbContext _context;

    public AdminOpsMetricsService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task FlushSnapshotsAsync(IReadOnlyList<OpsMetricSnapshot> snapshots, CancellationToken cancellationToken)
    {
        if (!UsesPostgresProvider(_context))
        {
            return;
        }

        foreach (var snapshot in snapshots)
        {
            await UpsertSnapshotAsync(snapshot, "minute", snapshot.Key.BucketStart, cancellationToken);
            await UpsertSnapshotAsync(snapshot, "hour", TruncateToHour(snapshot.Key.BucketStart), cancellationToken);
            await UpsertSnapshotAsync(snapshot, "day", TruncateToDay(snapshot.Key.BucketStart), cancellationToken);
        }

        var minuteCutoff = DateTime.UtcNow.AddDays(-14);
        var hourCutoff = DateTime.UtcNow.AddDays(-400);
        await _context.Database.ExecuteSqlInterpolatedAsync($"""
            DELETE FROM "OpsMetricBucket"
            WHERE ("Granularity" = 'minute' AND "BucketStart" < {minuteCutoff})
               OR ("Granularity" = 'hour' AND "BucketStart" < {hourCutoff});
            """, cancellationToken);
    }

    public async Task<AdminOpsTrafficOverviewDto> GetTrafficOverviewAsync(
        AdminOpsTrafficQuery query,
        CancellationToken cancellationToken)
    {
        var (window, since) = ResolveWindow(query.Window);
        var granularity = ResolveGranularity(query.Granularity, DateTime.UtcNow - since);
        var rows = await _context.OpsMetricBuckets
            .AsNoTracking()
            .Where(row => row.Granularity == granularity && row.BucketStart >= since)
            .OrderBy(row => row.BucketStart)
            .ToListAsync(cancellationToken);

        var totals = Aggregate(rows);
        var timeline = rows
            .GroupBy(row => row.BucketStart)
            .OrderBy(group => group.Key)
            .Select(group => BuildPoint(group.Key, group))
            .ToArray();

        return new AdminOpsTrafficOverviewDto
        {
            GeneratedAt = DateTime.UtcNow,
            Window = window,
            Granularity = granularity,
            TotalRequests = totals.RequestCount,
            ErrorCount = totals.ErrorCount,
            ErrorRate = totals.RequestCount == 0 ? 0 : totals.ErrorCount / (double)totals.RequestCount,
            AverageLatencyMs = AverageLatency(totals),
            P95LatencyMs = EstimateP95(totals.Histogram),
            Timeline = timeline,
            TopRoutes = BuildBreakdown(rows, row => row.RouteGroup, 10),
            Sources = BuildBreakdown(rows, row => row.Source, 8),
            StatusClasses = BuildBreakdown(rows, row => row.StatusClass, 8),
        };
    }

    private async Task UpsertSnapshotAsync(
        OpsMetricSnapshot snapshot,
        string granularity,
        DateTime bucketStart,
        CancellationToken cancellationToken)
    {
        var histogramJson = JsonSerializer.Serialize(snapshot.Histogram);
        await _context.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "OpsMetricBucket" (
                "OpsMetricBucketId",
                "Source",
                "Method",
                "RouteGroup",
                "StatusClass",
                "BucketStart",
                "Granularity",
                "RequestCount",
                "ErrorCount",
                "DurationSumMs",
                "DurationMaxMs",
                "LatencyHistogramJson",
                "CreatedAt",
                "UpdatedAt"
            )
            VALUES (
                gen_random_uuid(),
                {snapshot.Key.Source},
                {snapshot.Key.Method},
                {snapshot.Key.RouteGroup},
                {snapshot.Key.StatusClass},
                {bucketStart},
                {granularity},
                {snapshot.RequestCount},
                {snapshot.ErrorCount},
                {snapshot.DurationSumMs},
                {snapshot.DurationMaxMs},
                {histogramJson},
                NOW() AT TIME ZONE 'UTC',
                NOW() AT TIME ZONE 'UTC'
            )
            ON CONFLICT ("Source", "Method", "RouteGroup", "StatusClass", "BucketStart", "Granularity")
            DO UPDATE SET
                "RequestCount" = "OpsMetricBucket"."RequestCount" + EXCLUDED."RequestCount",
                "ErrorCount" = "OpsMetricBucket"."ErrorCount" + EXCLUDED."ErrorCount",
                "DurationSumMs" = "OpsMetricBucket"."DurationSumMs" + EXCLUDED."DurationSumMs",
                "DurationMaxMs" = GREATEST("OpsMetricBucket"."DurationMaxMs", EXCLUDED."DurationMaxMs"),
                "LatencyHistogramJson" = jsonb_build_array(
                    COALESCE(("OpsMetricBucket"."LatencyHistogramJson"::jsonb->>0)::bigint, 0) + COALESCE((EXCLUDED."LatencyHistogramJson"::jsonb->>0)::bigint, 0),
                    COALESCE(("OpsMetricBucket"."LatencyHistogramJson"::jsonb->>1)::bigint, 0) + COALESCE((EXCLUDED."LatencyHistogramJson"::jsonb->>1)::bigint, 0),
                    COALESCE(("OpsMetricBucket"."LatencyHistogramJson"::jsonb->>2)::bigint, 0) + COALESCE((EXCLUDED."LatencyHistogramJson"::jsonb->>2)::bigint, 0),
                    COALESCE(("OpsMetricBucket"."LatencyHistogramJson"::jsonb->>3)::bigint, 0) + COALESCE((EXCLUDED."LatencyHistogramJson"::jsonb->>3)::bigint, 0),
                    COALESCE(("OpsMetricBucket"."LatencyHistogramJson"::jsonb->>4)::bigint, 0) + COALESCE((EXCLUDED."LatencyHistogramJson"::jsonb->>4)::bigint, 0),
                    COALESCE(("OpsMetricBucket"."LatencyHistogramJson"::jsonb->>5)::bigint, 0) + COALESCE((EXCLUDED."LatencyHistogramJson"::jsonb->>5)::bigint, 0)
                )::text,
                "UpdatedAt" = NOW() AT TIME ZONE 'UTC';
            """, cancellationToken);
    }

    private static bool UsesPostgresProvider(ApplicationDbContext context)
    {
        return context.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true;
    }

    private static AdminOpsTrafficPointDto BuildPoint(DateTime bucketStart, IEnumerable<OpsMetricBucket> rows)
    {
        var totals = Aggregate(rows);
        return new AdminOpsTrafficPointDto
        {
            BucketStart = bucketStart,
            RequestCount = totals.RequestCount,
            ErrorCount = totals.ErrorCount,
            AverageLatencyMs = AverageLatency(totals),
            P95LatencyMs = EstimateP95(totals.Histogram),
        };
    }

    private static IReadOnlyList<AdminOpsTrafficBreakdownDto> BuildBreakdown(
        IEnumerable<OpsMetricBucket> rows,
        Func<OpsMetricBucket, string> keySelector,
        int limit)
    {
        return rows
            .GroupBy(keySelector, StringComparer.OrdinalIgnoreCase)
            .Select(group =>
            {
                var totals = Aggregate(group);
                return new AdminOpsTrafficBreakdownDto
                {
                    Key = group.Key,
                    RequestCount = totals.RequestCount,
                    ErrorCount = totals.ErrorCount,
                    AverageLatencyMs = AverageLatency(totals),
                };
            })
            .OrderByDescending(item => item.RequestCount)
            .ThenBy(item => item.Key, StringComparer.OrdinalIgnoreCase)
            .Take(limit)
            .ToArray();
    }

    private static OpsMetricTotals Aggregate(IEnumerable<OpsMetricBucket> rows)
    {
        var histogram = new long[HistogramUpperBounds.Length];
        long requestCount = 0;
        long errorCount = 0;
        long durationSum = 0;
        foreach (var row in rows)
        {
            requestCount += row.RequestCount;
            errorCount += row.ErrorCount;
            durationSum += row.DurationSumMs;
            var rowHistogram = AdminControlPlaneJson.Deserialize(row.LatencyHistogramJson, Array.Empty<long>());
            for (var i = 0; i < histogram.Length && i < rowHistogram.Length; i += 1)
            {
                histogram[i] += rowHistogram[i];
            }
        }

        return new OpsMetricTotals(requestCount, errorCount, durationSum, histogram);
    }

    private static double AverageLatency(OpsMetricTotals totals)
    {
        return totals.RequestCount == 0 ? 0 : Math.Round(totals.DurationSumMs / (double)totals.RequestCount, 1);
    }

    private static int EstimateP95(IReadOnlyList<long> histogram)
    {
        var total = histogram.Sum();
        if (total <= 0)
        {
            return 0;
        }

        var target = Math.Ceiling(total * 0.95);
        long running = 0;
        for (var i = 0; i < histogram.Count && i < HistogramUpperBounds.Length; i += 1)
        {
            running += histogram[i];
            if (running >= target)
            {
                return HistogramUpperBounds[i];
            }
        }

        return HistogramUpperBounds[^1];
    }

    private static (string Window, DateTime Since) ResolveWindow(string? value)
    {
        var now = DateTime.UtcNow;
        return value?.Trim().ToLowerInvariant() switch
        {
            "1h" => ("1h", now.AddHours(-1)),
            "6h" => ("6h", now.AddHours(-6)),
            "24h" or "1d" => ("24h", now.AddDays(-1)),
            "7d" => ("7d", now.AddDays(-7)),
            "30d" => ("30d", now.AddDays(-30)),
            "90d" => ("90d", now.AddDays(-90)),
            "1y" or "365d" => ("1y", now.AddDays(-365)),
            _ => ("24h", now.AddDays(-1)),
        };
    }

    private static string ResolveGranularity(string? value, TimeSpan window)
    {
        var requested = value?.Trim().ToLowerInvariant();
        if (requested is "minute" or "hour" or "day")
        {
            return requested;
        }

        if (window <= TimeSpan.FromHours(6))
        {
            return "minute";
        }

        return window <= TimeSpan.FromDays(30) ? "hour" : "day";
    }

    private static DateTime TruncateToHour(DateTime value)
    {
        var utc = value.Kind == DateTimeKind.Utc ? value : value.ToUniversalTime();
        return new DateTime(utc.Year, utc.Month, utc.Day, utc.Hour, 0, 0, DateTimeKind.Utc);
    }

    private static DateTime TruncateToDay(DateTime value)
    {
        var utc = value.Kind == DateTimeKind.Utc ? value : value.ToUniversalTime();
        return new DateTime(utc.Year, utc.Month, utc.Day, 0, 0, 0, DateTimeKind.Utc);
    }

    private sealed record OpsMetricTotals(long RequestCount, long ErrorCount, long DurationSumMs, long[] Histogram);
}

public sealed record OpsMetricKey(
    string Source,
    string Method,
    string RouteGroup,
    string StatusClass,
    DateTime BucketStart);

public sealed record OpsMetricSnapshot(
    OpsMetricKey Key,
    long RequestCount,
    long ErrorCount,
    long DurationSumMs,
    int DurationMaxMs,
    long[] Histogram);

internal sealed class OpsMetricAccumulator
{
    private readonly object _gate = new();
    private readonly long[] _histogram = new long[6];
    private long _requestCount;
    private long _errorCount;
    private long _durationSumMs;
    private int _durationMaxMs;

    public void Add(long durationMs, string statusClass)
    {
        lock (_gate)
        {
            _requestCount += 1;
            if (!string.Equals(statusClass, "2xx", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(statusClass, "3xx", StringComparison.OrdinalIgnoreCase))
            {
                _errorCount += 1;
            }

            var normalizedDuration = Math.Clamp(durationMs, 0, int.MaxValue);
            _durationSumMs += normalizedDuration;
            _durationMaxMs = Math.Max(_durationMaxMs, (int)normalizedDuration);
            _histogram[ResolveHistogramIndex(normalizedDuration)] += 1;
        }
    }

    public OpsMetricSnapshot ToSnapshot(OpsMetricKey key)
    {
        lock (_gate)
        {
            return new OpsMetricSnapshot(
                key,
                _requestCount,
                _errorCount,
                _durationSumMs,
                _durationMaxMs,
                _histogram.ToArray());
        }
    }

    private static int ResolveHistogramIndex(long durationMs)
    {
        return durationMs switch
        {
            <= 100 => 0,
            <= 250 => 1,
            <= 500 => 2,
            <= 1000 => 3,
            <= 2500 => 4,
            _ => 5,
        };
    }
}
