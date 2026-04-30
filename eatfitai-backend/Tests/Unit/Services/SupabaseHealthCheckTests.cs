using System.Net;
using EatFitAI.API.HealthChecks;
using EatFitAI.API.Options;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class SupabaseHealthCheckTests
{
    [Fact]
    public async Task CheckHealthAsync_ReturnsUnhealthy_WhenConfigurationIsMissing()
    {
        var httpClientFactory = new FakeHttpClientFactory(_ => throw new InvalidOperationException("Dependency should not be called"));
        var healthCheck = CreateHealthCheck(new SupabaseOptions(), httpClientFactory);

        var result = await healthCheck.CheckHealthAsync(new HealthCheckContext());

        Assert.Equal(HealthStatus.Unhealthy, result.Status);
        Assert.Equal(0, httpClientFactory.CallCount);
    }

    [Fact]
    public async Task CheckHealthAsync_ReturnsUnhealthy_WhenUrlIsNotHttps()
    {
        var httpClientFactory = new FakeHttpClientFactory(_ => throw new InvalidOperationException("HTTP Supabase URL should not be called"));
        var healthCheck = CreateHealthCheck(new SupabaseOptions
        {
            Url = "http://project.supabase.co",
            ServiceRoleKey = "service-role-secret",
        }, httpClientFactory);

        var result = await healthCheck.CheckHealthAsync(new HealthCheckContext());

        Assert.Equal(HealthStatus.Unhealthy, result.Status);
        Assert.Equal(0, httpClientFactory.CallCount);
    }

    [Fact]
    public async Task CheckHealthAsync_ReturnsUnhealthy_WhenServiceRoleKeyIsPlaceholder()
    {
        var httpClientFactory = new FakeHttpClientFactory(_ => throw new InvalidOperationException("Placeholder key should not be used"));
        var healthCheck = CreateHealthCheck(new SupabaseOptions
        {
            Url = "https://project.supabase.co",
            ServiceRoleKey = "SET_IN_ENV_OR_SECRET_STORE",
        }, httpClientFactory);

        var result = await healthCheck.CheckHealthAsync(new HealthCheckContext());

        Assert.Equal(HealthStatus.Unhealthy, result.Status);
        Assert.Equal(0, httpClientFactory.CallCount);
    }

    [Fact]
    public async Task CheckHealthAsync_ReturnsUnhealthy_WhenDependencyReturnsNonSuccess()
    {
        var httpClientFactory = new FakeHttpClientFactory(_ => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));
        var healthCheck = CreateHealthCheck(new SupabaseOptions
        {
            Url = "https://project.supabase.co",
            ServiceRoleKey = "service-role-secret",
        }, httpClientFactory);

        var result = await healthCheck.CheckHealthAsync(new HealthCheckContext());

        Assert.Equal(HealthStatus.Unhealthy, result.Status);
        Assert.Equal(1, httpClientFactory.CallCount);
    }

    [Fact]
    public async Task CheckHealthAsync_ReturnsHealthy_WhenDependencyReturnsSuccess()
    {
        var httpClientFactory = new FakeHttpClientFactory(_ => new HttpResponseMessage(HttpStatusCode.OK));
        var healthCheck = CreateHealthCheck(new SupabaseOptions
        {
            Url = "https://project.supabase.co",
            ServiceRoleKey = "service-role-secret",
        }, httpClientFactory);

        var result = await healthCheck.CheckHealthAsync(new HealthCheckContext());

        Assert.Equal(HealthStatus.Healthy, result.Status);
        Assert.Equal(1, httpClientFactory.CallCount);
        Assert.NotNull(httpClientFactory.LastRequest);
        Assert.Equal("https://project.supabase.co/auth/v1/health", httpClientFactory.LastRequest!.RequestUri!.ToString());
        Assert.Equal("service-role-secret", httpClientFactory.LastRequest.Headers.GetValues("apikey").Single());
    }

    private static SupabaseHealthCheck CreateHealthCheck(
        SupabaseOptions options,
        FakeHttpClientFactory httpClientFactory)
    {
        return new SupabaseHealthCheck(Microsoft.Extensions.Options.Options.Create(options), httpClientFactory);
    }

    private sealed class FakeHttpClientFactory : IHttpClientFactory
    {
        private readonly FakeHttpMessageHandler _handler;

        public FakeHttpClientFactory(Func<HttpRequestMessage, HttpResponseMessage> responseFactory)
        {
            _handler = new FakeHttpMessageHandler(responseFactory);
        }

        public int CallCount => _handler.CallCount;
        public HttpRequestMessage? LastRequest => _handler.LastRequest;

        public HttpClient CreateClient(string name)
        {
            return new HttpClient(_handler, disposeHandler: false);
        }
    }

    private sealed class FakeHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responseFactory;

        public FakeHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responseFactory)
        {
            _responseFactory = responseFactory;
        }

        public int CallCount { get; private set; }
        public HttpRequestMessage? LastRequest { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            CallCount++;
            LastRequest = request;
            return Task.FromResult(_responseFactory(request));
        }
    }
}
