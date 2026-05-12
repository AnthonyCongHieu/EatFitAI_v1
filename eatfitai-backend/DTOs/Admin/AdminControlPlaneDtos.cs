using System.Text.Json;

namespace EatFitAI.API.DTOs.Admin;

public sealed class AdminOpsTrafficQuery
{
    public string? Window { get; set; } = "24h";
    public string? Granularity { get; set; }
}

public sealed class AdminOpsTrafficOverviewDto
{
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public string Window { get; set; } = "24h";
    public string Granularity { get; set; } = "hour";
    public long TotalRequests { get; set; }
    public long ErrorCount { get; set; }
    public double ErrorRate { get; set; }
    public double AverageLatencyMs { get; set; }
    public int P95LatencyMs { get; set; }
    public IReadOnlyList<AdminOpsTrafficPointDto> Timeline { get; set; } = Array.Empty<AdminOpsTrafficPointDto>();
    public IReadOnlyList<AdminOpsTrafficBreakdownDto> TopRoutes { get; set; } = Array.Empty<AdminOpsTrafficBreakdownDto>();
    public IReadOnlyList<AdminOpsTrafficBreakdownDto> Sources { get; set; } = Array.Empty<AdminOpsTrafficBreakdownDto>();
    public IReadOnlyList<AdminOpsTrafficBreakdownDto> StatusClasses { get; set; } = Array.Empty<AdminOpsTrafficBreakdownDto>();
}

public sealed class AdminOpsTrafficPointDto
{
    public DateTime BucketStart { get; set; }
    public long RequestCount { get; set; }
    public long ErrorCount { get; set; }
    public double AverageLatencyMs { get; set; }
    public int P95LatencyMs { get; set; }
}

public sealed class AdminOpsTrafficBreakdownDto
{
    public string Key { get; set; } = string.Empty;
    public long RequestCount { get; set; }
    public long ErrorCount { get; set; }
    public double AverageLatencyMs { get; set; }
}

public sealed class AdminAnalyticsOverviewDto
{
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public string Window { get; set; } = "7d";
    public int TotalEvents { get; set; }
    public int ActiveUsers { get; set; }
    public int RuntimeErrors { get; set; }
    public int PushOptInDevices { get; set; }
    public IReadOnlyList<AdminAnalyticsMetricDto> TopScreens { get; set; } = Array.Empty<AdminAnalyticsMetricDto>();
    public IReadOnlyList<AdminAnalyticsMetricDto> ScanFunnel { get; set; } = Array.Empty<AdminAnalyticsMetricDto>();
    public IReadOnlyList<AdminAnalyticsMetricDto> EventCategories { get; set; } = Array.Empty<AdminAnalyticsMetricDto>();
}

public sealed class AdminAnalyticsMetricDto
{
    public string Key { get; set; } = string.Empty;
    public int Count { get; set; }
}

public sealed class MobileRuntimeConfigDto
{
    public string Environment { get; set; } = "production";
    public string Platform { get; set; } = "all";
    public string Channel { get; set; } = "production";
    public bool MaintenanceEnabled { get; set; }
    public string? MaintenanceMessage { get; set; }
    public bool ForceUpdateEnabled { get; set; }
    public string? MinSupportedVersion { get; set; }
    public string? LatestVersion { get; set; }
    public string? UpdateUrl { get; set; }
    public Dictionary<string, bool> FeatureFlags { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public double TelemetrySampleRate { get; set; } = 1.0;
    public int ConfigVersion { get; set; } = 1;
    public string? UpdatedBy { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string ETag { get; set; } = string.Empty;
}

public sealed class UpdateMobileRuntimeConfigRequest
{
    public string? Environment { get; set; }
    public string? Platform { get; set; }
    public string? Channel { get; set; }
    public bool MaintenanceEnabled { get; set; }
    public string? MaintenanceMessage { get; set; }
    public bool ForceUpdateEnabled { get; set; }
    public string? MinSupportedVersion { get; set; }
    public string? LatestVersion { get; set; }
    public string? UpdateUrl { get; set; }
    public Dictionary<string, bool>? FeatureFlags { get; set; }
    public double TelemetrySampleRate { get; set; } = 1.0;
    public int? ExpectedConfigVersion { get; set; }
    public string? Justification { get; set; }
}

public sealed class RegisterPushDeviceRequest
{
    public string ExpoPushToken { get; set; } = string.Empty;
    public string? Platform { get; set; }
    public string? DeviceId { get; set; }
    public string? AppVersion { get; set; }
    public string? RuntimeVersion { get; set; }
    public string? Channel { get; set; }
    public string? PermissionStatus { get; set; }
}

public sealed class PushDeviceRegistrationDto
{
    public Guid PushDeviceId { get; set; }
    public bool IsEnabled { get; set; }
    public DateTime LastRegisteredAt { get; set; }
}

public sealed class PushCampaignDto
{
    public Guid PushCampaignId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public Dictionary<string, string> Data { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public string Status { get; set; } = "draft";
    public DateTime? ScheduledAt { get; set; }
    public int TargetCount { get; set; }
    public int DeliveredCount { get; set; }
    public int FailedCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class CreatePushCampaignRequest
{
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public Dictionary<string, string>? Data { get; set; }
    public DateTime? ScheduledAt { get; set; }
    public bool ScheduleNow { get; set; }
    public string? Justification { get; set; }
}

public sealed class PushAudiencePreviewDto
{
    public int EligibleDeviceCount { get; set; }
    public int DistinctUserCount { get; set; }
}

internal static class AdminControlPlaneJson
{
    public static string Serialize<T>(T value)
    {
        return JsonSerializer.Serialize(value, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
    }

    public static T Deserialize<T>(string? value, T fallback)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        try
        {
            return JsonSerializer.Deserialize<T>(value) ?? fallback;
        }
        catch
        {
            return fallback;
        }
    }
}
