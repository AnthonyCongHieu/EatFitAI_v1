using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public sealed class LapseRecoveryServiceTests : IDisposable
{
    private readonly EatFitAIDbContext _context;
    private readonly LapseRecoveryService _service;
    private readonly Guid _userId = Guid.NewGuid();

    public LapseRecoveryServiceTests()
    {
        var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _context = new EatFitAIDbContext(options);
        _service = new LapseRecoveryService(_context, new DayCompletenessService(_context));

        _context.Users.Add(new User
        {
            UserId = _userId,
            Email = "lapse@example.com",
            DisplayName = "Lapse User",
            PasswordHash = "test",
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            EmailVerified = true
        });
        _context.MealTypes.AddRange(
            new MealType { MealTypeId = 1, Name = "Breakfast" },
            new MealType { MealTypeId = 2, Name = "Lunch" });
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task GetRecoveryAsync_LastCompleteDayYesterday_ReturnsActiveTier()
    {
        var today = new DateOnly(2026, 5, 8);
        AddCompleteDay(today.AddDays(-1));
        await _context.SaveChangesAsync();

        var result = await _service.GetRecoveryAsync(_userId, today);

        Assert.Equal(LapseTier.Active, result.Tier);
        Assert.Equal(1, result.DaysSinceLastCompleteDay);
        Assert.Equal("keep_logging", result.Action);
    }

    [Fact]
    public async Task GetRecoveryAsync_SevenDayGap_ReturnsRecoveryTierWithQuickAddDeepLink()
    {
        var today = new DateOnly(2026, 5, 8);
        AddCompleteDay(today.AddDays(-8));
        await _context.SaveChangesAsync();

        var result = await _service.GetRecoveryAsync(_userId, today);

        Assert.Equal(LapseTier.Recovery, result.Tier);
        Assert.Equal(8, result.DaysSinceLastCompleteDay);
        Assert.Equal("quick_add_one_meal", result.Action);
        Assert.Equal("/diary/add?mode=quick", result.DeepLink);
    }

    private void AddCompleteDay(DateOnly date)
    {
        _context.MealDiaries.AddRange(
            new MealDiary
            {
                UserId = _userId,
                EatenDate = date,
                MealTypeId = 1,
                Calories = 450,
                Protein = 20,
                Carb = 40,
                Fat = 10,
                Grams = 100,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new MealDiary
            {
                UserId = _userId,
                EatenDate = date,
                MealTypeId = 2,
                Calories = 550,
                Protein = 25,
                Carb = 50,
                Fat = 12,
                Grams = 100,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
    }
}
