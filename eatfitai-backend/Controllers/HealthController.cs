using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace EatFitAI.API.Controllers
{
    // Render uses /health/live for liveness.
    // Admin tooling can use the /api/health/* aliases.
    [ApiController]
    public class HealthController : ControllerBase
    {
        private readonly HealthCheckService _healthCheckService;

        public HealthController(HealthCheckService healthCheckService)
        {
            _healthCheckService = healthCheckService;
        }

        [HttpGet("health")]
        [HttpGet("api/health")]
        public async Task<IActionResult> Get()
        {
            var report = await _healthCheckService.CheckHealthAsync();
            return report.Status == HealthStatus.Healthy ? Ok(report) : StatusCode(503, report);
        }

        // Liveness must stay fast and must not depend on DB readiness.
        [HttpGet("health/live")]
        [HttpGet("api/health/live")]
        public IActionResult GetLive()
        {
            return Ok(new { status = "alive", timestamp = DateTime.UtcNow });
        }

        // Readiness checks startup/bootstrap state and ready-tagged dependencies.
        [HttpGet("health/ready")]
        [HttpGet("api/health/ready")]
        public async Task<IActionResult> GetReady()
        {
            var report = await _healthCheckService.CheckHealthAsync(check => check.Tags.Contains("ready"));
            return report.Status == HealthStatus.Healthy ? Ok(report) : StatusCode(503, report);
        }
    }
}
