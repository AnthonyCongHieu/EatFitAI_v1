using EatFitAI.API.Data;
using EatFitAI.API.Models;
using EatFitAI.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public sealed class BusinessDateServiceTests : IDisposable
{
    private readonly ApplicationDbContext _db;

    public BusinessDateServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new ApplicationDbContext(options);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    [Fact]
    public async Task GetTodayAsync_UsesVietnamDefaultWhenPreferenceMissing()
    {
        var userId = Guid.NewGuid();
        await SeedUserAsync(userId);
        var service = CreateService(new DateTimeOffset(2026, 4, 25, 17, 5, 0, TimeSpan.Zero));

        var today = await service.GetTodayAsync(userId);

        Assert.Equal(new DateOnly(2026, 4, 26), today);
    }

    [Fact]
    public async Task GetTodayAsync_UsesUserTimezonePreference()
    {
        var userId = Guid.NewGuid();
        await SeedUserAsync(userId);
        await _db.UserPreferences.AddAsync(new UserPreference
        {
            UserId = userId,
            TimeZoneId = "America/New_York",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        var service = CreateService(new DateTimeOffset(2026, 4, 25, 17, 5, 0, TimeSpan.Zero));

        var today = await service.GetTodayAsync(userId);

        Assert.Equal(new DateOnly(2026, 4, 25), today);
    }

    [Fact]
    public void ValidateTimeZoneId_RejectsUnknownTimezone()
    {
        Assert.False(BusinessTimeZone.TryResolve("Not/A_Timezone", out _));
    }

    private BusinessDateService CreateService(DateTimeOffset utcNow)
    {
        return new BusinessDateService(
            _db,
            new FakeTimeProvider(utcNow),
            NullLogger<BusinessDateService>.Instance);
    }

    private async Task SeedUserAsync(Guid userId)
    {
        await _db.Users.AddAsync(new User
        {
            UserId = userId,
            Email = $"{userId:N}@example.com",
            DisplayName = "Timezone Test User",
            CreatedAt = DateTime.UtcNow,
            EmailVerified = true
        });
        await _db.SaveChangesAsync();
    }

    private sealed class FakeTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _utcNow;

        public FakeTimeProvider(DateTimeOffset utcNow)
        {
            _utcNow = utcNow;
        }

        public override DateTimeOffset GetUtcNow()
        {
            return _utcNow;
        }
    }
}
