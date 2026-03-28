using System.Net;
using System.Net.Http.Headers;
using EatFitAI.API.Tests.Integration;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace EatFitAI.API.Tests.Integration.Controllers
{
    public class AnalyticsControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public AnalyticsControllerTests(WebApplicationFactory<Program> factory)
        {
            _factory = IntegrationTestHost.CreateFactory(
                factory,
                $"AnalyticsControllerTests_{Guid.NewGuid():N}");
        }

        [Fact]
        public async Task GetNutritionSummary_WithoutStartDate_ReturnsBadRequest()
        {
            var client = CreateAuthenticatedClient();

            var response = await client.GetAsync("/api/analytics/nutrition-summary");

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task GetNutritionSummary_EndDateBeforeStartDate_ReturnsBadRequest()
        {
            var client = CreateAuthenticatedClient();

            var response = await client.GetAsync(
                "/api/analytics/nutrition-summary?startDate=2026-03-20&endDate=2026-03-19");

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task GetNutritionSummary_ValidDateRange_ReturnsOk()
        {
            var client = CreateAuthenticatedClient();

            var response = await client.GetAsync(
                "/api/analytics/nutrition-summary?startDate=2026-03-19&endDate=2026-03-20");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        private HttpClient CreateAuthenticatedClient()
        {
            var userId = Guid.NewGuid();
            var client = _factory.CreateClient();
            var token = IntegrationTestHost.CreateJwtToken(
                _factory.Services,
                userId,
                $"analyticstest_{userId:N}@example.com",
                "Analytics Test User");

            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            return client;
        }
    }
}