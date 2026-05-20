using EatFitAI.API.Services;

namespace EatFitAI.API.DTOs.Notifications;

public static class NotificationSuppressReason
{
    public const string IncompleteDay = "incomplete_day";
    public const string QuietHours = "quiet_hours";
    public const string AlreadyComplete = "already_complete";
    public const string Cooldown = "cooldown";
    public const string RecentlyIgnored = "recently_ignored";
}

public sealed class NotificationDecisionRequestDto
{
    public DateOnly LocalDate { get; set; } = DateOnly.FromDateTime(GetDefaultBusinessNow());
    public TimeOnly LocalTime { get; set; } = TimeOnly.FromDateTime(GetDefaultBusinessNow());
    public TimeOnly QuietHoursStart { get; set; } = new(21, 30);
    public TimeOnly QuietHoursEnd { get; set; } = new(7, 0);
    public string NudgeType { get; set; } = "meal";
    public int? MealTypeId { get; set; }
    public TimeOnly? PredictedMealWindowStart { get; set; }
    public TimeOnly? PredictedMealWindowEnd { get; set; }
    public DateTimeOffset? LastNudgedAt { get; set; }
    public int CooldownMinutes { get; set; } = 180;
    public DateTimeOffset? LastIgnoredAt { get; set; }
    public int IgnoreCooldownMinutes { get; set; } = 720;

    private static DateTime GetDefaultBusinessNow()
    {
        return TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, BusinessTimeZone.DefaultTimeZone).DateTime;
    }
}

public sealed class NotificationDecisionDto
{
    public bool ShouldNudge { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? ReasonToSend { get; set; }
    public string? ReasonToSuppress { get; set; }
    public DateTimeOffset? SuppressUntil { get; set; }
    public string SuggestedMessage { get; set; } = string.Empty;
    public string DeepLink { get; set; } = "/diary/add";
    public string QuietHours { get; set; } = string.Empty;
    public bool CooldownPassed { get; set; } = true;
    public string? PredictedMealWindow { get; set; }
    public string? CurrentDayState { get; set; }
}
