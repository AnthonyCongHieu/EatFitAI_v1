using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public sealed class NutritionInsightServiceBranchBTests : IDisposable
{
    private readonly EatFitAIDbContext _context;
    private readonly NutritionInsightService _service;
    private readonly Guid _userId = Guid.NewGuid();

    public NutritionInsightServiceBranchBTests()
    {
        var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _context = new EatFitAIDbContext(options);
        _service = new NutritionInsightService(
            _context,
            NullLogger<NutritionInsightService>.Instance,
            new FixedBusinessDateService(DateOnly.FromDateTime(DateTime.UtcNow)));

        _context.Users.Add(new User
        {
            UserId = _userId,
            Email = "adaptive@example.com",
            DisplayName = "Adaptive User",
            PasswordHash = "test",
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            EmailVerified = true
        });

        _context.NutritionTargets.Add(new NutritionTarget
        {
            UserId = _userId,
            TargetCalories = 2000,
            TargetProtein = 120,
            TargetCarb = 220,
            TargetFat = 60,
            EffectiveFrom = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-20))
        });

        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task GetAdaptiveTargetAsync_PartialHeavyData_DoesNotLowerTarget()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        for (var i = 0; i < 14; i++)
        {
            AddMeal(today.AddDays(-i), mealTypeId: 4, calories: 250);
        }
        await _context.SaveChangesAsync();

        var result = await _service.GetAdaptiveTargetAsync(
            _userId,
            new AdaptiveTargetRequest { AnalysisDays = 14 });

        Assert.Equal(2000, result.SuggestedTarget.TargetCalories);
        Assert.True(result.ConfidenceScore < 75);
        Assert.Contains(result.AdjustmentReasons, reason => reason.Contains("14 ngày hoàn chỉnh"));
    }

    [Fact]
    public async Task GetAdaptiveTargetAsync_EdRiskFlagDisablesAdaptiveChanges()
    {
        var user = await _context.Users.SingleAsync(item => item.UserId == _userId);
        user.HasEDRisk = true;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        for (var i = 0; i < 14; i++)
        {
            AddMeal(today.AddDays(-i), mealTypeId: 1, calories: 450);
            AddMeal(today.AddDays(-i), mealTypeId: 2, calories: 550);
        }
        await _context.SaveChangesAsync();

        var result = await _service.GetAdaptiveTargetAsync(
            _userId,
            new AdaptiveTargetRequest { AnalysisDays = 14, AutoApply = true });

        Assert.False(result.Applied);
        Assert.Equal(2000, result.SuggestedTarget.TargetCalories);
        Assert.Equal(0, result.ConfidenceScore);
        Assert.Contains(result.AdjustmentReasons, reason => reason.Contains("an toàn"));
    }

    private void AddMeal(DateOnly date, int mealTypeId, decimal calories)
    {
        _context.MealDiaries.Add(new MealDiary
        {
            UserId = _userId,
            EatenDate = date,
            MealTypeId = mealTypeId,
            Calories = calories,
            Protein = 25,
            Carb = 50,
            Fat = 12,
            Grams = 100,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
    }

    private sealed class FixedBusinessDateService : IBusinessDateService
    {
        private readonly DateOnly _today;

        public FixedBusinessDateService(DateOnly today)
        {
            _today = today;
        }

        public Task<DateOnly> GetTodayAsync(Guid userId, CancellationToken cancellationToken = default)
            => Task.FromResult(_today);

        public Task<string> GetUserTimeZoneIdAsync(Guid userId, CancellationToken cancellationToken = default)
            => Task.FromResult(BusinessTimeZone.DefaultTimeZoneId);

        public DateOnly ToDateOnly(DateTime value, string? timeZoneId = null)
            => DateOnly.FromDateTime(value);

        public DateOnly ToDateOnly(DateTimeOffset instant, string? timeZoneId = null)
            => DateOnly.FromDateTime(instant.UtcDateTime);

        public (DateTime StartUtc, DateTime EndUtc) GetUtcRange(DateOnly localDate, string? timeZoneId = null)
            => (localDate.ToDateTime(TimeOnly.MinValue), localDate.AddDays(1).ToDateTime(TimeOnly.MinValue));
    }
}
