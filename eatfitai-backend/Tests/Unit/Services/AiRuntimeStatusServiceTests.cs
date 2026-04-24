using System.Net;
using System.Text;
using EatFitAI.API.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class AiRuntimeStatusServiceTests
{
    [Fact]
    public async Task GetSnapshotAsync_MapsAuthInvalidProjectCountFromProviderStatus()
    {
        using var httpResponse = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """
                {
                  "checkedAt": 1710000000,
                  "gemini_active_project": "primary",
                  "gemini_available_project_count": 2,
                  "gemini_provider_exhausted_project_count": 1,
                  "gemini_auth_invalid_project_count": 3,
                  "gemini_distinct_project_count": 6,
                  "gemini_limits": { "rpm": 60, "tpm": 100000, "rpd": 1500 },
                  "gemini_usage_entries": [
                    { "projectAlias": "primary", "projectId": "p1", "keyAlias": "k1", "model": "gemini", "state": "available", "available": true }
                  ]
                }
                """,
                Encoding.UTF8,
                "application/json")
        };

        var service = new AiRuntimeStatusService(
            new FakeHttpClientFactory(_ => httpResponse),
            new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["AIProvider:VisionBaseUrl"] = "https://provider.test",
                    ["AIProvider:InternalToken"] = "test-token",
                })
                .Build(),
            Mock.Of<ILogger<AiRuntimeStatusService>>());

        var snapshot = await service.GetSnapshotAsync();

        Assert.Equal("ai-provider", snapshot.RuntimeStatusSource);
        Assert.Equal(3, snapshot.AuthInvalidProjectCount);
        Assert.Equal(2, snapshot.AvailableProjectCount);
        Assert.Equal("primary", snapshot.ActiveProject);
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
                BaseAddress = new Uri("https://provider.test"),
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
