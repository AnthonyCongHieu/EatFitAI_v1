using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.Common;
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

    private static readonly Dictionary<int, string> MainMealNames = new()
    {
        [1] = "breakfast",
        [2] = "lunch",
        [3] = "dinner",
    };

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
                meal.Calories
            })
            .ToListAsync(cancellationToken);

        return meals
            .GroupBy(meal => meal.EatenDate)
            .Select(group => Build(
                group.Key,
                group.Select(meal => new DayMealProjection(meal.MealTypeId, meal.Calories))))
            .Where(day => day.IsComplete)
            .OrderBy(day => day.Date)
            .ToList();
    }

    public static bool IsCompleteDay(
        IEnumerable<(int MealTypeId, decimal Calories)> meals)
    {
        return Build(
            DateOnly.MinValue,
            meals.Select(meal => new DayMealProjection(meal.MealTypeId, meal.Calories)))
            .IsComplete;
    }

    private static DayCompletenessDto Build(
        DateOnly date,
        IEnumerable<DayMealProjection> meals)
    {
        var mealList = meals.ToList();
        var mealCount = mealList.Count;
        var mainMealIds = mealList
            .Where(meal => MainMealNames.ContainsKey(meal.MealTypeId))
            .Select(meal => meal.MealTypeId)
            .Distinct()
            .ToList();
        var totalCalories = mealList.Sum(meal => meal.Calories);
        var mainMealCount = mainMealIds.Count;
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

        var missingMealTypes = MainMealNames
            .Where(item => !mainMealIds.Contains(item.Key))
            .Select(item => item.Value)
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

    private sealed record DayMealProjection(int MealTypeId, decimal Calories);
}
