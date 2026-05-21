using EatFitAI.API.Services;

namespace EatFitAI.API.DTOs.AI;

public sealed class AiUsageQuotaStatusDto
{
    public string PlanCode { get; set; } = "free";
    public bool IsPremium { get; set; }
    public string TimeZoneId { get; set; } = BusinessTimeZone.DefaultTimeZoneId;
    public DateTime WindowStartUtc { get; set; }
    public DateTime ResetAtUtc { get; set; }
    public List<AiUsageQuotaFeatureDto> Features { get; set; } = new();
}

public sealed class AiUsageQuotaFeatureDto
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public bool IsLimited { get; set; }
    public int? Limit { get; set; }
    public int Used { get; set; }
    public int? Remaining { get; set; }
    public DateTime ResetAtUtc { get; set; }
}
