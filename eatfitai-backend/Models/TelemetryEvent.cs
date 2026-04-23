namespace EatFitAI.API.Models;

public class TelemetryEvent
{
    public Guid TelemetryEventId { get; set; }
    public Guid? UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
    public string? Screen { get; set; }
    public string? Flow { get; set; }
    public string? Step { get; set; }
    public string? Status { get; set; }
    public string? SessionId { get; set; }
    public string? MetadataJson { get; set; }
    public string? RequestId { get; set; }
    public DateTime CreatedAt { get; set; }
    public virtual User? User { get; set; }
}
