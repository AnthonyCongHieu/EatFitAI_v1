using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Services;
using EatFitAI.API.Tests.Integration;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace EatFitAI.API.Tests.Integration.Controllers;

public class AIHealthControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public AIHealthControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = IntegrationTestHost.CreateFactory(
            factory,
            $"AIHealthControllerTests_{Guid.NewGuid():N}");
    }

    [Fact]
    public async Task GetAiStatus_ReturnsCurrentSnapshot()
    {
        var snapshot = new AiHealthStatusDto
        {
            State = "DOWN",
            ProviderUrl = "https://example-ai.onrender.com",
            ConsecutiveFailures = 2,
            Message = "AI provider hiện đang DOWN."
        };

        using var factory = CreateFactoryWithHealth(snapshot);
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());

        var response = await client.GetAsync("/api/ai/status");
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<AiHealthStatusDto>();
        Assert.NotNull(body);
        Assert.Equal("DOWN", body.State);
        Assert.Equal(2, body.ConsecutiveFailures);
        Assert.Equal("https://example-ai.onrender.com", body.ProviderUrl);
    }

    [Fact]
    public async Task RecalculateNutritionTargets_WhenAiDown_ReturnsFormulaFallback()
    {
        var snapshot = new AiHealthStatusDto
        {
            State = "DOWN",
            ProviderUrl = "https://example-ai.onrender.com",
            Message = "AI provider hiện đang DOWN."
        };

        using var factory = CreateFactoryWithHealth(snapshot);
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());

        var response = await client.PostAsJsonAsync("/api/ai/nutrition/recalculate", new RecalculateTargetRequest
        {
            Sex = "male",
            Age = 28,
            HeightCm = 172,
            WeightKg = 70,
            ActivityLevel = 1.55,
            Goal = "maintain"
        });

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("offlineMode").GetBoolean());
        Assert.Equal("formula", body.GetProperty("source").GetString());
        Assert.Contains("DOWN", body.GetProperty("message").GetString(), StringComparison.OrdinalIgnoreCase);
    }

    private WebApplicationFactory<Program> CreateFactoryWithHealth(AiHealthStatusDto snapshot)
    {
        return _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IAiHealthService>();
                services.AddSingleton<IAiHealthService>(new FakeAiHealthService(snapshot));
            });
        });
    }

    private static HttpClient CreateAuthorizedClient(WebApplicationFactory<Program> factory, Guid userId)
    {
        var client = factory.CreateClient();
        var token = IntegrationTestHost.CreateJwtToken(
            factory.Services,
            userId,
            $"aihealth_{userId:N}@example.com",
            "AI Health User");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private sealed class FakeAiHealthService : IAiHealthService
    {
        private readonly AiHealthStatusDto _snapshot;

        public FakeAiHealthService(AiHealthStatusDto snapshot)
        {
            _snapshot = snapshot;
        }

        public AiHealthStatusDto GetStatus() => _snapshot;

        public Task RefreshAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
}
