namespace EatFitAI.API.Middleware
{
    public class RequestLoggingMiddleware
    {
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

            // Log request
            _logger.LogInformation(
                "Request {TraceId}: {Method} {Path} from {RemoteIpAddress}",
                traceId,
                context.Request.Method,
                context.Request.Path,
                context.Connection.RemoteIpAddress);

            // Capture response details
            var originalBodyStream = context.Response.Body;
            using var responseBody = new MemoryStream();
            context.Response.Body = responseBody;

            await _next(context);

            // Log response
            _logger.LogInformation(
                "Response {TraceId}: {StatusCode} for {Method} {Path}",
                traceId,
                context.Response.StatusCode,
                context.Request.Method,
                context.Request.Path);

            // Reset response body
            responseBody.Seek(0, SeekOrigin.Begin);
            await responseBody.CopyToAsync(originalBodyStream);
            context.Response.Body = originalBodyStream;
        }
    }
}
