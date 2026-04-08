namespace EatFitAI.API.DTOs.AI;

public enum AiHealthState
{
    Healthy,
    Degraded,
    Down
}

public sealed class AiHealthStatusDto
{
    public string State { get; set; } = AiHealthState.Degraded.ToString().ToUpperInvariant();

    public string ProviderUrl { get; set; } = string.Empty;

    public DateTimeOffset? LastCheckedAt { get; set; }

    public DateTimeOffset? LastHealthyAt { get; set; }

    public int ConsecutiveFailures { get; set; }

    public bool ModelLoaded { get; set; }

    public bool GeminiConfigured { get; set; }

    public string? Message { get; set; }
}
