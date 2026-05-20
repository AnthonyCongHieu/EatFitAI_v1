using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.Notifications;
using EatFitAI.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public sealed class NotificationDecisionServiceTests : IDisposable
{
    private readonly EatFitAIDbContext _context;
    private readonly NotificationDecisionService _service;
    private readonly Guid _userId = Guid.NewGuid();

    public NotificationDecisionServiceTests()
    {
        var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _context = new EatFitAIDbContext(options);
        var completenessService = new DayCompletenessService(_context);
        _service = new NotificationDecisionService(_context, completenessService);

        _context.Users.Add(new User
        {
            UserId = _userId,
            Email = "nudge@example.com",
            DisplayName = "Nudge User",
            PasswordHash = "test",
            CreatedAt = DateTime.UtcNow,
            EmailVerified = true
        });
        _context.MealTypes.AddRange(
            new MealType { MealTypeId = 1, Name = "Breakfast" },
            new MealType { MealTypeId = 2, Name = "Lunch" },
            new MealType { MealTypeId = 3, Name = "Dinner" });
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task ShouldNudgeAsync_QuietHours_Suppresses()
    {
        var result = await _service.ShouldNudgeAsync(_userId, new NotificationDecisionRequestDto
        {
            LocalDate = new DateOnly(2026, 5, 8),
            LocalTime = new TimeOnly(22, 30),
            QuietHoursStart = new TimeOnly(21, 30),
            QuietHoursEnd = new TimeOnly(7, 0),
            NudgeType = "meal"
        });

        Assert.False(result.ShouldNudge);
        Assert.Equal(NotificationSuppressReason.QuietHours, result.Reason);
        Assert.Equal(NotificationSuppressReason.QuietHours, result.ReasonToSuppress);
        Assert.Equal("21:30-07:00", result.QuietHours);
        Assert.NotNull(result.SuppressUntil);
    }

    [Fact]
    public async Task ShouldNudgeAsync_CompleteDay_SuppressesAlreadyComplete()
    {
        AddMeal(new DateOnly(2026, 5, 8), 1, 450);
        AddMeal(new DateOnly(2026, 5, 8), 2, 550);
        await _context.SaveChangesAsync();

        var result = await _service.ShouldNudgeAsync(_userId, new NotificationDecisionRequestDto
        {
            LocalDate = new DateOnly(2026, 5, 8),
            LocalTime = new TimeOnly(18, 0),
            NudgeType = "meal"
        });

        Assert.False(result.ShouldNudge);
        Assert.Equal(NotificationSuppressReason.AlreadyComplete, result.Reason);
        Assert.Equal(NotificationSuppressReason.AlreadyComplete, result.ReasonToSuppress);
        Assert.Equal("complete", result.CurrentDayState);
    }

    [Fact]
    public async Task ShouldNudgeAsync_IncompleteDayOutsideQuietHours_ReturnsActionableDeepLink()
    {
        AddMeal(new DateOnly(2026, 5, 8), 1, 300);
        await _context.SaveChangesAsync();

        var result = await _service.ShouldNudgeAsync(_userId, new NotificationDecisionRequestDto
        {
            LocalDate = new DateOnly(2026, 5, 8),
            LocalTime = new TimeOnly(18, 0),
            NudgeType = "meal",
            MealTypeId = 3,
            PredictedMealWindowStart = new TimeOnly(17, 30),
            PredictedMealWindowEnd = new TimeOnly(20, 0)
        });

        Assert.True(result.ShouldNudge);
        Assert.Equal(NotificationSuppressReason.IncompleteDay, result.Reason);
        Assert.Equal(NotificationSuppressReason.IncompleteDay, result.ReasonToSend);
        Assert.Null(result.ReasonToSuppress);
        Assert.True(result.CooldownPassed);
        Assert.Equal("partial", result.CurrentDayState);
        Assert.Equal("17:30-20:00", result.PredictedMealWindow);
        Assert.Equal("21:30-07:00", result.QuietHours);
        Assert.Equal("/diary/add?date=2026-05-08&mealTypeId=3", result.DeepLink);
        Assert.Contains("bữa", result.SuggestedMessage);
    }

    [Fact]
    public async Task ShouldNudgeAsync_RecentlyIgnored_SuppressesWithReason()
    {
        var result = await _service.ShouldNudgeAsync(_userId, new NotificationDecisionRequestDto
        {
            LocalDate = new DateOnly(2026, 5, 8),
            LocalTime = new TimeOnly(12, 30),
            NudgeType = "meal",
            LastIgnoredAt = DateTimeOffset.UtcNow.AddMinutes(-20),
            IgnoreCooldownMinutes = 60
        });

        Assert.False(result.ShouldNudge);
        Assert.Equal(NotificationSuppressReason.RecentlyIgnored, result.Reason);
        Assert.Equal(NotificationSuppressReason.RecentlyIgnored, result.ReasonToSuppress);
        Assert.False(result.CooldownPassed);
    }

    private void AddMeal(DateOnly date, int mealTypeId, decimal calories)
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
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        });
    }
}
