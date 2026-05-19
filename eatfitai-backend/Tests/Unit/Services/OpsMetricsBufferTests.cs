using EatFitAI.API.Services;
using EatFitAI.API.Data;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class OpsMetricsBufferTests
{
    [Theory]
    [InlineData("/api/ai/recipes/suggest", "ai", "/api/ai/recipes/suggest")]
    [InlineData("/api/voice/parse", "ai", "/api/voice/parse")]
    [InlineData("/api/AIReview/weekly", "ai", "/api/AIReview/weekly")]
    [InlineData("/api/ai/nutrition/current", "ai", "/api/ai/nutrition/current")]
    [InlineData("/api/ai/recipes/42/cooking-guide", "ai", "/api/ai/recipes/:id/cooking-guide")]
    [InlineData("/api/ai/vision/suggest-mapping/pho%20ga", "ai", "/api/ai/vision/suggest-mapping/:label")]
    public void Record_ClassifiesAiFeatureRoutes(string path, string expectedSource, string expectedRouteGroup)
    {
        var buffer = new OpsMetricsBuffer();
        var context = new DefaultHttpContext();
        context.Request.Method = "POST";
        context.Request.Path = path;
        context.Response.StatusCode = StatusCodes.Status200OK;

        buffer.Record(context, durationMs: 123);

        var snapshot = Assert.Single(buffer.SnapshotAndReset());
        Assert.Equal(expectedSource, snapshot.Key.Source);
        Assert.Equal(expectedRouteGroup, snapshot.Key.RouteGroup);
        Assert.Equal(1, snapshot.RequestCount);
        Assert.Equal(0, snapshot.ErrorCount);
    }

    [Fact]
    public async Task GetTrafficOverviewAsync_FiltersTimelineByAiRouteAndKeepsRouteChoices()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"ops-route-filter-{Guid.NewGuid():N}")
            .Options;
        await using var context = new ApplicationDbContext(options);
        var bucketStart = DateTime.UtcNow.AddHours(-1);

        context.OpsMetricBuckets.AddRange(
            BuildBucket(bucketStart, "/api/ai/recipes/suggest", requestCount: 5, errorCount: 1, durationSumMs: 500),
            BuildBucket(bucketStart, "/api/ai/nutrition-targets/current", requestCount: 3, errorCount: 0, durationSumMs: 90));
        await context.SaveChangesAsync();

        var service = new AdminOpsMetricsService(context);
        var overview = await service.GetTrafficOverviewAsync(
            new AdminOpsTrafficQuery
            {
                Window = "24h",
                Granularity = "hour",
                Source = "ai",
                Route = "/api/ai/recipes/suggest",
            },
            CancellationToken.None);

        Assert.Equal("ai", overview.SourceFilter);
        Assert.Equal("/api/ai/recipes/suggest", overview.RouteFilter);
        Assert.Equal(5, overview.TotalRequests);
        Assert.Equal(1, overview.ErrorCount);
        Assert.Equal(5, Assert.Single(overview.Timeline).RequestCount);
        Assert.Contains(overview.TopRoutes, route => route.Key == "/api/ai/recipes/suggest");
        Assert.Contains(overview.TopRoutes, route => route.Key == "/api/ai/nutrition-targets/current");
    }

    private static OpsMetricBucket BuildBucket(
        DateTime bucketStart,
        string routeGroup,
        long requestCount,
        long errorCount,
        long durationSumMs)
    {
        return new OpsMetricBucket
        {
            OpsMetricBucketId = Guid.NewGuid(),
            Source = "ai",
            Method = "POST",
            RouteGroup = routeGroup,
            StatusClass = errorCount > 0 ? "5xx" : "2xx",
            BucketStart = bucketStart,
            Granularity = "hour",
            RequestCount = requestCount,
            ErrorCount = errorCount,
            DurationSumMs = durationSumMs,
            DurationMaxMs = (int)Math.Max(0, durationSumMs / Math.Max(1, requestCount)),
            LatencyHistogramJson = "[1,1,1,1,1,1]",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
    }
}
