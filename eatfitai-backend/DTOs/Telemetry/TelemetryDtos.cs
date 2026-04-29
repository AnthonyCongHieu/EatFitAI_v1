using System.Text.Json;

namespace EatFitAI.API.DTOs.Telemetry;

public sealed class TelemetryBatchRequestDto
{
    public List<TelemetryEventRequestDto> Events { get; set; } = new();
}

public sealed class TelemetryEventRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public DateTimeOffset? OccurredAt { get; set; }
    public string? Screen { get; set; }
    public string? Flow { get; set; }
    public string? Step { get; set; }
    public string? Status { get; set; }
    public string? SessionId { get; set; }
    public JsonElement? Metadata { get; set; }
}
