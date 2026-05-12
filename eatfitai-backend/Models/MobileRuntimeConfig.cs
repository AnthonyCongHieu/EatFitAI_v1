namespace EatFitAI.API.Models;

public class MobileRuntimeConfig
{
    public Guid MobileRuntimeConfigId { get; set; }
    public string Environment { get; set; } = "production";
    public string Platform { get; set; } = "all";
    public string Channel { get; set; } = "production";
    public bool MaintenanceEnabled { get; set; }
    public string? MaintenanceMessage { get; set; }
    public bool ForceUpdateEnabled { get; set; }
    public string? MinSupportedVersion { get; set; }
    public string? LatestVersion { get; set; }
    public string? UpdateUrl { get; set; }
    public string FeatureFlagsJson { get; set; } = "{}";
    public double TelemetrySampleRate { get; set; } = 1.0;
    public int ConfigVersion { get; set; } = 1;
    public string? UpdatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
