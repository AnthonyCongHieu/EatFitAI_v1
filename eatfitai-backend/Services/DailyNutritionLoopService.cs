using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.Common;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public interface IDailyNutritionLoopService
{
    Task<DailyNutritionLoopDto> GetDailyLoopAsync(
        Guid userId,
        DateOnly localDate,
        CancellationToken cancellationToken = default);
}

public sealed class DailyNutritionLoopService : IDailyNutritionLoopService
{
    private readonly EatFitAIDbContext _context;
    private readonly IDayCompletenessService _dayCompletenessService;
    private readonly IMealBudgetService _mealBudgetService;

    public DailyNutritionLoopService(
        EatFitAIDbContext context,
        IDayCompletenessService dayCompletenessService,
        IMealBudgetService mealBudgetService)
    {
        _context = context;
        _dayCompletenessService = dayCompletenessService;
        _mealBudgetService = mealBudgetService;
    }

    public async Task<DailyNutritionLoopDto> GetDailyLoopAsync(
        Guid userId,
        DateOnly localDate,
        CancellationToken cancellationToken = default)
    {
        var target = await GetActiveTargetAsync(userId, localDate, cancellationToken);
        var totals = await _context.MealDiaries
            .AsNoTracking()
            .Where(item => item.UserId == userId
                && item.EatenDate == localDate
                && !item.IsDeleted)
            .GroupBy(_ => 1)
            .Select(group => new NutritionTotals(
                group.Sum(item => item.Calories),
                group.Sum(item => item.Protein),
                group.Sum(item => item.Carb),
                group.Sum(item => item.Fat)))
            .FirstOrDefaultAsync(cancellationToken)
            ?? new NutritionTotals(0, 0, 0, 0);

        var dayState = await _dayCompletenessService.GetDayCompletenessAsync(
            userId,
            localDate,
            cancellationToken);

        var budgets = await _mealBudgetService.GetMealBudgetsAsync(
            userId,
            localDate,
            cancellationToken);

        var skippedMarkers = await _context.MealDayMarkers
            .AsNoTracking()
            .Where(marker => marker.UserId == userId
                && marker.LocalDate == localDate
                && !marker.IsDeleted)
            .Select(marker => new SkippedMarker(marker.MealTypeId, marker.MarkerType))
            .ToListAsync(cancellationToken);

        var nutritionStatus = BuildNutritionStatus(totals.Calories, target.Calories);
        var recovery = BuildRecoverySuggestion(nutritionStatus, skippedMarkers);
        var oneJob = BuildOneJob(dayState, nutritionStatus, recovery);

        return new DailyNutritionLoopDto
        {
            Date = localDate,
            DayState = dayState,
            MealBudgets = budgets,
            Remaining = new RemainingNutritionDto
            {
                Calories = Math.Max(0, target.Calories - (int)Math.Round(totals.Calories)),
                Protein = Math.Max(0, target.Protein - (int)Math.Round(totals.Protein)),
                Carbs = Math.Max(0, target.Carbs - (int)Math.Round(totals.Carbs)),
                Fat = Math.Max(0, target.Fat - (int)Math.Round(totals.Fat))
            },
            NutritionStatus = nutritionStatus,
            RecoverySuggestion = recovery,
            WeeklyBalanceNote = BuildWeeklyBalanceNote(nutritionStatus),
            OneJobToday = oneJob
        };
    }

    private async Task<NutritionTargetSnapshot> GetActiveTargetAsync(
        Guid userId,
        DateOnly localDate,
        CancellationToken cancellationToken)
    {
        var target = await _context.NutritionTargets
            .AsNoTracking()
            .Where(item => item.UserId == userId
                && item.EffectiveFrom <= localDate
                && (item.EffectiveTo == null || item.EffectiveTo >= localDate))
            .OrderByDescending(item => item.EffectiveFrom)
            .ThenByDescending(item => item.NutritionTargetId)
            .Select(item => new NutritionTargetSnapshot(
                item.TargetCalories,
                item.TargetProtein,
                item.TargetCarb,
                item.TargetFat))
            .FirstOrDefaultAsync(cancellationToken);

        return target ?? new NutritionTargetSnapshot(2000, 120, 220, 60);
    }

    private static NutritionStatusDto BuildNutritionStatus(decimal totalCalories, int targetCalories)
    {
        var delta = (int)Math.Round(totalCalories - targetCalories);
        var status = delta > 150
            ? "over_target"
            : delta < -200
                ? "under_target"
                : "on_track";

        return new NutritionStatusDto
        {
            Status = status,
            DeltaCalories = delta,
            Message = status switch
            {
                "over_target" => $"Hôm nay bạn đang cao hơn mục tiêu khoảng {Math.Abs(delta)} kcal.",
                "under_target" => $"Hôm nay bạn đang thấp hơn mục tiêu khoảng {Math.Abs(delta)} kcal.",
                _ => "Hôm nay đang trong vùng mục tiêu."
            }
        };
    }

    private static RecoverySuggestionDto? BuildRecoverySuggestion(
        NutritionStatusDto nutritionStatus,
        IEnumerable<SkippedMarker> skippedMarkers)
    {
        var skippedList = skippedMarkers.ToList();
        if (skippedList.Any(marker => marker.MarkerType == MealDayMarkerType.SkippedMeal))
        {
            return new RecoverySuggestionDto
            {
                Tier = "skipped_meal_recovery",
                Action = "add_lunch_with_protein",
                Message = "Bạn đã bỏ một bữa. Đừng bù bằng một bữa quá lớn; hãy ưu tiên protein và chia phần còn lại nhẹ nhàng.",
                DeepLink = "/diary/add"
            };
        }

        if (nutritionStatus.Status == "over_target")
        {
            var over = nutritionStatus.DeltaCalories;
            if (over <= 400)
            {
                return new RecoverySuggestionDto
                {
                    Tier = "light_adjustment",
                    Action = "adjust_next_meal",
                    Message = "Bạn chỉ đang lệch nhẹ. Bữa tiếp theo chọn đơn giản hơn là đủ.",
                    DeepLink = "/diary"
                };
            }

            if (over <= 700)
            {
                return new RecoverySuggestionDto
                {
                    Tier = "same_day_recovery",
                    Action = "choose_lighter_dinner",
                    Message = "Không cần bỏ bữa tối. Hãy chọn món 400-500 kcal, ưu tiên protein và rau.",
                    DeepLink = "/diary/add"
                };
            }

            return new RecoverySuggestionDto
            {
                Tier = "weekly_balance",
                Action = "weekly_balance",
                Message = "Hôm nay lệch khá nhiều. Không cần nhịn bù; mình sẽ cân bằng nhẹ trong vài ngày tới.",
                DeepLink = "/stats"
            };
        }

        if (nutritionStatus.Status == "under_target")
        {
            var under = Math.Abs(nutritionStatus.DeltaCalories);
            return new RecoverySuggestionDto
            {
                Tier = under > 500 ? "energy_warning" : "snack_suggestion",
                Action = under > 500 ? "add_energy_snack" : "add_small_snack",
                Message = under > 500
                    ? "Bạn đang thiếu năng lượng khá nhiều. Nếu không phải chủ ý, hãy thêm một bữa nhẹ dễ ăn."
                    : "Bạn có thể thêm một snack nhỏ như sữa chua, chuối hoặc trứng.",
                DeepLink = "/diary/add?mealType=4"
            };
        }

        return null;
    }

    private static DailyLoopActionDto BuildOneJob(
        DayCompletenessDto dayState,
        NutritionStatusDto nutritionStatus,
        RecoverySuggestionDto? recovery)
    {
        if (recovery != null)
        {
            return new DailyLoopActionDto
            {
                Action = recovery.Action,
                Label = recovery.Tier == "same_day_recovery"
                    ? "Chọn bữa tối nhẹ hơn"
                    : "Quay lại nhịp hôm nay",
                DeepLink = recovery.DeepLink
            };
        }

        if (nutritionStatus.Status == "on_track" && dayState.NextAction?.Action == "keep_tracking")
        {
            return new DailyLoopActionDto
            {
                Action = "keep_tracking",
                Label = "Giữ nhịp hiện tại",
                DeepLink = "/diary"
            };
        }

        return dayState.NextAction ?? new DailyLoopActionDto
        {
            Action = "add_next_meal",
            Label = "Ghi bữa tiếp theo",
            DeepLink = "/diary/add"
        };
    }

    private static string BuildWeeklyBalanceNote(NutritionStatusDto nutritionStatus)
    {
        return nutritionStatus.Status == "over_target" && nutritionStatus.DeltaCalories > 700
            ? "Ưu tiên cân bằng theo tuần, không ép nhịn trong hôm nay."
            : "Theo dõi hôm nay trước, cuối tuần mới điều chỉnh nhẹ nếu dữ liệu đủ tin.";
    }

    private sealed record NutritionTargetSnapshot(int Calories, int Protein, int Carbs, int Fat);
    private sealed record NutritionTotals(decimal Calories, decimal Protein, decimal Carbs, decimal Fat);
    private sealed record SkippedMarker(int? MealTypeId, string MarkerType);
}
