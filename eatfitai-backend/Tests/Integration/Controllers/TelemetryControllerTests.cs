using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using EatFitAI.API.DTOs.Telemetry;
using EatFitAI.API.Tests.Integration;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace EatFitAI.API.Tests.Integration.Controllers
{
    public class TelemetryControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public TelemetryControllerTests(WebApplicationFactory<Program> factory)
        {
            _factory = IntegrationTestHost.CreateFactory(
                factory,
                $"TelemetryControllerTests_{Guid.NewGuid():N}");
        }

        [Fact]
        public async Task PostEvents_WithoutAuth_ReturnsUnauthorized()
        {
            var client = _factory.CreateClient();

            var response = await client.PostAsJsonAsync("/api/telemetry/events", CreateBatchRequest());

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task PostEvents_WithAuth_ReturnsAcceptedCount()
        {
            var client = _factory.CreateClient();
            var userId = Guid.NewGuid();
            var token = IntegrationTestHost.CreateJwtToken(
                _factory.Services,
                userId,
                $"telemetry_{userId:N}@example.com",
                "Telemetry Test User");
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var response = await client.PostAsJsonAsync("/api/telemetry/events", CreateBatchRequest());

            response.EnsureSuccessStatusCode();
            var payload = await response.Content.ReadFromJsonAsync<TelemetryAcceptedResponse>();
            Assert.NotNull(payload);
            Assert.Equal(1, payload.AcceptedCount);
        }

        private static TelemetryBatchRequestDto CreateBatchRequest()
        {
            return new TelemetryBatchRequestDto
            {
                Events = new List<TelemetryEventRequestDto>
                {
                    new()
                    {
                        Name = "screen_view",
                        Category = "product",
                        Screen = "StatsScreen",
                        Flow = "retention",
                        Step = "weekly_review",
                        Status = "opened",
                        SessionId = "session-telemetry-test",
                    }
                }
            };
        }

        private sealed class TelemetryAcceptedResponse
        {
            public int AcceptedCount { get; set; }
        }
    }
}
