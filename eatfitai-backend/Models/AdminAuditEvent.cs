using System;

namespace EatFitAI.API.Models;

public class AdminAuditEvent
{
    public Guid AdminAuditEventId { get; set; }
    public string Actor { get; set; } = string.Empty;
    public string? ActorId { get; set; }
    public string? ActorEmail { get; set; }
    public string? EffectiveRole { get; set; }
    public string? CapabilitySnapshot { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Entity { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Outcome { get; set; } = "unknown";
    public string? Severity { get; set; }
    public DateTime OccurredAt { get; set; }
    public string? RequestId { get; set; }
    public string? CorrelationId { get; set; }
    public string? Environment { get; set; }
    public string? DiffSummary { get; set; }
    public string? Justification { get; set; }
    public string? Detail { get; set; }
}
