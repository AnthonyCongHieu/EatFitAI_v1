using System;

namespace EatFitAI.API.DTOs.AdminAi;

public class GeminiKeyDto
{
    public Guid Id { get; set; }
    public string KeyName { get; set; } = string.Empty;
    public string MaskedApiKey { get; set; } = string.Empty; // e.g., AIza...***
    public int DailyRequestsUsed { get; set; }
    public int TotalRequestsUsed { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
