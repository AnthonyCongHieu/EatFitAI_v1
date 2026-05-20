using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.Common;
using EatFitAI.API.Data;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public interface IDayCompletenessService
{
    Task<DayCompletenessDto> GetDayCompletenessAsync(
        Guid userId,
        DateOnly date,
        CancellationToken cancellationToken = default);

    Task<List<DayCompletenessDto>> GetCompleteDaysAsync(
        Guid userId,
        DateOnly startDate,
        DateOnly endDate,
        CancellationToken cancellationToken = default);
}

public sealed class DayCompletenessService : IDayCompletenessService
{
    public const int RequiredMainMealCount = 2;
    public const decimal MinimumCompleteDayCalories = 800m;

    private static readonly string[] RequiredMainMealKeys = ["breakfast", "lunch", "dinner"];

    private readonly EatFitAIDbContext _context;

    public DayCompletenessService(EatFitAIDbContext context)
    {
        _context = context;
    }

    public async Task<DayCompletenessDto> GetDayCompletenessAsync(
        Guid userId,
        DateOnly date,
        CancellationToken cancellationToken = default)
    {
        var meals = await _context.MealDiaries
            .AsNoTracking()
            .Where(meal => meal.UserId == userId
                && meal.EatenDate == date
                && !meal.IsDeleted)
            .Select(meal => new DayMealProjection(
                meal.MealTypeId,
                meal.MealType != null ? meal.MealType.Name : null,
                meal.Calories,
                meal.IsRoughLog || meal.InputMethod == "rough" || meal.SourceMethod == "rough",
                meal.ConfidenceScore))
            .ToListAsync(cancellationToken);

        var markers = await _context.MealDayMarkers
            .AsNoTracking()
            .Where(marker => marker.UserId == userId
                && marker.LocalDate == date
                && !marker.IsDeleted)
            .Select(marker => new DayMarkerProjection(
                marker.MealTypeId,
                marker.MealType != null ? marker.MealType.Name : null,
                marker.MarkerType))
            .ToListAsync(cancellationToken);

        return Build(date, meals, markers);
    }

    public async Task<List<DayCompletenessDto>> GetCompleteDaysAsync(
        Guid userId,
        DateOnly startDate,
        DateOnly endDate,
        CancellationToken cancellationToken = default)
    {
        if (endDate < startDate)
        {
            return new List<DayCompletenessDto>();
        }

        var meals = await _context.MealDiaries
            .AsNoTracking()
            .Where(meal => meal.UserId == userId
                && meal.EatenDate >= startDate
                && meal.EatenDate <= endDate
                && !meal.IsDeleted)
            .Select(meal => new
            {
                meal.EatenDate,
                meal.MealTypeId,
                MealTypeName = meal.MealType != null ? meal.MealType.Name : null,
                meal.Calories,
                meal.IsRoughLog,
                meal.InputMethod,
                meal.SourceMethod,
                meal.ConfidenceScore
            })
            .ToListAsync(cancellationToken);

        var markers = await _context.MealDayMarkers
            .AsNoTracking()
            .Where(marker => marker.UserId == userId
                && marker.LocalDate >= startDate
                && marker.LocalDate <= endDate
                && !marker.IsDeleted)
            .Select(marker => new
            {
                marker.LocalDate,
                marker.MealTypeId,
                MealTypeName = marker.MealType != null ? marker.MealType.Name : null,
                marker.MarkerType
            })
            .ToListAsync(cancellationToken);

        var markerLookup = markers
            .GroupBy(marker => marker.LocalDate)
            .ToDictionary(
                group => group.Key,
                group => group.Select(marker => new DayMarkerProjection(
                    marker.MealTypeId,
                    marker.MealTypeName,
                    marker.MarkerType)).ToList());

        return meals
            .GroupBy(meal => meal.EatenDate)
            .Select(group => Build(
                group.Key,
                group.Select(meal => new DayMealProjection(
                    meal.MealTypeId,
                    meal.MealTypeName,
                    meal.Calories,
                    meal.IsRoughLog || meal.InputMethod == "rough" || meal.SourceMethod == "rough",
                    meal.ConfidenceScore)),
                markerLookup.TryGetValue(group.Key, out var dayMarkers)
                    ? dayMarkers
                    : Enumerable.Empty<DayMarkerProjection>()))
            .Where(day => day.IsComplete)
            .OrderBy(day => day.Date)
            .ToList();
    }

    public static bool IsCompleteDay(
        IEnumerable<(int MealTypeId, decimal Calories)> meals)
    {
        return Build(
            DateOnly.MinValue,
            meals.Select(meal => new DayMealProjection(
                meal.MealTypeId,
                null,
                meal.Calories,
                false,
                null)),
            Enumerable.Empty<DayMarkerProjection>())
            .IsComplete;
    }

    private static DayCompletenessDto Build(
        DateOnly date,
        IEnumerable<DayMealProjection> meals,
        IEnumerable<DayMarkerProjection> markers)
    {
        var mealList = meals.ToList();
        var markerList = markers.ToList();
        var skippedDay = markerList.Any(marker =>
            string.Equals(marker.MarkerType, MealDayMarkerType.SkippedDay, StringComparison.OrdinalIgnoreCase));
        var skippedMealKeys = markerList
            .Where(marker => string.Equals(marker.MarkerType, MealDayMarkerType.SkippedMeal, StringComparison.OrdinalIgnoreCase))
            .Select(GetMainMealKey)
            .Where(key => key != null)
            .Select(key => key!)
            .Distinct()
            .ToList();
        var mealCount = mealList.Count;
        var mainMealKeys = mealList
            .Select(GetMainMealKey)
            .Where(key => key != null)
            .Select(key => key!)
            .Distinct()
            .ToList();
        var totalCalories = mealList.Sum(meal => meal.Calories);
        var mainMealCount = mainMealKeys.Count;
        var snackOnly = mealCount > 0 && mainMealCount == 0;
        var hasRoughLog = mealList.Any(meal => meal.IsRoughLog);
        var explicitConfidenceScores = mealList
            .Where(meal => meal.ConfidenceScore.HasValue)
            .Select(meal => meal.ConfidenceScore!.Value)
            .ToList();
        var hasLowConfidence = explicitConfidenceScores.Any(score => score < 0.60m);
        var confidenceScore = explicitConfidenceScores.Count == 0
            ? (hasRoughLog ? 50m : 100m)
            : Math.Round(explicitConfidenceScores.Min() * 100m, 0);

        var mealScore = Math.Min(1m, mainMealCount / (decimal)RequiredMainMealCount);
        var calorieScore = Math.Min(1m, totalCalories / MinimumCompleteDayCalories);
        var score = Math.Round((mealScore * 0.65m + calorieScore * 0.35m) * 100m, 0);
        var complete = !skippedDay
            && !hasRoughLog
            && !hasLowConfidence
            && mainMealCount + skippedMealKeys.Count >= RequiredMainMealCount
            && totalCalories >= MinimumCompleteDayCalories;

        var status = skippedDay || (mealCount == 0 && skippedMealKeys.Count > 0)
            ? DayCompletenessStatus.Skipped
            : mealCount == 0
                ? DayCompletenessStatus.Empty
                : hasLowConfidence
                    ? DayCompletenessStatus.LowConfidence
                    : hasRoughLog
                        ? DayCompletenessStatus.Rough
                        : complete
                            ? DayCompletenessStatus.Complete
                            : DayCompletenessStatus.Partial;

        var missingMealTypes = RequiredMainMealKeys
            .Where(key => !mainMealKeys.Contains(key) && !skippedMealKeys.Contains(key))
            .ToList();

        return new DayCompletenessDto
        {
            Date = date,
            Status = status,
            IsComplete = complete,
            Score = score,
            MealCount = mealCount,
            MainMealCount = mainMealCount,
            SnackOnly = snackOnly,
            TotalCalories = totalCalories,
            ConfidenceScore = confidenceScore,
            NutritionStatus = GetNutritionStatus(status),
            NextAction = GetNextAction(status, missingMealTypes),
            RequiredMainMeals = RequiredMainMealCount,
            MinimumCalories = MinimumCompleteDayCalories,
            MissingMealTypes = missingMealTypes,
            MealStates = BuildMealStates(mealList, skippedMealKeys)
        };
    }

    private static string GetNutritionStatus(string status)
    {
        return status switch
        {
            DayCompletenessStatus.Complete => "enough_data",
            DayCompletenessStatus.Rough => "rough_log",
            DayCompletenessStatus.LowConfidence => "low_confidence",
            DayCompletenessStatus.Skipped => "skipped",
            DayCompletenessStatus.Empty => "no_log",
            _ => "partial_data"
        };
    }

    private static DailyLoopActionDto GetNextAction(string status, IReadOnlyCollection<string> missingMealTypes)
    {
        return status switch
        {
            DayCompletenessStatus.Complete => new DailyLoopActionDto
            {
                Action = "keep_tracking",
                Label = "Tiếp tục giữ nhịp hôm nay",
                DeepLink = "/diary"
            },
            DayCompletenessStatus.Rough => new DailyLoopActionDto
            {
                Action = "confirm_rough_log",
                Label = "Xác nhận lại bữa ước tính",
                DeepLink = "/diary"
            },
            DayCompletenessStatus.LowConfidence => new DailyLoopActionDto
            {
                Action = "review_uncertain_meal",
                Label = "Kiểm tra món chưa chắc",
                DeepLink = "/diary"
            },
            DayCompletenessStatus.Skipped => new DailyLoopActionDto
            {
                Action = "log_next_meal",
                Label = "Ghi bữa tiếp theo nhẹ nhàng",
                DeepLink = "/diary/add?mode=quick"
            },
            DayCompletenessStatus.Empty => new DailyLoopActionDto
            {
                Action = "add_first_meal",
                Label = "Ghi nhanh một bữa hôm nay",
                DeepLink = "/diary/add?mode=quick"
            },
            _ => new DailyLoopActionDto
            {
                Action = "add_missing_meal",
                Label = missingMealTypes.Count > 0
                    ? "Thêm bữa còn thiếu"
                    : "Hoàn thiện nhật ký hôm nay",
                DeepLink = "/diary/add"
            }
        };
    }

    private static List<DayMealStateDto> BuildMealStates(
        IReadOnlyCollection<DayMealProjection> meals,
        IReadOnlyCollection<string> skippedMealKeys)
    {
        return RequiredMainMealKeys
            .Select(key =>
            {
                var mealRows = meals
                    .Where(meal => GetMainMealKey(meal) == key)
                    .ToList();
                var isSkipped = skippedMealKeys.Contains(key);
                var calories = mealRows.Sum(meal => meal.Calories);
                var isRough = mealRows.Any(meal => meal.IsRoughLog);
                var minConfidence = mealRows
                    .Where(meal => meal.ConfidenceScore.HasValue)
                    .Select(meal => meal.ConfidenceScore!.Value)
                    .DefaultIfEmpty()
                    .Min();

                return new DayMealStateDto
                {
                    MealKey = key,
                    MealTypeId = mealRows.FirstOrDefault()?.MealTypeId,
                    Status = isSkipped
                        ? DayCompletenessStatus.Skipped
                        : mealRows.Count > 0
                            ? "logged"
                            : "missing",
                    Calories = calories,
                    IsSkipped = isSkipped,
                    IsRough = isRough,
                    ConfidenceScore = minConfidence == default ? null : Math.Round(minConfidence * 100m, 0)
                };
            })
            .ToList();
    }

    private static string? GetMainMealKey(DayMealProjection meal)
    {
        if (CanonicalMasterData.TryGetMainMealKey(meal.MealTypeName, out var key))
        {
            return key;
        }

        if (CanonicalMasterData.TryGetMealTypeName(meal.MealTypeId, out var canonicalName)
            && CanonicalMasterData.TryGetMainMealKey(canonicalName, out key))
        {
            return key;
        }

        return null;
    }

    private static string? GetMainMealKey(DayMarkerProjection marker)
    {
        if (marker.MealTypeId.HasValue
            && CanonicalMasterData.TryGetMealTypeName(marker.MealTypeId.Value, out var canonicalName)
            && CanonicalMasterData.TryGetMainMealKey(canonicalName, out var key))
        {
            return key;
        }

        if (CanonicalMasterData.TryGetMainMealKey(marker.MealTypeName, out var nameKey))
        {
            return nameKey;
        }

        return null;
    }

    private sealed record DayMealProjection(
        int MealTypeId,
        string? MealTypeName,
        decimal Calories,
        bool IsRoughLog,
        decimal? ConfidenceScore);

    private sealed record DayMarkerProjection(int? MealTypeId, string? MealTypeName, string MarkerType);
}
