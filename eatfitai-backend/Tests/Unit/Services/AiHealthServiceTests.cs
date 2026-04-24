using System.Net;
using System.Text;
using EatFitAI.API.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class AiHealthServiceTests
{
    [Fact]
    public async Task RefreshAsync_TransitionsHealthyThenDegradedThenDown()
    {
        var handler = new QueueMessageHandler();
        handler.Enqueue(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""
                {"status":"ok","model_loaded":true,"gemini_configured":true}
                """)
        });
        handler.Enqueue(new HttpRequestException("temporary failure"));
        handler.Enqueue(new HttpRequestException("still down"));

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AIProvider:VisionBaseUrl"] = "https://example-ai.onrender.com"
            })
            .Build();

        var service = new AiHealthService(
            new StubHttpClientFactory(handler),
            configuration,
            NullLogger<AiHealthService>.Instance);

        await service.RefreshAsync();
        var healthy = service.GetStatus();
        Assert.Equal("HEALTHY", healthy.State);
        Assert.True(healthy.ModelLoaded);
        Assert.True(healthy.GeminiConfigured);
        Assert.Equal(0, healthy.ConsecutiveFailures);

        await service.RefreshAsync();
        var degraded = service.GetStatus();
        Assert.Equal("DEGRADED", degraded.State);
        Assert.Equal(1, degraded.ConsecutiveFailures);

        await service.RefreshAsync();
        var down = service.GetStatus();
        Assert.Equal("DOWN", down.State);
        Assert.Equal(2, down.ConsecutiveFailures);
    }

    [Fact]
    public async Task RefreshAsync_UsesLongerDefaultTimeout_WhenTimeoutIsNotConfigured()
    {
        var handler = new DelayedSuccessHandler(TimeSpan.FromSeconds(6));
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AIProvider:VisionBaseUrl"] = "https://example-ai.onrender.com"
            })
            .Build();

        var service = new AiHealthService(
            new StubHttpClientFactory(handler),
            configuration,
            NullLogger<AiHealthService>.Instance);

        await service.RefreshAsync();

        var status = service.GetStatus();
        Assert.Equal("HEALTHY", status.State);
        Assert.Equal(0, status.ConsecutiveFailures);
        Assert.Equal("AI provider healthy.", status.Message);
    }

    [Fact]
    public async Task RefreshAsync_HttpFailureMessage_IncludesProbeUrl()
    {
        var handler = new QueueMessageHandler();
        handler.Enqueue(new HttpResponseMessage(HttpStatusCode.NotFound)
        {
            Content = new StringContent("missing", Encoding.UTF8, "text/plain")
        });

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AIProvider:VisionBaseUrl"] = "https://example-ai.onrender.com"
            })
            .Build();

        var service = new AiHealthService(
            new StubHttpClientFactory(handler),
            configuration,
            NullLogger<AiHealthService>.Instance);

        await service.RefreshAsync();

        var status = service.GetStatus();
        Assert.Equal("DEGRADED", status.State);
        Assert.Contains("https://example-ai.onrender.com/healthz", status.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task RefreshAsync_TreatsLazyVisionModelAsHealthy()
    {
        var handler = new QueueMessageHandler();
        handler.Enqueue(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""
                {"status":"ok","model_loaded":false,"model_file":"not-loaded","model_load_error":null,"gemini_configured":true}
                """)
        });

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AIProvider:VisionBaseUrl"] = "https://example-ai.onrender.com"
            })
            .Build();

        var service = new AiHealthService(
            new StubHttpClientFactory(handler),
            configuration,
            NullLogger<AiHealthService>.Instance);

        await service.RefreshAsync();

        var status = service.GetStatus();
        Assert.Equal("HEALTHY", status.State);
        Assert.False(status.ModelLoaded);
        Assert.True(status.GeminiConfigured);
        Assert.Contains("lazy-load", status.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task RefreshAsync_DegradesWhenLazyModelLoadErrorIsReported()
    {
        var handler = new QueueMessageHandler();
        handler.Enqueue(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""
                {"status":"ok","model_loaded":false,"model_file":"not-loaded","model_load_error":"weights missing","gemini_configured":true}
                """)
        });

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AIProvider:VisionBaseUrl"] = "https://example-ai.onrender.com"
            })
            .Build();

        var service = new AiHealthService(
            new StubHttpClientFactory(handler),
            configuration,
            NullLogger<AiHealthService>.Instance);

        await service.RefreshAsync();

        var status = service.GetStatus();
        Assert.Equal("DEGRADED", status.State);
        Assert.False(status.ModelLoaded);
        Assert.True(status.GeminiConfigured);
        Assert.Contains("weights missing", status.Message, StringComparison.Ordinal);
    }

    private sealed class StubHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpMessageHandler _handler;

        public StubHttpClientFactory(HttpMessageHandler handler)
        {
            _handler = handler;
        }

        public HttpClient CreateClient(string name) => new(_handler, disposeHandler: false);
    }

    private sealed class QueueMessageHandler : HttpMessageHandler
    {
        private readonly Queue<object> _responses = new();

        public void Enqueue(HttpResponseMessage response) => _responses.Enqueue(response);

        public void Enqueue(Exception exception) => _responses.Enqueue(exception);

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var next = _responses.Dequeue();
            return next switch
            {
                HttpResponseMessage response => Task.FromResult(response),
                Exception ex => Task.FromException<HttpResponseMessage>(ex),
                _ => throw new InvalidOperationException("Unexpected queued message handler item.")
            };
        }
    }

    private sealed class DelayedSuccessHandler : HttpMessageHandler
    {
        private readonly TimeSpan _delay;

        public DelayedSuccessHandler(TimeSpan delay)
        {
            _delay = delay;
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            await Task.Delay(_delay, cancellationToken);

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    """
                    {"status":"ok","model_loaded":true,"gemini_configured":true}
                    """,
                    Encoding.UTF8,
                    "application/json")
            };
        }
    }
}
