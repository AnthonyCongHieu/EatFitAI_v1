using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.Lapse;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public interface ILapseRecoveryService
{
    Task<LapseRecoveryDto> GetRecoveryAsync(
        Guid userId,
        DateOnly localDate,
        CancellationToken cancellationToken = default);
}

public sealed class LapseRecoveryService : ILapseRecoveryService
{
    private readonly EatFitAIDbContext _context;
    private readonly IDayCompletenessService _dayCompletenessService;

    public LapseRecoveryService(
        EatFitAIDbContext context,
        IDayCompletenessService dayCompletenessService)
    {
        _context = context;
        _dayCompletenessService = dayCompletenessService;
    }

    public async Task<LapseRecoveryDto> GetRecoveryAsync(
        Guid userId,
        DateOnly localDate,
        CancellationToken cancellationToken = default)
    {
        var userCreatedAt = await _context.Users
            .AsNoTracking()
            .Where(user => user.UserId == userId)
            .Select(user => user.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var startDate = userCreatedAt == default
            ? localDate.AddDays(-30)
            : DateOnly.FromDateTime(userCreatedAt.Date);

        var completeDays = await _dayCompletenessService.GetCompleteDaysAsync(
            userId,
            startDate,
            localDate,
            cancellationToken);

        var lastCompleteDay = completeDays.LastOrDefault()?.Date;
        int? daysSinceLastCompleteDay = lastCompleteDay.HasValue
            ? localDate.DayNumber - lastCompleteDay.Value.DayNumber
            : null;

        return Build(daysSinceLastCompleteDay);
    }

    private static LapseRecoveryDto Build(int? daysSinceLastCompleteDay)
    {
        if (!daysSinceLastCompleteDay.HasValue)
        {
            return new LapseRecoveryDto
            {
                Tier = LapseTier.Restart,
                DaysSinceLastCompleteDay = null,
                Message = "Bắt đầu lại bằng một bữa dễ ghi nhất hôm nay.",
                Action = "quick_add_one_meal",
                DeepLink = "/diary/add?mode=quick",
            };
        }

        if (daysSinceLastCompleteDay.Value <= 1)
        {
            return new LapseRecoveryDto
            {
                Tier = LapseTier.Active,
                DaysSinceLastCompleteDay = daysSinceLastCompleteDay,
                Message = "Bạn vẫn đang giữ nhịp. Tiếp tục ghi đủ hôm nay nhé.",
                Action = "keep_logging",
                DeepLink = "/diary",
            };
        }

        if (daysSinceLastCompleteDay.Value <= 3)
        {
            return new LapseRecoveryDto
            {
                Tier = LapseTier.Slipping,
                DaysSinceLastCompleteDay = daysSinceLastCompleteDay,
                Message = "Nhịp ghi đang chậm lại. Chỉ cần thêm một bữa để quay lại.",
                Action = "add_next_meal",
                DeepLink = "/diary/add",
            };
        }

        return new LapseRecoveryDto
        {
            Tier = LapseTier.Recovery,
            DaysSinceLastCompleteDay = daysSinceLastCompleteDay,
            Message = "Không cần bù cả tuần. Hãy ghi một bữa chính trước.",
            Action = "quick_add_one_meal",
            DeepLink = "/diary/add?mode=quick",
        };
    }
}
