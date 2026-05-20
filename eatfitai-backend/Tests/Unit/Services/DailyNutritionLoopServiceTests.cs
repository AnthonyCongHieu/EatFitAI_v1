using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public sealed class DailyNutritionLoopServiceTests : IDisposable
{
    private readonly EatFitAIDbContext _context;
    private readonly DailyNutritionLoopService _service;
    private readonly Guid _userId = Guid.NewGuid();
    private readonly DateOnly _today = new(2026, 5, 20);

    public DailyNutritionLoopServiceTests()
    {
        var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _context = new EatFitAIDbContext(options);
        var dayCompleteness = new DayCompletenessService(_context);
        var mealBudget = new MealBudgetService(_context);
        _service = new DailyNutritionLoopService(_context, dayCompleteness, mealBudget);

        _context.Users.Add(new User
        {
            UserId = _userId,
            Email = "loop@example.com",
            DisplayName = "Loop User",
            PasswordHash = "test",
            CreatedAt = DateTime.UtcNow,
            EmailVerified = true
        });

        _context.MealTypes.AddRange(
            new MealType { MealTypeId = 1, Name = "Breakfast" },
            new MealType { MealTypeId = 2, Name = "Lunch" },
            new MealType { MealTypeId = 3, Name = "Dinner" },
            new MealType { MealTypeId = 4, Name = "Snack" });

        _context.NutritionTargets.Add(new NutritionTarget
        {
            UserId = _userId,
            TargetCalories = 2000,
            TargetProtein = 130,
            TargetCarb = 220,
            TargetFat = 60,
            EffectiveFrom = _today.AddDays(-1)
        });

        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task GetMealBudgetsAsync_SplitsDailyTargetIntoSoftMealRanges()
    {
        var budgets = await new MealBudgetService(_context).GetMealBudgetsAsync(_userId, _today);

        Assert.Collection(
            budgets,
            breakfast =>
            {
                Assert.Equal("breakfast", breakfast.MealKey);
                Assert.Equal(500, breakfast.TargetCalories);
                Assert.Equal(450, breakfast.MinCalories);
                Assert.Equal(550, breakfast.MaxCalories);
            },
            lunch => Assert.Equal(700, lunch.TargetCalories),
            dinner => Assert.Equal(600, dinner.TargetCalories),
            snack => Assert.Equal(200, snack.TargetCalories));
    }

    [Fact]
    public async Task GetDailyLoopAsync_OverTargetByModerateAmountSuggestsLightDinner()
    {
        AddMeal(_today, mealTypeId: 1, calories: 850);
        AddMeal(_today, mealTypeId: 2, calories: 1670);
        await _context.SaveChangesAsync();

        var loop = await _service.GetDailyLoopAsync(_userId, _today);

        Assert.Equal("over_target", loop.NutritionStatus.Status);
        Assert.Equal(520, loop.NutritionStatus.DeltaCalories);
        Assert.Equal("same_day_recovery", loop.RecoverySuggestion?.Tier);
        Assert.Equal("choose_lighter_dinner", loop.OneJobToday.Action);
        Assert.Contains("Không cần bỏ bữa", loop.RecoverySuggestion?.Message);
    }

    [Fact]
    public async Task GetDailyLoopAsync_SkippedBreakfastSuggestsDistributeLaterMeals()
    {
        _context.MealDayMarkers.Add(new MealDayMarker
        {
            UserId = _userId,
            LocalDate = _today,
            MealTypeId = 1,
            MarkerType = MealDayMarkerType.SkippedMeal,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var loop = await _service.GetDailyLoopAsync(_userId, _today);

        Assert.Equal("skipped_meal_recovery", loop.RecoverySuggestion?.Tier);
        Assert.Equal("add_lunch_with_protein", loop.OneJobToday.Action);
        Assert.DoesNotContain("breakfast", loop.DayState.MissingMealTypes);
    }

    private void AddMeal(DateOnly date, int mealTypeId, decimal calories)
    {
        _context.MealDiaries.Add(new MealDiary
        {
            UserId = _userId,
            EatenDate = date,
            MealTypeId = mealTypeId,
            Calories = calories,
            Protein = 30,
            Carb = 60,
            Fat = 15,
            Grams = 100,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
    }
}
