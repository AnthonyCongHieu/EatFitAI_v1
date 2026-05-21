using EatFitAI.API.Data;
using EatFitAI.API.DTOs.Subscription;
using EatFitAI.API.Models;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public sealed class AiUsageQuotaServiceTests : IDisposable
{
    private readonly ApplicationDbContext _db;
    private readonly FakeAiLogService _aiLog = new();
    private readonly FakeTimeProvider _timeProvider;
    private readonly BusinessDateService _businessDateService;

    public AiUsageQuotaServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new ApplicationDbContext(options);
        _timeProvider = new FakeTimeProvider(new DateTimeOffset(2026, 5, 21, 4, 0, 0, TimeSpan.Zero));
        _businessDateService = new BusinessDateService(
            _db,
            _timeProvider,
            NullLogger<BusinessDateService>.Instance);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    [Fact]
    public async Task GetStatusAsync_CountsEachFeatureSeparately_AndKeepsScanUnlimited()
    {
        var userId = Guid.NewGuid();
        var service = CreateService();
        var testTime = _timeProvider.GetUtcNow().UtcDateTime;
        await SeedLogsAsync(userId, "RecipeSuggestion", 20, testTime);
        await SeedLogsAsync(userId, "NutritionInsight", 19, testTime);
        await SeedLogsAsync(userId, "VisionDetect", 50, testTime);

        var status = await service.GetStatusAsync(userId);

        var recipe = status.Features.Single(item => item.Key == AiUsageQuotaFeatureKeys.RecipeSuggestion);
        var insight = status.Features.Single(item => item.Key == AiUsageQuotaFeatureKeys.NutritionInsight);
        var scan = status.Features.Single(item => item.Key == AiUsageQuotaFeatureKeys.VisionScan);

        Assert.True(recipe.IsLimited);
        Assert.Equal(20, recipe.Limit);
        Assert.Equal(20, recipe.Used);
        Assert.Equal(0, recipe.Remaining);
        Assert.Equal(19, insight.Used);
        Assert.Equal(1, insight.Remaining);
        Assert.False(scan.IsLimited);
        Assert.Null(scan.Limit);
        Assert.Null(scan.Remaining);

        await Assert.ThrowsAsync<AiUsageQuotaExceededException>(
            () => service.EnsureCanUseAsync(userId, AiUsageQuotaFeatureKeys.RecipeSuggestion));

        await service.EnsureCanUseAsync(userId, AiUsageQuotaFeatureKeys.NutritionInsight);
    }

    [Fact]
    public async Task EnsureCanUseAsync_IgnoresLogsBeforeCurrentBusinessDay()
    {
        var userId = Guid.NewGuid();
        var service = CreateService();
        var today = await _businessDateService.GetTodayAsync(userId);
        var range = _businessDateService.GetUtcRange(today, BusinessTimeZone.DefaultTimeZoneId);
        await SeedLogsAsync(userId, "VoiceParse", 20, range.StartUtc.AddMinutes(-1));

        await service.EnsureCanUseAsync(userId, AiUsageQuotaFeatureKeys.VoiceParse);

        var status = await service.GetStatusAsync(userId);
        var voiceParse = status.Features.Single(item => item.Key == AiUsageQuotaFeatureKeys.VoiceParse);
        Assert.Equal(0, voiceParse.Used);
        Assert.Equal(20, voiceParse.Remaining);
    }

    [Fact]
    public async Task EnsureCanUseAsync_DoesNotLimitPremiumUsers()
    {
        var userId = Guid.NewGuid();
        await SeedPremiumEntitlementAsync(userId);
        var testTime = _timeProvider.GetUtcNow().UtcDateTime;
        await SeedLogsAsync(userId, "AdaptiveTarget", 45, testTime);
        var service = CreateService();

        await service.EnsureCanUseAsync(userId, AiUsageQuotaFeatureKeys.AdaptiveTarget);

        var status = await service.GetStatusAsync(userId);
        var adaptiveTarget = status.Features.Single(item => item.Key == AiUsageQuotaFeatureKeys.AdaptiveTarget);
        Assert.False(adaptiveTarget.IsLimited);
        Assert.Null(adaptiveTarget.Limit);
        Assert.Null(adaptiveTarget.Remaining);
        Assert.Equal(45, adaptiveTarget.Used);
    }

    private AiUsageQuotaService CreateService()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AIUsage:FreeDailyLimit"] = "20",
            })
            .Build();

        return new AiUsageQuotaService(
            _db,
            new EntitlementService(_db),
            _businessDateService,
            _aiLog,
            configuration,
            NullLogger<AiUsageQuotaService>.Instance);
    }

    private async Task SeedLogsAsync(Guid userId, string action, int count, DateTime createdAt)
    {
        for (var index = 0; index < count; index++)
        {
            _db.AILogs.Add(new AILog
            {
                UserId = userId,
                Action = action,
                CreatedAt = createdAt.AddSeconds(index),
            });
        }

        await _db.SaveChangesAsync();
    }

    private async Task SeedPremiumEntitlementAsync(Guid userId)
    {
        _db.SubscriptionPlans.AddRange(
            new SubscriptionPlan
            {
                PlanCode = "free",
                DisplayName = "EatFitAI Free",
                IsPremium = false,
                IsActive = true,
            },
            new SubscriptionPlan
            {
                PlanCode = "premium",
                DisplayName = "EatFitAI Premium",
                IsPremium = true,
                IsActive = true,
            });

        _db.UserEntitlements.Add(new UserEntitlement
        {
            UserId = userId,
            PlanCode = "premium",
            Status = "active",
            StartsAt = DateTime.UtcNow.AddDays(-1),
            ExpiresAt = DateTime.UtcNow.AddDays(30),
        });

        await _db.SaveChangesAsync();
    }

    private sealed class FakeAiLogService : IAiLogService
    {
        public Task<int> LogAsync(Guid userId, string action, object? input, object? output, long durationMs)
        {
            return Task.FromResult(1);
        }
    }

    private sealed class FakeTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _utcNow;

        public FakeTimeProvider(DateTimeOffset utcNow)
        {
            _utcNow = utcNow;
        }

        public override DateTimeOffset GetUtcNow() => _utcNow;
    }
}
