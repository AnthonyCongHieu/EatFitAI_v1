using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using EatFitAI.API.Tests.Integration;
using EatFitAI.DTOs;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace EatFitAI.API.Tests.Integration.Controllers;

public class VoiceControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public VoiceControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = IntegrationTestHost.CreateFactory(
            factory,
            $"VoiceControllerTests_{Guid.NewGuid():N}");
    }

    [Fact]
    public async Task TranscribeWithProvider_ObjectKeyBuildsScopedMediaUrl_ForProvider()
    {
        var userId = Guid.NewGuid();
        var objectKey = $"voice/{userId:N}/2026/04/30/{Guid.NewGuid():N}_audio.m4a";
        var httpClientFactory = new FakeHttpClientFactory(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """{"text":"xin chao","language":"vi","duration":0.1,"success":true}""",
                Encoding.UTF8,
                "application/json"),
        });

        using var factory = CreateFactoryWithHttpClient(httpClientFactory);
        using var client = CreateAuthorizedClient(factory, userId);

        var response = await client.PostAsJsonAsync("/api/voice/transcribe", new
        {
            ObjectKey = objectKey,
            UploadId = "upload-test"
        });

        response.EnsureSuccessStatusCode();

        Assert.Equal(1, httpClientFactory.CallCount);
        Assert.Contains(
            $"\"audio_url\":\"https://media.example.com/{objectKey}\"",
            httpClientFactory.LastRequestBody);
        Assert.Equal("test-token", httpClientFactory.LastInternalToken);
    }

    [Fact]
    public async Task TranscribeWithProvider_RejectsExternalAudioUrl_WithoutCallingProvider()
    {
        var httpClientFactory = new FakeHttpClientFactory(_ => throw new InvalidOperationException("External audio URL must not be proxied"));
        using var factory = CreateFactoryWithHttpClient(httpClientFactory);
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());

        var response = await client.PostAsJsonAsync("/api/voice/transcribe", new
        {
            AudioUrl = "https://evil.example.com/audio.m4a"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, httpClientFactory.CallCount);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("invalid_audio_reference", body.GetProperty("error").GetString());
    }

    [Fact]
    public async Task TranscribeWithProvider_RejectsObjectKeyForAnotherUser_WithoutCallingProvider()
    {
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var httpClientFactory = new FakeHttpClientFactory(_ => throw new InvalidOperationException("Cross-user object key must not be proxied"));
        using var factory = CreateFactoryWithHttpClient(httpClientFactory);
        using var client = CreateAuthorizedClient(factory, userId);

        var response = await client.PostAsJsonAsync("/api/voice/transcribe", new
        {
            ObjectKey = $"voice/{otherUserId:N}/2026/04/30/audio.m4a"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, httpClientFactory.CallCount);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("invalid_audio_reference", body.GetProperty("error").GetString());
    }

    [Fact]
    public async Task TranscribeWithProvider_LegacyAudioUrlMustResolveToScopedMediaObject()
    {
        var userId = Guid.NewGuid();
        var objectKey = $"voice/{userId:N}/2026/04/30/audio.mp3";
        var httpClientFactory = new FakeHttpClientFactory(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """{"text":"ok","language":"vi","duration":0.1,"success":true}""",
                Encoding.UTF8,
                "application/json"),
        });

        using var factory = CreateFactoryWithHttpClient(httpClientFactory);
        using var client = CreateAuthorizedClient(factory, userId);

        var response = await client.PostAsJsonAsync("/api/voice/transcribe", new
        {
            AudioUrl = $"https://media.example.com/{objectKey}"
        });

        response.EnsureSuccessStatusCode();

        Assert.Equal(1, httpClientFactory.CallCount);
        Assert.Contains(
            $"\"audio_url\":\"https://media.example.com/{objectKey}\"",
            httpClientFactory.LastRequestBody);
    }

    [Fact]
    public async Task ParseWithProvider_FallsBackToRuleParser_WhenProviderReturnsUnknown()
    {
        using var factory = CreateFactoryWithHttpClient(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """
                {
                  "intent": "UNKNOWN",
                  "confidence": 0.3,
                  "rawText": "ghi 1 banana vao bua sang"
                }
                """,
                Encoding.UTF8,
                "application/json"),
        });
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());

        var response = await client.PostAsJsonAsync("/api/voice/parse", new VoiceProcessRequest
        {
            Text = "ghi 1 banana vao bua sang",
            Language = "vi",
        });

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<ParsedVoiceCommand>();
        Assert.NotNull(body);
        Assert.Equal(VoiceIntent.ADD_FOOD, body.Intent);
        Assert.Equal("banana", body.Entities.FoodName);
        Assert.Equal("backend-rule-fallback", body.Source);
        Assert.True(body.ReviewRequired);
        Assert.Contains("parser dự phòng", body.ReviewReason, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ParseWithProvider_PreservesStructuredResult_AndMarksMutatingCommandForReview()
    {
        using var factory = CreateFactoryWithHttpClient(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """
                {
                  "intent": "ADD_FOOD",
                  "confidence": 0.96,
                  "rawText": "ghi 1 chuoi vao bua sang",
                  "source": "gemini-live",
                  "suggestedAction": "Thêm 1 chuối vào bữa sáng",
                  "entities": {
                    "foodName": "chuối",
                    "quantity": 1,
                    "mealType": "Breakfast"
                  }
                }
                """,
                Encoding.UTF8,
                "application/json"),
        });
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());

        var response = await client.PostAsJsonAsync("/api/voice/parse", new VoiceProcessRequest
        {
            Text = "ghi 1 chuoi vao bua sang",
            Language = "vi",
        });

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<ParsedVoiceCommand>();
        Assert.NotNull(body);
        Assert.Equal(VoiceIntent.ADD_FOOD, body.Intent);
        Assert.Equal("gemini-live", body.Source);
        Assert.True(body.ReviewRequired);
        Assert.Contains("Voice Beta", body.ReviewReason, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("chuối", body.Entities.FoodName);
    }

    [Fact]
    public async Task ParseWithProvider_WhenProviderAuthFails_Returns503WithoutRuleFallback()
    {
        using var factory = CreateFactoryWithHttpClient(_ => new HttpResponseMessage(HttpStatusCode.Forbidden)
        {
            Content = new StringContent(
                """{"error":"forbidden"}""",
                Encoding.UTF8,
                "application/json"),
        });
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());

        var response = await client.PostAsJsonAsync("/api/voice/parse", new VoiceProcessRequest
        {
            Text = "ghi 1 banana vao bua sang",
            Language = "vi",
        });

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("voice_provider_auth_error", body.GetProperty("code").GetString());
        Assert.False(body.TryGetProperty("source", out _));
    }

    [Fact]
    public async Task ParseWithProvider_WhenProviderInternalAuthMissing_Returns503WithoutRuleFallback()
    {
        using var factory = CreateFactoryWithHttpClient(_ => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)
        {
            Content = new StringContent(
                """{"error":"service_unavailable"}""",
                Encoding.UTF8,
                "application/json"),
        });
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());

        var response = await client.PostAsJsonAsync("/api/voice/parse", new VoiceProcessRequest
        {
            Text = "ghi 1 banana vao bua sang",
            Language = "vi",
        });

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("voice_provider_auth_error", body.GetProperty("code").GetString());
        Assert.False(body.TryGetProperty("source", out _));
    }

    [Fact]
    public async Task ParseWithProvider_WhenProviderGatewayFails_ReturnsRuleFallbackWithReview()
    {
        using var factory = CreateFactoryWithHttpClient(_ => new HttpResponseMessage(HttpStatusCode.BadGateway)
        {
            Content = new StringContent(
                """{"error":"upstream temporarily unavailable"}""",
                Encoding.UTF8,
                "application/json"),
        });
        using var client = CreateAuthorizedClient(factory, Guid.NewGuid());

        var response = await client.PostAsJsonAsync("/api/voice/parse", new VoiceProcessRequest
        {
            Text = "ghi 1 banana vao bua sang",
            Language = "vi",
        });

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<ParsedVoiceCommand>();
        Assert.NotNull(body);
        Assert.Equal(VoiceIntent.ADD_FOOD, body.Intent);
        Assert.Equal("backend-rule-fallback", body.Source);
        Assert.True(body.ReviewRequired);
        Assert.Contains("AI provider lỗi 502", body.ReviewReason, StringComparison.OrdinalIgnoreCase);
    }

    private WebApplicationFactory<Program> CreateFactoryWithHttpClient(
        Func<HttpRequestMessage, HttpResponseMessage> responseFactory)
    {
        return CreateFactoryWithHttpClient(new FakeHttpClientFactory(responseFactory));
    }

    private WebApplicationFactory<Program> CreateFactoryWithHttpClient(
        FakeHttpClientFactory httpClientFactory)
    {
        return _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["AIProvider:VisionBaseUrl"] = "https://voice-provider.test",
                    ["AIProvider:VoiceBaseUrl"] = "https://voice-provider.test",
                    ["AIProvider:InternalToken"] = "test-token",
                    ["Media:PublicBaseUrl"] = "https://media.example.com",
                });
            });

            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IHttpClientFactory>();
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
            $"voice_{userId:N}@example.com",
            "Voice User");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private sealed class FakeHttpClientFactory : IHttpClientFactory
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responseFactory;

        public FakeHttpClientFactory(Func<HttpRequestMessage, HttpResponseMessage> responseFactory)
        {
            _responseFactory = responseFactory;
        }

        public int CallCount { get; private set; }
        public string? LastInternalToken { get; private set; }
        public string? LastRequestBody { get; private set; }

        public HttpClient CreateClient(string name)
        {
            return new HttpClient(new FakeHttpMessageHandler(async request =>
            {
                CallCount++;
                LastInternalToken = request.Headers.TryGetValues("X-Internal-Token", out var values)
                    ? values.SingleOrDefault()
                    : null;
                LastRequestBody = request.Content == null
                    ? null
                    : await request.Content.ReadAsStringAsync();
                return _responseFactory(request);
            }))
            {
                BaseAddress = new Uri("https://voice-provider.test"),
            };
        }
    }

    private sealed class FakeHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, Task<HttpResponseMessage>> _responseFactory;

        public FakeHttpMessageHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> responseFactory)
        {
            _responseFactory = responseFactory;
        }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            return await _responseFactory(request);
        }
    }
}
