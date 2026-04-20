using System.Text;
using EatFitAI.API.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Middleware;

public class RequestLoggingMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_BypassesResponseBuffering_ForAdminRuntimeEvents()
    {
        var middleware = new RequestLoggingMiddleware(
            async context =>
            {
                await context.Response.WriteAsync("stream-open");
                await context.Response.Body.FlushAsync();
            },
            Mock.Of<ILogger<RequestLoggingMiddleware>>());

        var context = new DefaultHttpContext();
        context.TraceIdentifier = "trace-sse";
        context.Request.Path = "/api/admin/runtime/events";
        var responseBody = new MemoryStream();
        context.Response.Body = responseBody;
        var originalBody = context.Response.Body;

        await middleware.InvokeAsync(context);

        Assert.Same(originalBody, context.Response.Body);
        Assert.Equal("stream-open", Encoding.UTF8.GetString(responseBody.ToArray()));
    }

    [Fact]
    public async Task InvokeAsync_BuffersRegularResponses_BeforeCopyingBack()
    {
        var middleware = new RequestLoggingMiddleware(
            async context =>
            {
                await context.Response.WriteAsync("ok");
            },
            Mock.Of<ILogger<RequestLoggingMiddleware>>());

        var context = new DefaultHttpContext();
        context.TraceIdentifier = "trace-http";
        context.Request.Path = "/api/admin/dashboard-stats";
        var responseBody = new MemoryStream();
        context.Response.Body = responseBody;

        await middleware.InvokeAsync(context);

        Assert.Equal("ok", Encoding.UTF8.GetString(responseBody.ToArray()));
    }
}
