using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using EatFitAI.API.Tests.Integration;
using EatFitAI.DTOs;
using Microsoft.AspNetCore.Mvc.Testing;
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
        return _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IHttpClientFactory>();
                services.AddSingleton<IHttpClientFactory>(
                    new FakeHttpClientFactory(responseFactory));
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

        public HttpClient CreateClient(string name)
        {
            return new HttpClient(new FakeHttpMessageHandler(_responseFactory))
            {
                BaseAddress = new Uri("https://voice-provider.test"),
            };
        }
    }

    private sealed class FakeHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responseFactory;

        public FakeHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responseFactory)
        {
            _responseFactory = responseFactory;
        }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(_responseFactory(request));
        }
    }
}
