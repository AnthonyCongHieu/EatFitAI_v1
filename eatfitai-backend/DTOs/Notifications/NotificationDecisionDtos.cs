namespace EatFitAI.API.DTOs.Notifications;

public static class NotificationSuppressReason
{
    public const string IncompleteDay = "incomplete_day";
    public const string QuietHours = "quiet_hours";
    public const string AlreadyComplete = "already_complete";
    public const string Cooldown = "cooldown";
}

public sealed class NotificationDecisionRequestDto
{
    public DateOnly LocalDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public TimeOnly LocalTime { get; set; } = TimeOnly.FromDateTime(DateTime.UtcNow);
    public TimeOnly QuietHoursStart { get; set; } = new(21, 30);
    public TimeOnly QuietHoursEnd { get; set; } = new(7, 0);
    public string NudgeType { get; set; } = "meal";
    public DateTimeOffset? LastNudgedAt { get; set; }
    public int CooldownMinutes { get; set; } = 180;
}

public sealed class NotificationDecisionDto
{
    public bool ShouldNudge { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTimeOffset? SuppressUntil { get; set; }
    public string SuggestedMessage { get; set; } = string.Empty;
    public string DeepLink { get; set; } = "/diary/add";
}
