using System;

namespace EatFitAI.API.DTOs.AdminAi;

public class GeminiKeyDto
{
    public Guid Id { get; set; }
    public string KeyName { get; set; } = string.Empty;
    public string MaskedApiKey { get; set; } = string.Empty;
    public int DailyRequestsUsed { get; set; }
    public int TotalRequestsUsed { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Tier { get; set; } = "Free";
    public string Model { get; set; } = "gemini-2.5-flash";
    public int DailyQuotaLimit { get; set; } = 1500;
    public string? ProjectId { get; set; }
    public string? Notes { get; set; }
    public string? RuntimeProjectId { get; set; }
    public string CredentialRole { get; set; } = "warm_spare";
    public string? LastProbeStatus { get; set; }
    public string? LastProbeAt { get; set; }
}

