using System.Security.Claims;
using EatFitAI.API.Data;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.Controllers;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Controllers;

public class AIReviewControllerTests : IDisposable
{
    private readonly EatFitAIDbContext _db;
    private readonly ApplicationDbContext _appDb;
    private readonly AIReviewController _controller;

    public AIReviewControllerTests()
    {
        var dbOptions = new DbContextOptionsBuilder<EatFitAIDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new EatFitAIDbContext(dbOptions);

        var appDbOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _appDb = new ApplicationDbContext(appDbOptions);

        var businessDateService = new BusinessDateService(
            _appDb,
            TimeProvider.System,
            NullLogger<BusinessDateService>.Instance);
        var reviewService = new AIReviewService(
            _appDb,
            NullLogger<AIReviewService>.Instance,
            businessDateService);
        var nutritionService = new NutritionInsightService(
            _db,
            NullLogger<NutritionInsightService>.Instance,
            businessDateService);

        _controller = new AIReviewController(
            reviewService,
            nutritionService,
            new AllowAllAiUsageQuotaService(),
            _db,
            NullLogger<AIReviewController>.Instance);
    }

    public void Dispose()
    {
        _db.Dispose();
        _appDb.Dispose();
    }

    [Fact]
    public async Task ApplySuggestions_PersistsTargetUsingNutritionService()
    {
        var userId = Guid.NewGuid();
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, userId.ToString())
                    },
                    authenticationType: "test"))
            }
        };

        var result = await _controller.ApplySuggestions(
            new ApplySuggestionsRequest
            {
                NewTargetCalories = 2200,
                NewMacros = new Dictionary<string, int>
                {
                    ["protein"] = 150,
                    ["carbs"] = 210,
                    ["fat"] = 65
                }
            },
            CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        var target = await _db.NutritionTargets.SingleAsync();
        Assert.Equal(userId, target.UserId);
        Assert.Equal(2200, target.TargetCalories);
        Assert.Equal(150, target.TargetProtein);
        Assert.Equal(210, target.TargetCarb);
        Assert.Equal(65, target.TargetFat);
    }

    private sealed class AllowAllAiUsageQuotaService : IAiUsageQuotaService
    {
        public Task<AiUsageQuotaStatusDto> GetStatusAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new AiUsageQuotaStatusDto());
        }

        public Task<AiUsageQuotaFeatureDto> EnsureCanUseAsync(
            Guid userId,
            string featureKey,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new AiUsageQuotaFeatureDto
            {
                Key = featureKey,
                IsLimited = false,
            });
        }

        public Task RecordUsageAsync(
            Guid userId,
            string featureKey,
            object? input,
            object? output,
            long durationMs = 0,
            CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }
    }
}
