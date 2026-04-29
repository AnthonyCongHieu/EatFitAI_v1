using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Services;
using EatFitAI.API.Tests.Integration;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
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

    [Fact]
    public async Task RecalculateNutritionTargets_WhenProviderAuthFails_Returns503WithoutFormulaFallback()
    {
        var httpClientFactory = new RecordingHttpClientFactory(
            _ => new HttpResponseMessage(HttpStatusCode.Forbidden)
            {
                Content = new StringContent(
                    """{"error":"forbidden"}""",
                    Encoding.UTF8,
                    "application/json")
            });

        using var factory = CreateFactoryWithHealthAndHttpClient(
            new AiHealthStatusDto
            {
                State = "UP",
                ProviderUrl = "https://provider.test",
                Message = "AI provider online"
            },
            httpClientFactory);
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

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal(1, httpClientFactory.CallCount);
        Assert.Equal("test-token", httpClientFactory.LastInternalToken);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ai-provider_auth_error", body.GetProperty("code").GetString());
        Assert.False(body.TryGetProperty("offlineMode", out _));
    }

    [Fact]
    public async Task RecalculateNutritionTargets_WhenProviderInternalAuthMissing_Returns503WithoutFormulaFallback()
    {
        var httpClientFactory = new RecordingHttpClientFactory(
            _ => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)
            {
                Content = new StringContent(
                    """{"error":"service_unavailable"}""",
                    Encoding.UTF8,
                    "application/json")
            });

        using var factory = CreateFactoryWithHealthAndHttpClient(
            new AiHealthStatusDto
            {
                State = "UP",
                ProviderUrl = "https://provider.test",
                Message = "AI provider online"
            },
            httpClientFactory);
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

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ai-provider_auth_error", body.GetProperty("code").GetString());
        Assert.False(body.TryGetProperty("offlineMode", out _));
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

    private WebApplicationFactory<Program> CreateFactoryWithHealthAndHttpClient(
        AiHealthStatusDto snapshot,
        RecordingHttpClientFactory httpClientFactory)
    {
        return _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["AIProvider:VisionBaseUrl"] = "https://provider.test",
                    ["AIProvider:InternalToken"] = "test-token",
                });
            });

            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IAiHealthService>();
                services.RemoveAll<IHttpClientFactory>();
                services.AddSingleton<IAiHealthService>(new FakeAiHealthService(snapshot));
                services.AddSingleton<IHttpClientFactory>(httpClientFactory);
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

    private sealed class RecordingHttpClientFactory : IHttpClientFactory
    {
        private readonly RecordingHttpMessageHandler _handler;

        public RecordingHttpClientFactory(Func<HttpRequestMessage, HttpResponseMessage> responseFactory)
        {
            _handler = new RecordingHttpMessageHandler(responseFactory);
        }

        public int CallCount => _handler.CallCount;
        public string? LastInternalToken => _handler.LastInternalToken;

        public HttpClient CreateClient(string name)
        {
            return new HttpClient(_handler, disposeHandler: false)
            {
                BaseAddress = new Uri("https://provider.test"),
            };
        }
    }

    private sealed class RecordingHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responseFactory;

        public RecordingHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responseFactory)
        {
            _responseFactory = responseFactory;
        }

        public int CallCount { get; private set; }
        public string? LastInternalToken { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            LastInternalToken = request.Headers.TryGetValues("X-Internal-Token", out var values)
                ? values.SingleOrDefault()
                : null;
            return Task.FromResult(_responseFactory(request));
        }
    }
}
