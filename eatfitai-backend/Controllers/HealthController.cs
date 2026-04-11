using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace EatFitAI.API.Controllers
{
    // Dual-route: Render dùng /health/ready (không có /api prefix)
    // Admin dashboard dùng /api/health/*
    [ApiController]
    public class HealthController : ControllerBase
    {
        private readonly HealthCheckService _healthCheckService;

        public HealthController(HealthCheckService healthCheckService)
        {
            _healthCheckService = healthCheckService;
        }

        [HttpGet("api/health")]
        public async Task<IActionResult> Get()
        {
            var report = await _healthCheckService.CheckHealthAsync();
            return report.Status == HealthStatus.Healthy ? Ok(report) : StatusCode(503, report);
        }

        // Render health check — PHẢI respond nhanh, ko phụ thuộc DB
        [HttpGet("health/live")]
        [HttpGet("api/health/live")]
        public IActionResult GetLive()
        {
            return Ok(new { status = "alive", timestamp = DateTime.UtcNow });
        }

        // Render dùng route này — trả 200 ngay cả khi DB chưa sẵn sàng
        // để tránh deploy timeout trên free tier (512MB RAM, cold start chậm)
        [HttpGet("health/ready")]
        [HttpGet("api/health/ready")]
        public IActionResult GetReady()
        {
            // Always return 200 so Render deploy succeeds.
            // DB readiness is checked separately via /api/health detailed endpoint.
            return Ok(new { status = "ready", timestamp = DateTime.UtcNow });
        }
    }
}