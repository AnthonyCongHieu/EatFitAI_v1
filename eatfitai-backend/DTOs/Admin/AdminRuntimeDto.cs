namespace EatFitAI.API.DTOs.Admin;

public class AdminRuntimeSnapshotDto
{
    public DateTime CheckedAt { get; set; } = DateTime.UtcNow;
    public string PoolHealth { get; set; } = "Unknown";
    public string? ActiveProject { get; set; }
    public int AvailableProjectCount { get; set; }
    public int ExhaustedProjectCount { get; set; }
    public int CooldownProjectCount { get; set; }
    public int DistinctProjectCount { get; set; }
    public RuntimeLimitsDto Limits { get; set; } = new();
    public List<RuntimeProjectStateDto> Projects { get; set; } = new();
}

public class RuntimeLimitsDto
{
    public int? Rpm { get; set; }
    public int? Tpm { get; set; }
    public int? Rpd { get; set; }
}

public class RuntimeProjectStateDto
{
    public string ProjectAlias { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
    public string KeyAlias { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string State { get; set; } = "unknown";
    public bool Available { get; set; }
    public string AvailabilityReason { get; set; } = "unknown";
    public string QuotaSource { get; set; } = "unknown";
    public string? AvailableAfter { get; set; }
    public int? RpmUsed { get; set; }
    public int? RpmRemaining { get; set; }
    public string? RpmRecoveryAt { get; set; }
    public int? TpmUsed { get; set; }
    public int? TpmRemaining { get; set; }
    public string? TpmRecoveryAt { get; set; }
    public int? RpdUsed { get; set; }
    public int? RpdRemaining { get; set; }
    public string? RpdRecoveryAt { get; set; }
    public int TotalRequests { get; set; }
    public int TotalTokens { get; set; }
    public string? LastUsedAt { get; set; }
    public string? LastProviderStatusCode { get; set; }
}

public class AdminRuntimeEventDto
{
    public string EventId { get; set; } = Guid.NewGuid().ToString("N");
    public string EventType { get; set; } = "runtime.snapshot";
    public string EntityType { get; set; } = "runtime";
    public string EntityId { get; set; } = "global";
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public long Version { get; set; }
    public object Payload { get; set; } = new();
}
