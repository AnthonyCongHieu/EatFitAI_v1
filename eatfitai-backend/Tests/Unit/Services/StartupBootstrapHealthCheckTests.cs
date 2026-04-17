using Microsoft.Extensions.Diagnostics.HealthChecks;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class StartupBootstrapHealthCheckTests
{
    [Fact]
    public async Task CheckHealthAsync_ReturnsHealthy_WhenNoStartupFailuresWereRecorded()
    {
        var state = new StartupHealthState();
        var healthCheck = new StartupBootstrapHealthCheck(state);

        var result = await healthCheck.CheckHealthAsync(new HealthCheckContext());

        Assert.Equal(HealthStatus.Healthy, result.Status);
    }

    [Fact]
    public async Task CheckHealthAsync_ReturnsUnhealthy_WhenFailuresWereRecorded()
    {
        var state = new StartupHealthState();
        state.MarkFailed("database-seed");
        var healthCheck = new StartupBootstrapHealthCheck(state);

        var result = await healthCheck.CheckHealthAsync(new HealthCheckContext());

        Assert.Equal(HealthStatus.Unhealthy, result.Status);
        Assert.True(result.Data.ContainsKey("failedPhases"));
    }
}
