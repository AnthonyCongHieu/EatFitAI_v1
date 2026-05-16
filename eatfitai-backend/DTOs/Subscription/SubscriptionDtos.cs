namespace EatFitAI.API.DTOs.Subscription;

public sealed class SubscriptionStatusDto
{
    public string PlanCode { get; set; } = "free";

    public string Status { get; set; } = "active";

    public bool IsPremium { get; set; }

    public Dictionary<string, bool> Features { get; set; } = new();

    public Dictionary<string, int> Limits { get; set; } = new();

    public DateTime? ExpiresAt { get; set; }
}
