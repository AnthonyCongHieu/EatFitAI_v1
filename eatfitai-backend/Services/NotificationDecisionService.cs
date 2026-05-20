using System.Globalization;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.Notifications;

namespace EatFitAI.API.Services;

public interface INotificationDecisionService
{
    Task<NotificationDecisionDto> ShouldNudgeAsync(
        Guid userId,
        NotificationDecisionRequestDto request,
        CancellationToken cancellationToken = default);
}

public sealed class NotificationDecisionService : INotificationDecisionService
{
    private readonly EatFitAIDbContext _context;
    private readonly IDayCompletenessService _dayCompletenessService;

    public NotificationDecisionService(
        EatFitAIDbContext context,
        IDayCompletenessService dayCompletenessService)
    {
        _context = context;
        _dayCompletenessService = dayCompletenessService;
    }

    public async Task<NotificationDecisionDto> ShouldNudgeAsync(
        Guid userId,
        NotificationDecisionRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (IsQuietHours(request.LocalTime, request.QuietHoursStart, request.QuietHoursEnd))
        {
            return Suppressed(
                request,
                NotificationSuppressReason.QuietHours,
                "Đang trong giờ yên tĩnh.",
                NextQuietHoursEnd(request),
                cooldownPassed: true);
        }

        if (request.LastNudgedAt.HasValue && request.CooldownMinutes > 0)
        {
            var cooldownUntil = request.LastNudgedAt.Value.AddMinutes(request.CooldownMinutes);
            if (cooldownUntil > DateTimeOffset.UtcNow)
            {
                return Suppressed(
                    request,
                    NotificationSuppressReason.Cooldown,
                    "Đang trong thời gian giãn cách thông báo.",
                    cooldownUntil,
                    cooldownPassed: false);
            }
        }

        if (request.LastIgnoredAt.HasValue && request.IgnoreCooldownMinutes > 0)
        {
            var ignoredCooldownUntil = request.LastIgnoredAt.Value.AddMinutes(request.IgnoreCooldownMinutes);
            if (ignoredCooldownUntil > DateTimeOffset.UtcNow)
            {
                return Suppressed(
                    request,
                    NotificationSuppressReason.RecentlyIgnored,
                    "Bạn vừa bỏ qua nhắc nhở gần đây nên app tạm ngưng nhắc lại.",
                    ignoredCooldownUntil,
                    cooldownPassed: false);
            }
        }

        var day = await _dayCompletenessService.GetDayCompletenessAsync(
            userId,
            request.LocalDate,
            cancellationToken);

        if (day.IsComplete)
        {
            return Suppressed(
                request,
                NotificationSuppressReason.AlreadyComplete,
                "Hôm nay đã đủ dữ liệu để tính tiến độ.",
                null,
                cooldownPassed: true,
                currentDayState: day.Status);
        }

        var message = day.Status == DayCompletenessStatus.Empty
            ? "Bạn chưa ghi bữa nào hôm nay. Thêm nhanh một bữa để giữ nhịp nhé."
            : "Ngày hôm nay còn thiếu bữa chính. Thêm bữa để dữ liệu tuần chính xác hơn.";

        return new NotificationDecisionDto
        {
            ShouldNudge = true,
            Reason = NotificationSuppressReason.IncompleteDay,
            ReasonToSend = NotificationSuppressReason.IncompleteDay,
            ReasonToSuppress = null,
            SuggestedMessage = message,
            DeepLink = BuildDeepLink(request),
            QuietHours = FormatRange(request.QuietHoursStart, request.QuietHoursEnd),
            CooldownPassed = true,
            PredictedMealWindow = FormatPredictedWindow(request),
            CurrentDayState = day.Status,
        };
    }

    private static NotificationDecisionDto Suppressed(
        NotificationDecisionRequestDto request,
        string reason,
        string message,
        DateTimeOffset? suppressUntil,
        bool cooldownPassed,
        string? currentDayState = null)
    {
        return new NotificationDecisionDto
        {
            ShouldNudge = false,
            Reason = reason,
            ReasonToSuppress = reason,
            SuppressUntil = suppressUntil,
            SuggestedMessage = message,
            DeepLink = BuildDeepLink(request),
            QuietHours = FormatRange(request.QuietHoursStart, request.QuietHoursEnd),
            CooldownPassed = cooldownPassed,
            PredictedMealWindow = FormatPredictedWindow(request),
            CurrentDayState = currentDayState,
        };
    }

    private static string BuildDeepLink(NotificationDecisionRequestDto request)
    {
        var date = request.LocalDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        return request.MealTypeId.HasValue
            ? $"/diary/add?date={date}&mealTypeId={request.MealTypeId.Value}"
            : $"/diary/add?date={date}";
    }

    private static string? FormatPredictedWindow(NotificationDecisionRequestDto request)
    {
        return request.PredictedMealWindowStart.HasValue && request.PredictedMealWindowEnd.HasValue
            ? FormatRange(request.PredictedMealWindowStart.Value, request.PredictedMealWindowEnd.Value)
            : null;
    }

    private static string FormatRange(TimeOnly start, TimeOnly end)
    {
        return $"{start.ToString("HH:mm", CultureInfo.InvariantCulture)}-{end.ToString("HH:mm", CultureInfo.InvariantCulture)}";
    }

    private static bool IsQuietHours(TimeOnly now, TimeOnly start, TimeOnly end)
    {
        return start <= end
            ? now >= start && now < end
            : now >= start || now < end;
    }

    private static DateTimeOffset NextQuietHoursEnd(NotificationDecisionRequestDto request)
    {
        var date = request.LocalDate;
        if (request.QuietHoursStart > request.QuietHoursEnd
            && request.LocalTime >= request.QuietHoursStart)
        {
            date = date.AddDays(1);
        }

        return new DateTimeOffset(
            date.ToDateTime(request.QuietHoursEnd),
            TimeSpan.Zero);
    }
}
