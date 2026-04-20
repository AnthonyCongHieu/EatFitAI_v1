using System.ComponentModel.DataAnnotations;

namespace EatFitAI.API.DTOs.AdminAi;

public class AdminRuntimeProjectDto
{
    public string RuntimeProjectId { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
    public string ProjectAlias { get; set; } = string.Empty;
    public Guid PrimaryKeyId { get; set; }
    public string PrimaryKeyName { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public string State { get; set; } = "unknown";
    public string ManualRole { get; set; } = "warm_spare";
    public string LastProviderStatus { get; set; } = "unknown";
    public string? CooldownUntil { get; set; }
    public string? LastSuccessAt { get; set; }
    public string? LastFailureAt { get; set; }
    public string? LastRateLimitedAt { get; set; }
    public int ConsecutiveFailures { get; set; }
    public int PriorityWeight { get; set; }
    public string? LastModel { get; set; }
    public int? LastLatencyMs { get; set; }
    public string? LastUsedAt { get; set; }
    public string? LastUsageMetadataJson { get; set; }
    public int KeyCount { get; set; }
    public bool IsActiveNow { get; set; }
    public int TotalRequests { get; set; }
}

public class AdminRuntimeTelemetryDto
{
    public string RequestId { get; set; } = Guid.NewGuid().ToString("N");
    public string RuntimeProjectId { get; set; } = string.Empty;
    public string ProjectAlias { get; set; } = string.Empty;
    public Guid GeminiKeyId { get; set; }
    public string KeyName { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string TriggerSource { get; set; } = "local";
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
    public int LatencyMs { get; set; }
    public string Outcome { get; set; } = "unknown";
    public int ProviderStatusCode { get; set; }
    public string? ProviderErrorCode { get; set; }
    public string? FinishReason { get; set; }
    public string? UsageMetadataJson { get; set; }
    public string? FailoverFromProjectId { get; set; }
}

public class AdminRuntimeMetricsDto
{
    public string? ActiveProjectId { get; set; }
    public string? ActiveProjectAlias { get; set; }
    public int DistinctProjectCount { get; set; }
    public int AvailableProjectCount { get; set; }
    public int CoolingDownProjectCount { get; set; }
    public int AuthInvalidProjectCount { get; set; }
    public int DisabledProjectCount { get; set; }
    public int TotalTelemetryCount { get; set; }
    public int RecentSuccessCount { get; set; }
    public int RecentFailureCount { get; set; }
    public int RecentRateLimitedCount { get; set; }
}

public class SetRuntimeProjectRoleRequest
{
    [Required]
    public string ManualRole { get; set; } = "warm_spare";
}

public class RuntimeProjectImportRequest
{
    [Required]
    [MaxLength(100)]
    public string KeyName { get; set; } = string.Empty;

    [Required]
    public string ApiKey { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string ProjectId { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? ProjectAlias { get; set; }

    public string Tier { get; set; } = "Free";
    public string Model { get; set; } = "gemini-2.5-flash";
    public int DailyQuotaLimit { get; set; } = 1500;
    public string? Notes { get; set; }
}

public class ProbeRuntimeProjectResult
{
    public string RuntimeProjectId { get; set; } = string.Empty;
    public string ProjectAlias { get; set; } = string.Empty;
    public string Status { get; set; } = "unknown";
    public int StatusCode { get; set; }
    public string Message { get; set; } = string.Empty;
    public int LatencyMs { get; set; }
}

public class SimulateRuntimeRequest
{
    public int? ForcedStatusCode { get; set; }
    public string TriggerSource { get; set; } = "admin-ui";
}
