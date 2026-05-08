namespace EatFitAI.API.DTOs.Lapse;

public sealed class LapseRecoveryDto
{
    public string Tier { get; set; } = string.Empty;
    public int? DaysSinceLastCompleteDay { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string DeepLink { get; set; } = string.Empty;
}
