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
                meal.Calories))
            .ToListAsync(cancellationToken);

        return Build(date, meals);
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
                meal.Calories
            })
            .ToListAsync(cancellationToken);

        return meals
            .GroupBy(meal => meal.EatenDate)
            .Select(group => Build(
                group.Key,
                group.Select(meal => new DayMealProjection(
                    meal.MealTypeId,
                    meal.MealTypeName,
                    meal.Calories))))
            .Where(day => day.IsComplete)
            .OrderBy(day => day.Date)
            .ToList();
    }

    public static bool IsCompleteDay(
        IEnumerable<(int MealTypeId, decimal Calories)> meals)
    {
        return Build(
            DateOnly.MinValue,
            meals.Select(meal => new DayMealProjection(meal.MealTypeId, null, meal.Calories)))
            .IsComplete;
    }

    private static DayCompletenessDto Build(
        DateOnly date,
        IEnumerable<DayMealProjection> meals)
    {
        var mealList = meals.ToList();
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

        var mealScore = Math.Min(1m, mainMealCount / (decimal)RequiredMainMealCount);
        var calorieScore = Math.Min(1m, totalCalories / MinimumCompleteDayCalories);
        var score = Math.Round((mealScore * 0.65m + calorieScore * 0.35m) * 100m, 0);
        var complete = mainMealCount >= RequiredMainMealCount
            && totalCalories >= MinimumCompleteDayCalories;

        var status = mealCount == 0
            ? DayCompletenessStatus.Empty
            : complete
                ? DayCompletenessStatus.Complete
                : DayCompletenessStatus.Partial;

        var missingMealTypes = RequiredMainMealKeys
            .Where(key => !mainMealKeys.Contains(key))
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
            RequiredMainMeals = RequiredMainMealCount,
            MinimumCalories = MinimumCompleteDayCalories,
            MissingMealTypes = missingMealTypes,
        };
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

    private sealed record DayMealProjection(int MealTypeId, string? MealTypeName, decimal Calories);
}
