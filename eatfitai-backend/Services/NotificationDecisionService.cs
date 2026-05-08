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
                NotificationSuppressReason.QuietHours,
                "Đang trong giờ yên tĩnh.",
                NextQuietHoursEnd(request));
        }

        if (request.LastNudgedAt.HasValue && request.CooldownMinutes > 0)
        {
            var cooldownUntil = request.LastNudgedAt.Value.AddMinutes(request.CooldownMinutes);
            if (cooldownUntil > DateTimeOffset.UtcNow)
            {
                return Suppressed(
                    NotificationSuppressReason.Cooldown,
                    "Đang trong thời gian giãn cách thông báo.",
                    cooldownUntil);
            }
        }

        var day = await _dayCompletenessService.GetDayCompletenessAsync(
            userId,
            request.LocalDate,
            cancellationToken);

        if (day.IsComplete)
        {
            return Suppressed(
                NotificationSuppressReason.AlreadyComplete,
                "Hôm nay đã đủ dữ liệu để tính tiến độ.",
                null);
        }

        var message = day.Status == DayCompletenessStatus.Empty
            ? "Bạn chưa ghi bữa nào hôm nay. Thêm nhanh một bữa để giữ nhịp nhé."
            : "Ngày hôm nay còn thiếu bữa chính. Thêm bữa để dữ liệu tuần chính xác hơn.";

        return new NotificationDecisionDto
        {
            ShouldNudge = true,
            Reason = NotificationSuppressReason.IncompleteDay,
            SuggestedMessage = message,
            DeepLink = "/diary/add",
        };
    }

    private static NotificationDecisionDto Suppressed(
        string reason,
        string message,
        DateTimeOffset? suppressUntil)
    {
        return new NotificationDecisionDto
        {
            ShouldNudge = false,
            Reason = reason,
            SuggestedMessage = message,
            SuppressUntil = suppressUntil,
            DeepLink = "/diary/add",
        };
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
