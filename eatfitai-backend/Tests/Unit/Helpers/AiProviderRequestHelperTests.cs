using System.Net;
using EatFitAI.API.Helpers;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Helpers;

public class AiProviderRequestHelperTests
{
    [Theory]
    [InlineData(HttpStatusCode.Unauthorized, "{}", true)]
    [InlineData(HttpStatusCode.Forbidden, """{"error":"forbidden"}""", true)]
    [InlineData(HttpStatusCode.ServiceUnavailable, """{"error":"service_unavailable"}""", true)]
    [InlineData(HttpStatusCode.ServiceUnavailable, """{"error":"model_loading"}""", false)]
    [InlineData(HttpStatusCode.InternalServerError, """{"error":"service_unavailable"}""", false)]
    public void IsInternalAuthFailure_ClassifiesProviderAuthResponses(
        HttpStatusCode statusCode,
        string responseBody,
        bool expected)
    {
        Assert.Equal(expected, AiProviderRequestHelper.IsInternalAuthFailure(statusCode, responseBody));
    }
}
