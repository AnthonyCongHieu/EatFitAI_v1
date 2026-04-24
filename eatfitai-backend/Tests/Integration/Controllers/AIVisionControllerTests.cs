using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using EatFitAI.API.Tests.Integration;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace EatFitAI.API.Tests.Integration.Controllers;

public class AIVisionControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public AIVisionControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = IntegrationTestHost.CreateFactory(
            factory,
            $"AIVisionControllerTests_{Guid.NewGuid():N}");
    }

    [Fact]
    public async Task DetectVision_FreshDown_Returns503WithoutCallingProvider()
    {
        var httpClientFactory = new RecordingHttpClientFactory(
            (_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)));
        var cacheService = new FakeVisionCacheService();

        using var factory = CreateFactory(
            new AiHealthStatusDto
            {
                State = "DOWN",
                LastCheckedAt = DateTimeOffset.UtcNow,
                Message = "provider down"
            },
            httpClientFactory,
            cacheService);
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());
        using var response = await client.PostAsync("/api/ai/vision/detect", CreateImageContent());

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal(0, httpClientFactory.CallCount);
        Assert.Equal(1, cacheService.LookupCount);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ai_provider_down", body.GetProperty("error").GetString());
    }

    [Fact]
    public async Task DetectVision_StaleDown_CallsProviderAndReturns200()
    {
        var httpClientFactory = new RecordingHttpClientFactory(
            (_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    """
                    {"detections":[{"label":"banana","confidence":0.91}]}
                    """,
                    Encoding.UTF8,
                    "application/json")
            }));

        using var factory = CreateFactory(
            new AiHealthStatusDto
            {
                State = "DOWN",
                LastCheckedAt = DateTimeOffset.UtcNow.AddMinutes(-5),
                Message = "stale down"
            },
            httpClientFactory,
            new FakeVisionCacheService());
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());
        using var response = await client.PostAsync("/api/ai/vision/detect", CreateImageContent());

        response.EnsureSuccessStatusCode();
        Assert.Equal(1, httpClientFactory.CallCount);
        Assert.Equal("test-token", httpClientFactory.LastInternalToken);

        var body = await response.Content.ReadFromJsonAsync<VisionDetectResultDto>();
        Assert.NotNull(body);
        var item = Assert.Single(body.Items);
        Assert.Equal("banana", item.Label);
        Assert.True(item.IsMatched);
    }

    [Fact]
    public async Task DetectVision_CacheHit_Returns200EvenWhenHealthIsFreshDown()
    {
        var httpClientFactory = new RecordingHttpClientFactory(
            (_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)));
        var cacheService = new FakeVisionCacheService(new VisionDetectResultDto
        {
            Items =
            [
                new MappedFoodDto
                {
                    Label = "cached-banana",
                    Confidence = 0.99f,
                    FoodItemId = 42,
                    FoodName = "Cached Banana"
                }
            ]
        });

        using var factory = CreateFactory(
            new AiHealthStatusDto
            {
                State = "DOWN",
                LastCheckedAt = DateTimeOffset.UtcNow,
                Message = "fresh down"
            },
            httpClientFactory,
            cacheService);
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());
        using var response = await client.PostAsync("/api/ai/vision/detect", CreateImageContent());

        response.EnsureSuccessStatusCode();
        Assert.Equal(0, httpClientFactory.CallCount);
        Assert.Equal(1, cacheService.LookupCount);

        var body = await response.Content.ReadFromJsonAsync<VisionDetectResultDto>();
        Assert.NotNull(body);
        var item = Assert.Single(body.Items);
        Assert.Equal("cached-banana", item.Label);
        Assert.True(item.IsMatched);
    }

    [Fact]
    public async Task DetectVision_ProviderConnectionFailureAfterBypass_Returns503()
    {
        var httpClientFactory = new RecordingHttpClientFactory(
            (_, _) => Task.FromException<HttpResponseMessage>(new HttpRequestException("connection failed")));

        using var factory = CreateFactory(
            new AiHealthStatusDto
            {
                State = "DOWN",
                LastCheckedAt = DateTimeOffset.UtcNow.AddMinutes(-5),
                Message = "stale down"
            },
            httpClientFactory,
            new FakeVisionCacheService());
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());
        using var response = await client.PostAsync("/api/ai/vision/detect", CreateImageContent());

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal(1, httpClientFactory.CallCount);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ai-provider_error", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task DetectVision_ProviderTimeoutAfterBypass_Returns504()
    {
        var httpClientFactory = new RecordingHttpClientFactory(
            (_, _) => Task.FromException<HttpResponseMessage>(new TaskCanceledException("timed out")));

        using var factory = CreateFactory(
            new AiHealthStatusDto
            {
                State = "DOWN",
                LastCheckedAt = DateTimeOffset.UtcNow.AddMinutes(-5),
                Message = "stale down"
            },
            httpClientFactory,
            new FakeVisionCacheService());
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());
        using var response = await client.PostAsync("/api/ai/vision/detect", CreateImageContent());

        Assert.Equal(HttpStatusCode.GatewayTimeout, response.StatusCode);
        Assert.Equal(1, httpClientFactory.CallCount);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ai-provider_timeout", body.GetProperty("code").GetString());
    }

    private WebApplicationFactory<Program> CreateFactory(
        AiHealthStatusDto snapshot,
        RecordingHttpClientFactory httpClientFactory,
        FakeVisionCacheService cacheService)
    {
        return _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["AIProvider:VisionBaseUrl"] = "https://provider.test",
                    ["AIProvider:InternalToken"] = "test-token",
                    ["AIProvider:HealthGateFreshnessSeconds"] = "60",
                });
            });

            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IAiHealthService>();
                services.RemoveAll<IAiFoodMapService>();
                services.RemoveAll<IVisionCacheService>();
                services.RemoveAll<IAiLogService>();
                services.RemoveAll<IHttpClientFactory>();

                services.AddSingleton<IAiHealthService>(new FakeAiHealthService(snapshot));
                services.AddSingleton<IAiFoodMapService>(new FakeAiFoodMapService());
                services.AddSingleton<IVisionCacheService>(cacheService);
                services.AddSingleton<IAiLogService>(new FakeAiLogService());
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
            $"vision_{userId:N}@example.com",
            "Vision User");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private static MultipartFormDataContent CreateImageContent()
    {
        var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes("fake-image-bytes"));
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        content.Add(fileContent, "file", "scan.jpg");
        return content;
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

    private sealed class FakeAiFoodMapService : IAiFoodMapService
    {
        public Task<List<MappedFoodDto>> MapDetectionsAsync(IEnumerable<VisionDetectionDto> detections, CancellationToken cancellationToken = default)
        {
            var mapped = detections
                .Select((detection, index) => new MappedFoodDto
                {
                    Label = detection.Label,
                    Confidence = detection.Confidence,
                    FoodItemId = index + 1,
                    FoodName = $"{detection.Label}-mapped"
                })
                .ToList();

            return Task.FromResult(mapped);
        }

        public Task TeachLabelAsync(TeachLabelRequestDto request, CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }
    }

    private sealed class FakeVisionCacheService : IVisionCacheService
    {
        private readonly VisionDetectResultDto? _cachedResult;

        public FakeVisionCacheService(VisionDetectResultDto? cachedResult = null)
        {
            _cachedResult = cachedResult;
        }

        public int LookupCount { get; private set; }

        public Task<VisionDetectResultDto?> GetCachedDetectionAsync(string imageHash, CancellationToken cancellationToken = default)
        {
            LookupCount++;
            return Task.FromResult(_cachedResult);
        }

        public Task CacheDetectionAsync(string imageHash, VisionDetectResultDto result, Guid userId, CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }

        public Task<List<DetectionHistoryDto>> GetDetectionHistoryAsync(Guid userId, DetectionHistoryRequest request, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new List<DetectionHistoryDto>());
        }

        public Task<Dictionary<string, int>> GetUnmappedLabelsStatsAsync(Guid userId, int days = 30, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new Dictionary<string, int>());
        }

        public Task<List<FoodItemSuggestionDto>> SuggestFoodItemsForLabelAsync(string label, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new List<FoodItemSuggestionDto>());
        }
    }

    private sealed class FakeAiLogService : IAiLogService
    {
        public Task<int> LogAsync(Guid userId, string action, object? input, object? output, long durationMs)
        {
            return Task.FromResult(0);
        }
    }

    private sealed class RecordingHttpClientFactory : IHttpClientFactory
    {
        private readonly RecordingHttpMessageHandler _handler;

        public RecordingHttpClientFactory(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> responseFactory)
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
        private readonly Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> _responseFactory;

        public RecordingHttpMessageHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> responseFactory)
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
            return _responseFactory(request, cancellationToken);
        }
    }
}
