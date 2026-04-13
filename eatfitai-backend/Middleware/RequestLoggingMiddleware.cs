namespace EatFitAI.API.Middleware
{
    public class RequestLoggingMiddleware
    {
        private static readonly PathString AdminRuntimeEventsPath = new("/api/admin/runtime/events");

        private readonly RequestDelegate _next;
        private readonly ILogger<RequestLoggingMiddleware> _logger;

        public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var traceId = context.TraceIdentifier;
            context.Response.Headers["X-Trace-Id"] = traceId;

            _logger.LogInformation(
                "Request {TraceId}: {Method} {Path} from {RemoteIpAddress}",
                traceId,
                context.Request.Method,
                context.Request.Path,
                context.Connection.RemoteIpAddress);

            // SSE responses must stream directly to the client. Wrapping them in a memory
            // buffer prevents the initial event bytes from being flushed through Render.
            if (context.Request.Path.Equals(AdminRuntimeEventsPath))
            {
                await _next(context);

                _logger.LogInformation(
                    "Response {TraceId}: {StatusCode} for {Method} {Path}",
                    traceId,
                    context.Response.StatusCode,
                    context.Request.Method,
                    context.Request.Path);
                return;
            }

            var originalBodyStream = context.Response.Body;
            await using var responseBody = new MemoryStream();
            context.Response.Body = responseBody;

            try
            {
                await _next(context);

                _logger.LogInformation(
                    "Response {TraceId}: {StatusCode} for {Method} {Path}",
                    traceId,
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
            }
        }
    }
}
