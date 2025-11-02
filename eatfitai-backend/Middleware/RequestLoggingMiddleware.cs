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
            // Log request
            _logger.LogInformation(
                "Request: {Method} {Path} from {RemoteIpAddress}",
                context.Request.Method,
                context.Request.Path,
                context.Connection.RemoteIpAddress);

            // Log request headers (sensitive headers excluded)
            foreach (var header in context.Request.Headers)
            {
                if (!IsSensitiveHeader(header.Key))
                {
                    _logger.LogDebug("Request Header: {Key} = {Value}", header.Key, header.Value);
                }
            }

            // Capture response details
            var originalBodyStream = context.Response.Body;
            using var responseBody = new MemoryStream();
            context.Response.Body = responseBody;

            await _next(context);

            // Log response
            _logger.LogInformation(
                "Response: {StatusCode} for {Method} {Path}",
                context.Response.StatusCode,
                context.Request.Method,
                context.Request.Path);

            // Reset response body
            responseBody.Seek(0, SeekOrigin.Begin);
            await responseBody.CopyToAsync(originalBodyStream);
            context.Response.Body = originalBodyStream;
        }

        private static bool IsSensitiveHeader(string headerName)
        {
            var sensitiveHeaders = new[] { "authorization", "cookie", "x-api-key" };
            return sensitiveHeaders.Contains(headerName.ToLower());
        }
    }
}