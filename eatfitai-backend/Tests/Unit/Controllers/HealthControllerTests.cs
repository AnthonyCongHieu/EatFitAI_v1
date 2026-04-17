using EatFitAI.API.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Controllers;

public class HealthControllerTests
{
    [Fact]
    public async Task GetReady_ReturnsServiceUnavailable_WhenReadyChecksAreUnhealthy()
    {
        var report = new HealthReport(
            new Dictionary<string, HealthReportEntry>
            {
                ["startup-bootstrap"] = new(
                    HealthStatus.Unhealthy,
                    "Startup bootstrap failed.",
                    TimeSpan.Zero,
                    exception: null,
                    data: new Dictionary<string, object>())
            },
            TimeSpan.Zero);

        var controller = new HealthController(new FakeHealthCheckService(report));

        var result = await controller.GetReady();

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(503, objectResult.StatusCode);
        Assert.Same(report, objectResult.Value);
    }

    [Fact]
    public void GetLive_ReturnsAliveStatus()
    {
        var controller = new HealthController(new FakeHealthCheckService(
            new HealthReport(new Dictionary<string, HealthReportEntry>(), TimeSpan.Zero)));

        var result = controller.GetLive();

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Contains("alive", okResult.Value?.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    private sealed class FakeHealthCheckService : HealthCheckService
    {
        private readonly HealthReport _report;

        public FakeHealthCheckService(HealthReport report)
        {
            _report = report;
        }

        public override Task<HealthReport> CheckHealthAsync(
            Func<HealthCheckRegistration, bool>? predicate,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_report);
        }
    }
}
