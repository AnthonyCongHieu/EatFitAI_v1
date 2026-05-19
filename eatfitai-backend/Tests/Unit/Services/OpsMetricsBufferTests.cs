using EatFitAI.API.Services;
using Microsoft.AspNetCore.Http;
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
}
