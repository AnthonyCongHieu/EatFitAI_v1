using System.Security.Claims;
using EatFitAI.API.Data;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.Controllers;
using EatFitAI.API.Services;
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

        var reviewService = new AIReviewService(_appDb, NullLogger<AIReviewService>.Instance);
        var nutritionService = new NutritionInsightService(_db, NullLogger<NutritionInsightService>.Instance);

        _controller = new AIReviewController(
            reviewService,
            nutritionService,
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
}
