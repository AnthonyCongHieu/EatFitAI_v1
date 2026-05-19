using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Npgsql;
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

    [Fact]
    public void IsReadOnlyPostgresTransactionException_ReturnsTrue_ForWrappedPostgresReadOnlySqlState()
    {
        var postgresException = new PostgresException(
            "cannot execute UPDATE in a read-only transaction",
            "ERROR",
            "ERROR",
            "25006");
        var exception = new DbUpdateException("wrapped", postgresException);

        Assert.True(Program.IsReadOnlyPostgresTransactionException(exception));
    }

    [Fact]
    public void IsReadOnlyPostgresTransactionException_ReturnsFalse_ForOtherExceptions()
    {
        var exception = new InvalidOperationException("not postgres");

        Assert.False(Program.IsReadOnlyPostgresTransactionException(exception));
    }
}
