using System;

namespace EatFitAI.API.Models;

public class AdminAuditEvent
{
    public Guid AdminAuditEventId { get; set; }
    public string Actor { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Entity { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Outcome { get; set; } = "unknown";
    public DateTime OccurredAt { get; set; }
    public string? RequestId { get; set; }
    public string? Detail { get; set; }
}
