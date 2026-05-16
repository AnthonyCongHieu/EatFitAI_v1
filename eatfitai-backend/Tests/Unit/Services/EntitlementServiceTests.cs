using EatFitAI.API.Data;
using EatFitAI.API.Models;
using EatFitAI.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public sealed class EntitlementServiceTests : IDisposable
{
    private readonly ApplicationDbContext _db;

    public EntitlementServiceTests()
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
    public async Task GetSubscriptionStatusAsync_ReturnsFallbackFreePlan_WhenNoPlanRowsExist()
    {
        var service = new EntitlementService(_db);

        var status = await service.GetSubscriptionStatusAsync(Guid.NewGuid());

        Assert.Equal("free", status.PlanCode);
        Assert.Equal("active", status.Status);
        Assert.False(status.IsPremium);
        Assert.True(status.Features["mochiCoach"]);
        Assert.Equal(10, status.Limits["aiScansPerDay"]);
    }

    [Fact]
    public async Task GetSubscriptionStatusAsync_ReturnsPremiumEntitlement_WhenActiveManualPremiumExists()
    {
        var userId = Guid.NewGuid();
        await SeedUserAsync(userId);
        await SeedPlansAsync();
        await _db.UserEntitlements.AddAsync(new UserEntitlement
        {
            UserId = userId,
            PlanCode = "premium",
            Status = "active",
            Source = "manual",
            StartsAt = DateTime.UtcNow.AddMinutes(-5),
            ExpiresAt = DateTime.UtcNow.AddDays(30),
        });
        await _db.SaveChangesAsync();
        var service = new EntitlementService(_db);

        var status = await service.GetSubscriptionStatusAsync(userId);

        Assert.Equal("premium", status.PlanCode);
        Assert.True(status.IsPremium);
        Assert.True(status.Features["advancedInsights"]);
        Assert.Equal(100, status.Limits["aiScansPerDay"]);
        Assert.NotNull(status.ExpiresAt);
    }

    [Fact]
    public async Task GetSubscriptionStatusAsync_IgnoresExpiredPremiumEntitlement()
    {
        var userId = Guid.NewGuid();
        await SeedUserAsync(userId);
        await SeedPlansAsync();
        await _db.UserEntitlements.AddAsync(new UserEntitlement
        {
            UserId = userId,
            PlanCode = "premium",
            Status = "active",
            Source = "manual",
            StartsAt = DateTime.UtcNow.AddDays(-10),
            ExpiresAt = DateTime.UtcNow.AddMinutes(-1),
        });
        await _db.SaveChangesAsync();
        var service = new EntitlementService(_db);

        var status = await service.GetSubscriptionStatusAsync(userId);

        Assert.Equal("free", status.PlanCode);
        Assert.False(status.IsPremium);
        Assert.Null(status.ExpiresAt);
    }

    private async Task SeedPlansAsync()
    {
        await _db.SubscriptionPlans.AddRangeAsync(
            new SubscriptionPlan
            {
                PlanCode = "free",
                DisplayName = "EatFitAI Free",
                IsPremium = false,
                FeaturesJson = """{"basicLogging":true,"aiScan":true,"mochiCoach":true}""",
                LimitsJson = """{"aiScansPerDay":10,"recipeSuggestionsPerDay":3}""",
                IsActive = true,
            },
            new SubscriptionPlan
            {
                PlanCode = "premium",
                DisplayName = "EatFitAI Premium",
                IsPremium = true,
                FeaturesJson = """{"basicLogging":true,"aiScan":true,"mochiCoach":true,"advancedInsights":true,"priorityAi":true}""",
                LimitsJson = """{"aiScansPerDay":100,"recipeSuggestionsPerDay":30}""",
                IsActive = true,
                SortOrder = 10,
            });
        await _db.SaveChangesAsync();
    }

    private async Task SeedUserAsync(Guid userId)
    {
        await _db.Users.AddAsync(new User
        {
            UserId = userId,
            Email = $"{userId:N}@example.com",
            DisplayName = "Entitlement Test User",
            CreatedAt = DateTime.UtcNow,
            EmailVerified = true,
        });
        await _db.SaveChangesAsync();
    }
}
