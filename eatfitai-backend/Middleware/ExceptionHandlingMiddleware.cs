using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Middleware
{
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;

        public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unhandled exception occurred");
                await HandleExceptionAsync(context, ex);
            }
        }

        private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            if (context.Response.HasStarted)
            {
                return;
            }

            context.Response.ContentType = "application/problem+json";
            var statusCode = (int)HttpStatusCode.InternalServerError;
            var title = "Internal Server Error";
            var detail = "An unexpected error occurred while processing your request.";

            // Trả message gốc cho business exceptions để client hiểu lý do cụ thể
            // Chỉ giữ message generic cho unhandled exceptions (500) để tránh leak thông tin
            switch (exception)
            {
                case KeyNotFoundException:
                    statusCode = (int)HttpStatusCode.NotFound;
                    title = "Not Found";
                    detail = "The requested resource was not found.";
                    break;
                case UnauthorizedAccessException:
                    statusCode = (int)HttpStatusCode.Unauthorized;
                    title = "Unauthorized";
                    detail = "You are not authorized to perform this action.";
                    break;
                case InvalidOperationException:
                case ArgumentException:
                    statusCode = (int)HttpStatusCode.BadRequest;
                    title = "Bad Request";
                    detail = "The request data is invalid.";
                    break;
            }

            context.Response.StatusCode = statusCode;

            var response = new ProblemDetails
            {
                Type = $"https://httpstatuses.com/{statusCode}",
                Title = title,
                Status = statusCode,
                Detail = detail,
                Instance = context.Request.Path,
            };
            response.Extensions["traceId"] = context.TraceIdentifier;

            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
        }
    }
}
