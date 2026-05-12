namespace EatFitAI.API.Models;

public class PushDevice
{
    public Guid PushDeviceId { get; set; }
    public Guid UserId { get; set; }
    public string ExpoPushToken { get; set; } = string.Empty;
    public string Platform { get; set; } = "unknown";
    public string? DeviceId { get; set; }
    public string? AppVersion { get; set; }
    public string? RuntimeVersion { get; set; }
    public string? Channel { get; set; }
    public string PermissionStatus { get; set; } = "unknown";
    public bool IsEnabled { get; set; } = true;
    public string? DisabledReason { get; set; }
    public DateTime LastRegisteredAt { get; set; }
    public DateTime LastSeenAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public virtual User? User { get; set; }
}
