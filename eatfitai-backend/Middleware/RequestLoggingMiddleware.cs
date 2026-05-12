using System.Diagnostics;
using EatFitAI.API.Services;

namespace EatFitAI.API.Middleware
{
    public class RequestLoggingMiddleware
    {
        private static readonly PathString AdminRuntimeEventsPath = new("/api/admin/runtime/events");
        private const string RequestIdHeader = "X-Request-Id";
        private const string CorrelationIdHeader = "X-Correlation-Id";

        private readonly RequestDelegate _next;
        private readonly ILogger<RequestLoggingMiddleware> _logger;
        private readonly IOpsMetricsRecorder _opsMetricsRecorder;

        public RequestLoggingMiddleware(
            RequestDelegate next,
            ILogger<RequestLoggingMiddleware> logger,
            IOpsMetricsRecorder opsMetricsRecorder)
        {
            _next = next;
            _logger = logger;
            _opsMetricsRecorder = opsMetricsRecorder;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var stopwatch = Stopwatch.StartNew();
            var requestId = context.Request.Headers[RequestIdHeader].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(requestId))
            {
                requestId = context.TraceIdentifier;
            }

            var correlationId = context.Request.Headers[CorrelationIdHeader].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(correlationId))
            {
                correlationId = requestId;
            }

            context.TraceIdentifier = requestId;
            context.Response.Headers[RequestIdHeader] = requestId;
            context.Response.Headers[CorrelationIdHeader] = correlationId;
            context.Response.Headers["X-Trace-Id"] = requestId;

            _logger.LogInformation(
                "Request {RequestId} {Method} {Path} from {RemoteIpAddress} auth={AuthPresent}",
                requestId,
                context.Request.Method,
                context.Request.Path,
                context.Connection.RemoteIpAddress,
                context.Request.Headers.ContainsKey("Authorization") ? "redacted" : "none");

            // SSE responses must stream directly to the client. Wrapping them in a memory
            // buffer prevents the initial event bytes from being flushed through Render.
            if (context.Request.Path.Equals(AdminRuntimeEventsPath))
            {
                try
                {
                    await _next(context);

                    _logger.LogInformation(
                        "Response {RequestId}: {StatusCode} for {Method} {Path}",
                        requestId,
                        context.Response.StatusCode,
                        context.Request.Method,
                        context.Request.Path);
                }
                finally
                {
                    stopwatch.Stop();
                    _opsMetricsRecorder.Record(context, stopwatch.ElapsedMilliseconds);
                }

                return;
            }

            var originalBodyStream = context.Response.Body;
            await using var responseBody = new MemoryStream();
            context.Response.Body = responseBody;

            try
            {
                await _next(context);

                _logger.LogInformation(
                    "Response {RequestId}: {StatusCode} for {Method} {Path}",
                    requestId,
                    context.Response.StatusCode,
                    context.Request.Method,
                    context.Request.Path);

                responseBody.Seek(0, SeekOrigin.Begin);
                context.Response.Body = originalBodyStream;
                await responseBody.CopyToAsync(originalBodyStream);
            }
            finally
            {
                context.Response.Body = originalBodyStream;
                stopwatch.Stop();
                _opsMetricsRecorder.Record(context, stopwatch.ElapsedMilliseconds);
            }
        }
    }
}
