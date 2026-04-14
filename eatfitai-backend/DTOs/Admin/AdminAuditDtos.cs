using System;
using System.Collections.Generic;

namespace EatFitAI.API.DTOs.Admin;

public class AdminAuditEventDto
{
    public Guid Id { get; set; }
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

public class AdminAuditFeedDto
{
    public List<AdminAuditEventDto> Data { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class AdminAuditQuery
{
    public string? Actor { get; set; }
    public string? Action { get; set; }
    public string? Entity { get; set; }
    public string? Outcome { get; set; }
    public string? RequestId { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class AdminAuditWriteRequest
{
    public string Action { get; set; } = string.Empty;
    public string Entity { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Outcome { get; set; } = "unknown";
    public string Severity { get; set; } = "info";
    public string? DiffSummary { get; set; }
    public string? Justification { get; set; }
    public string? Detail { get; set; }
}
