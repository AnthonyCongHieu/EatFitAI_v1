using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public sealed class DayCompletenessServiceTests : IDisposable
{
    private readonly EatFitAIDbContext _context;
    private readonly DayCompletenessService _service;
    private readonly Guid _userId = Guid.NewGuid();

    public DayCompletenessServiceTests()
    {
        var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _context = new EatFitAIDbContext(options);
        _service = new DayCompletenessService(_context);

        _context.Users.Add(new User
        {
            UserId = _userId,
            Email = "complete-day@example.com",
            DisplayName = "Complete Day",
            PasswordHash = "test",
            CreatedAt = DateTime.UtcNow,
            EmailVerified = true
        });

        _context.MealTypes.AddRange(
            new MealType { MealTypeId = 1, Name = "Breakfast" },
            new MealType { MealTypeId = 2, Name = "Lunch" },
            new MealType { MealTypeId = 3, Name = "Dinner" },
            new MealType { MealTypeId = 4, Name = "Snack" });

        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task GetDayCompletenessAsync_TwoMainMealsAndEnoughEnergy_ReturnsComplete()
    {
        var date = new DateOnly(2026, 5, 8);
        AddMeal(date, mealTypeId: 1, calories: 450);
        AddMeal(date, mealTypeId: 2, calories: 550);
        await _context.SaveChangesAsync();

        var result = await _service.GetDayCompletenessAsync(_userId, date);

        Assert.True(result.IsComplete);
        Assert.Equal(DayCompletenessStatus.Complete, result.Status);
        Assert.Equal(2, result.MainMealCount);
        Assert.Equal(1000, result.TotalCalories);
    }

    [Fact]
    public async Task GetDayCompletenessAsync_OneTinySnack_ReturnsPartialAndNeverCountsComplete()
    {
        var date = new DateOnly(2026, 5, 8);
        AddMeal(date, mealTypeId: 4, calories: 120);
        await _context.SaveChangesAsync();

        var result = await _service.GetDayCompletenessAsync(_userId, date);

        Assert.False(result.IsComplete);
        Assert.Equal(DayCompletenessStatus.Partial, result.Status);
        Assert.True(result.SnackOnly);
        Assert.Contains("breakfast", result.MissingMealTypes);
        Assert.Contains("lunch", result.MissingMealTypes);
    }

    [Fact]
    public async Task GetCompleteDaysAsync_ExcludesPartialDaysFromRollups()
    {
        AddMeal(new DateOnly(2026, 5, 6), mealTypeId: 1, calories: 450);
        AddMeal(new DateOnly(2026, 5, 6), mealTypeId: 2, calories: 550);
        AddMeal(new DateOnly(2026, 5, 7), mealTypeId: 4, calories: 120);
        await _context.SaveChangesAsync();

        var completeDays = await _service.GetCompleteDaysAsync(
            _userId,
            new DateOnly(2026, 5, 1),
            new DateOnly(2026, 5, 8));

        var day = Assert.Single(completeDays);
        Assert.Equal(new DateOnly(2026, 5, 6), day.Date);
    }

    [Fact]
    public async Task GetDayCompletenessAsync_RoughLogOverridesOtherwiseCompleteDay()
    {
        var date = new DateOnly(2026, 5, 10);
        AddMeal(date, mealTypeId: 1, calories: 450, isRoughLog: true);
        AddMeal(date, mealTypeId: 2, calories: 550);
        await _context.SaveChangesAsync();

        var result = await _service.GetDayCompletenessAsync(_userId, date);

        Assert.False(result.IsComplete);
        Assert.Equal(DayCompletenessStatus.Rough, result.Status);
        Assert.Equal("rough_log", result.NutritionStatus);
    }

    [Fact]
    public async Task GetDayCompletenessAsync_LowConfidenceOverridesOtherwiseCompleteDay()
    {
        var date = new DateOnly(2026, 5, 11);
        AddMeal(date, mealTypeId: 1, calories: 450, confidenceScore: 0.42m);
        AddMeal(date, mealTypeId: 2, calories: 550);
        await _context.SaveChangesAsync();

        var result = await _service.GetDayCompletenessAsync(_userId, date);

        Assert.False(result.IsComplete);
        Assert.Equal(DayCompletenessStatus.LowConfidence, result.Status);
        Assert.True(result.ConfidenceScore < 60);
        Assert.Equal("review_uncertain_meal", result.NextAction?.Action);
    }

    [Fact]
    public async Task GetDayCompletenessAsync_SkippedDayMarkerReturnsSkippedWithoutFakeCalories()
    {
        var date = new DateOnly(2026, 5, 12);
        _context.MealDayMarkers.Add(new MealDayMarker
        {
            UserId = _userId,
            LocalDate = date,
            MarkerType = MealDayMarkerType.SkippedDay,
            Reason = "busy",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var result = await _service.GetDayCompletenessAsync(_userId, date);

        Assert.False(result.IsComplete);
        Assert.Equal(DayCompletenessStatus.Skipped, result.Status);
        Assert.Equal(0, result.TotalCalories);
        Assert.Equal("log_next_meal", result.NextAction?.Action);
    }

    [Fact]
    public async Task GetDayCompletenessAsync_DriftedMealTypeIds_UsesMealTypeNames()
    {
        var date = new DateOnly(2026, 5, 9);
        _context.MealTypes.AddRange(
            new MealType { MealTypeId = 20, Name = "Breakfast" },
            new MealType { MealTypeId = 21, Name = "Lunch" });
        AddMeal(date, mealTypeId: 20, calories: 450);
        AddMeal(date, mealTypeId: 21, calories: 550);
        await _context.SaveChangesAsync();

        var result = await _service.GetDayCompletenessAsync(_userId, date);

        Assert.True(result.IsComplete);
        Assert.Equal(2, result.MainMealCount);
    }

    private void AddMeal(
        DateOnly date,
        int mealTypeId,
        decimal calories,
        bool isRoughLog = false,
        decimal? confidenceScore = null)
    {
        _context.MealDiaries.Add(new MealDiary
        {
            UserId = _userId,
            EatenDate = date,
            MealTypeId = mealTypeId,
            Grams = 100,
            Calories = calories,
            Protein = 20,
            Carb = 40,
            Fat = 10,
            IsRoughLog = isRoughLog,
            ConfidenceScore = confidenceScore,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        });
    }
}
