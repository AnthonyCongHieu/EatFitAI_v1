using EatFitAI.API.Data;
using EatFitAI.API.DTOs.Admin;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public sealed class AdminAnalyticsOverviewService
{
    private readonly ApplicationDbContext _context;

    public AdminAnalyticsOverviewService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AdminAnalyticsOverviewDto> GetOverviewAsync(string? window, CancellationToken cancellationToken)
    {
        var (resolvedWindow, since) = ResolveWindow(window);
        var telemetry = _context.TelemetryEvents.AsNoTracking().Where(item => item.OccurredAt >= since);

        var totalEvents = await telemetry.CountAsync(cancellationToken);
        var activeUsers = await telemetry
            .Where(item => item.UserId != null)
            .Select(item => item.UserId)
            .Distinct()
            .CountAsync(cancellationToken);
        var runtimeErrors = await telemetry
            .Where(item => item.Category == "error"
                || item.Status == "error"
                || item.Name.Contains("error"))
            .CountAsync(cancellationToken);
        var pushOptInDevices = await _context.PushDevices
            .AsNoTracking()
            .Where(item => item.IsEnabled && item.PermissionStatus == "granted")
            .CountAsync(cancellationToken);

        var topScreens = await telemetry
            .Where(item => item.Screen != null && item.Screen != "")
            .GroupBy(item => item.Screen!)
            .Select(group => new AdminAnalyticsMetricDto { Key = group.Key, Count = group.Count() })
            .OrderByDescending(item => item.Count)
            .Take(10)
            .ToListAsync(cancellationToken);

        var scanFunnel = await telemetry
            .Where(item => item.Name.Contains("scan")
                || item.Name.Contains("vision")
                || (item.Flow != null && (item.Flow.Contains("scan") || item.Flow.Contains("vision"))))
            .GroupBy(item => item.Status ?? item.Step ?? item.Name)
            .Select(group => new AdminAnalyticsMetricDto { Key = group.Key, Count = group.Count() })
            .OrderByDescending(item => item.Count)
            .Take(10)
            .ToListAsync(cancellationToken);

        var categories = await telemetry
            .GroupBy(item => item.Category)
            .Select(group => new AdminAnalyticsMetricDto { Key = group.Key, Count = group.Count() })
            .OrderByDescending(item => item.Count)
            .Take(10)
            .ToListAsync(cancellationToken);

        return new AdminAnalyticsOverviewDto
        {
            GeneratedAt = DateTime.UtcNow,
            Window = resolvedWindow,
            TotalEvents = totalEvents,
            ActiveUsers = activeUsers,
            RuntimeErrors = runtimeErrors,
            PushOptInDevices = pushOptInDevices,
            TopScreens = topScreens,
            ScanFunnel = scanFunnel,
            EventCategories = categories,
        };
    }

    private static (string Window, DateTime Since) ResolveWindow(string? value)
    {
        var now = DateTime.UtcNow;
        return value?.Trim().ToLowerInvariant() switch
        {
            "24h" or "1d" => ("24h", now.AddDays(-1)),
            "7d" => ("7d", now.AddDays(-7)),
            "30d" => ("30d", now.AddDays(-30)),
            "90d" => ("90d", now.AddDays(-90)),
            _ => ("7d", now.AddDays(-7)),
        };
    }
}
