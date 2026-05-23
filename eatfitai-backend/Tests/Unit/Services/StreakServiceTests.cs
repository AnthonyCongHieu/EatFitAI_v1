using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Services;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class StreakServiceTests : IDisposable
{
    private readonly EatFitAIDbContext _context;
    private readonly Mock<IBusinessDateService> _businessDateServiceMock = new();
    private readonly StreakService _service;

    public StreakServiceTests()
    {
        var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new EatFitAIDbContext(options);
        _service = new StreakService(_context, _businessDateServiceMock.Object);
    }

    [Fact]
    public async Task UpdateStreakOnMealLogAsync_StoresLastLogDateAsUtc_ForPostgresTimestampWithTimeZone()
    {
        var userId = Guid.NewGuid();
        var today = new DateOnly(2026, 5, 23);
        _businessDateServiceMock
            .Setup(service => service.GetTodayAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(today);

        _context.Users.Add(new User
        {
            UserId = userId,
            Email = "streak-kind@example.com",
            CreatedAt = DateTime.UtcNow
        });
        _context.MealDiaries.AddRange(
            CreateMeal(userId, today, 1, 450m),
            CreateMeal(userId, today, 2, 500m));
        await _context.SaveChangesAsync();

        await _service.UpdateStreakOnMealLogAsync(userId);

        var user = await _context.Users.SingleAsync(user => user.UserId == userId);
        Assert.Equal(1, user.CurrentStreak);
        Assert.Equal(DateTimeKind.Utc, user.LastLogDate?.Kind);
        Assert.Equal(today.ToDateTime(TimeOnly.MinValue), user.LastLogDate?.Date);
    }

    private static MealDiary CreateMeal(Guid userId, DateOnly date, int mealTypeId, decimal calories)
    {
        return new MealDiary
        {
            UserId = userId,
            EatenDate = date,
            MealTypeId = mealTypeId,
            Grams = 100m,
            Calories = calories,
            Protein = 10m,
            Carb = 20m,
            Fat = 5m,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
