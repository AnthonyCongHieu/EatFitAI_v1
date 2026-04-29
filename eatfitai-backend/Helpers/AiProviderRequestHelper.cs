using System.Net;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace EatFitAI.API.Helpers;

public static class AiProviderRequestHelper
{
    public const string InternalTokenHeader = "X-Internal-Token";

    public static void AddInternalTokenHeader(
        HttpRequestMessage request,
        IConfiguration configuration,
        ILogger logger)
    {
        var token = configuration["AIProvider:InternalToken"]?.Trim();
        if (string.IsNullOrWhiteSpace(token))
        {
            logger.LogWarning("AIProvider:InternalToken is not configured; AI provider requests may be rejected.");
            return;
        }

        request.Headers.Remove(InternalTokenHeader);
        request.Headers.TryAddWithoutValidation(InternalTokenHeader, token);
    }

    public static bool IsInternalAuthFailure(HttpStatusCode statusCode, string? responseBody)
    {
        if (statusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
        {
            return true;
        }

        return statusCode == HttpStatusCode.ServiceUnavailable
            && !string.IsNullOrWhiteSpace(responseBody)
            && responseBody.Contains("\"error\"", StringComparison.OrdinalIgnoreCase)
            && responseBody.Contains("service_unavailable", StringComparison.OrdinalIgnoreCase);
    }
}
