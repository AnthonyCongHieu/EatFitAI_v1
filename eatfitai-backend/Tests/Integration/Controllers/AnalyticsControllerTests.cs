using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using System.Text;
using EatFitAI.API.DbScaffold.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace EatFitAI.API.Tests.Integration.Controllers
{
    public class AnalyticsControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private const string TestJwtKey = "test-secret-key-for-analytics-tests-12345";

        private readonly WebApplicationFactory<Program> _factory;
        private string? _authToken;

        public AnalyticsControllerTests(WebApplicationFactory<Program> factory)
        {
            Environment.SetEnvironmentVariable("Jwt__Key", TestJwtKey);
            Environment.SetEnvironmentVariable("Jwt__Issuer", "EatFitAI");
            Environment.SetEnvironmentVariable("Jwt__Audience", "EatFitAI");

            _factory = factory.WithWebHostBuilder(builder =>
            {
                builder.UseEnvironment("Staging");
                builder.ConfigureAppConfiguration((_, config) =>
                {
                    config.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["Jwt:Key"] = TestJwtKey,
                        ["Jwt:Issuer"] = "EatFitAI",
                        ["Jwt:Audience"] = "EatFitAI"
                    });
                });

                builder.ConfigureServices(services =>
                {
                    var descriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(DbContextOptions<EatFitAIDbContext>));

                    if (descriptor != null)
                    {
                        services.Remove(descriptor);
                    }

                    var inMemoryProvider = new ServiceCollection()
                        .AddEntityFrameworkInMemoryDatabase()
                        .BuildServiceProvider();

                    services.AddDbContext<EatFitAIDbContext>(options =>
                    {
                        options.UseInMemoryDatabase("AnalyticsTestDb");
                        options.UseInternalServiceProvider(inMemoryProvider);
                    });
                });
            });
        }

        private string GetAuthToken()
        {
            if (_authToken != null) return _authToken;

            using var scope = _factory.Services.CreateScope();
            var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
            var jwtKey = configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is missing for test token generation.");
            var issuer = configuration["Jwt:Issuer"] ?? "EatFitAI";
            var audience = configuration["Jwt:Audience"] ?? "EatFitAI";

            var tokenHandler = new JwtSecurityTokenHandler();
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
                    new Claim(ClaimTypes.Email, "analyticstest@example.com"),
                    new Claim(ClaimTypes.Name, "Analytics Test User")
                }),
                Issuer = issuer,
                Audience = audience,
                Expires = DateTime.UtcNow.AddHours(1),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtKey)),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            _authToken = tokenHandler.WriteToken(token);
            return _authToken;
        }

        [Fact]
        public async Task GetNutritionSummary_WithoutStartDate_ReturnsBadRequest()
        {
            var client = _factory.CreateClient();
            var token = GetAuthToken();
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync("/api/analytics/nutrition-summary");

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task GetNutritionSummary_EndDateBeforeStartDate_ReturnsBadRequest()
        {
            var client = _factory.CreateClient();
            var token = GetAuthToken();
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync("/api/analytics/nutrition-summary?startDate=2026-03-20&endDate=2026-03-19");

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task GetNutritionSummary_ValidDateRange_ReturnsOk()
        {
            var client = _factory.CreateClient();
            var token = GetAuthToken();
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync("/api/analytics/nutrition-summary?startDate=2026-03-19&endDate=2026-03-20");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}