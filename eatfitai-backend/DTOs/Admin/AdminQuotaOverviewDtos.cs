namespace EatFitAI.API.DTOs.Admin;

public class AdminQuotaOverviewQuery
{
    public string? Provider { get; set; } = "all";
    public string? Window { get; set; } = "7d";
}

public class AdminQuotaOverviewDto
{
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public int CacheTtlSeconds { get; set; } = 60;
    public string ProviderFilter { get; set; } = "all";
    public string Window { get; set; } = "7d";
    public List<AdminQuotaProviderDto> Providers { get; set; } = new();
    public List<AdminQuotaTimelinePointDto> TokenTimeline { get; set; } = new();
    public List<AdminQuotaModelMixDto> ModelMix { get; set; } = new();
    public AdminQuotaCostEstimateDto CostEstimate { get; set; } = new();
    public List<AdminQuotaRecommendationDto> Recommendations { get; set; } = new();
}

public class AdminQuotaProviderDto
{
    public string Provider { get; set; } = "gemini";
    public string ProviderLabel { get; set; } = "Gemini";
    public string RuntimeProjectId { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
    public string ProjectAlias { get; set; } = string.Empty;
    public string KeyAlias { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string State { get; set; } = "unknown";
    public bool IsEnabled { get; set; }
    public bool Available { get; set; }
    public string AvailabilityReason { get; set; } = "unknown";
    public string QuotaSource { get; set; } = "unknown";
    public string? LastUsedAt { get; set; }
    public string? AvailableAfter { get; set; }
    public int TotalRequests { get; set; }
    public int TotalTokens { get; set; }
    public List<AdminQuotaWindowDto> Windows { get; set; } = new();
}

public class AdminQuotaWindowDto
{
    public string Kind { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int Used { get; set; }
    public int Remaining { get; set; }
    public int? Limit { get; set; }
    public double PercentUsed { get; set; }
    public double PercentRemaining { get; set; }
    public string? RecoveryAt { get; set; }
}

public class AdminQuotaTimelinePointDto
{
    public string Date { get; set; } = string.Empty;
    public int InputTokens { get; set; }
    public int OutputTokens { get; set; }
    public int TotalTokens { get; set; }
    public int RequestCount { get; set; }
}

public class AdminQuotaModelMixDto
{
    public string Provider { get; set; } = "gemini";
    public string Model { get; set; } = string.Empty;
    public int RequestCount { get; set; }
    public int InputTokens { get; set; }
    public int OutputTokens { get; set; }
    public int TotalTokens { get; set; }
}

public class AdminQuotaCostEstimateDto
{
    public string Currency { get; set; } = "USD";
    public decimal EstimatedTotal { get; set; }
    public string Source { get; set; } = "not_configured";
    public int InputTokens { get; set; }
    public int OutputTokens { get; set; }
    public int TotalTokens { get; set; }
    public List<AdminQuotaCostEstimateItemDto> Items { get; set; } = new();
}

public class AdminQuotaCostEstimateItemDto
{
    public string Provider { get; set; } = "gemini";
    public string Model { get; set; } = string.Empty;
    public int TotalTokens { get; set; }
    public decimal EstimatedCost { get; set; }
    public string PricingSource { get; set; } = "not_configured";
}

public class AdminQuotaRecommendationDto
{
    public string Severity { get; set; } = "info";
    public string Title { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
}

public class AdminQuotaBulkActionRequest
{
    public string Action { get; set; } = string.Empty;
    public string Provider { get; set; } = "gemini";
    public List<string>? RuntimeProjectIds { get; set; }
}

public class AdminQuotaBulkActionPreviewDto
{
    public string Action { get; set; } = string.Empty;
    public string Provider { get; set; } = "gemini";
    public int AffectedCount { get; set; }
    public bool Committed { get; set; }
    public List<AdminQuotaBulkActionTargetDto> Targets { get; set; } = new();
}

public class AdminQuotaBulkActionTargetDto
{
    public string RuntimeProjectId { get; set; } = string.Empty;
    public string ProjectAlias { get; set; } = string.Empty;
    public string State { get; set; } = "unknown";
    public bool IsEnabled { get; set; }
    public string Reason { get; set; } = string.Empty;
}
