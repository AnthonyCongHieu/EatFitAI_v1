using Microsoft.AspNetCore.Http;

namespace EatFitAI.API.Helpers;

public static class ErrorResponseHelper
{
    public static object SafeError(string userMessage, HttpContext context)
    {
        return new
        {
            message = userMessage,
            requestId = context.TraceIdentifier
        };
    }

    public static object SafeError(string code, string userMessage, HttpContext context)
    {
        return new
        {
            code,
            message = userMessage,
            requestId = context.TraceIdentifier
        };
    }
}
