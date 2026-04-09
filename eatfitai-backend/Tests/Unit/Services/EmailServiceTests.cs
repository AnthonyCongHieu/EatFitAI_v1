using System.Net;
using System.Net.Http;
using System.Text.Json;
using EatFitAI.API.Options;
using EatFitAI.API.Services;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services
{
    public class EmailServiceTests
    {
        [Fact]
        public async Task SendVerificationCodeAsync_ValidBrevoConfig_PostsTransactionalEmail()
        {
            HttpMethod? capturedMethod = null;
            string? capturedUrl = null;
            string? capturedApiKey = null;
            string? capturedPayloadJson = null;
            var handler = new StubHttpMessageHandler(request =>
            {
                capturedMethod = request.Method;
                capturedUrl = request.RequestUri?.ToString();
                if (request.Headers.TryGetValues("api-key", out var apiKeys))
                {
                    capturedApiKey = apiKeys.SingleOrDefault();
                }

                capturedPayloadJson = request.Content?.ReadAsStringAsync().GetAwaiter().GetResult();
                return new HttpResponseMessage(HttpStatusCode.Created)
                {
                    Content = new StringContent("{\"messageId\":\"abc123\"}"),
                };
            });

            using var httpClient = new HttpClient(handler);
            var options = Microsoft.Extensions.Options.Options.Create(new BrevoOptions
            {
                BaseUrl = "https://api.brevo.com",
                ApiKey = "brevo-test-key",
                SenderEmail = "sender@eatfitai.test",
                SenderName = "EatFitAI",
            });
            var environment = new Mock<IHostEnvironment>();
            environment.SetupGet(x => x.EnvironmentName).Returns(Environments.Production);

            var service = new EmailService(httpClient, options, environment.Object);

            await service.SendVerificationCodeAsync(
                "recipient@example.com",
                "123456",
                new DateTime(2026, 4, 9, 10, 0, 0, DateTimeKind.Utc));

            Assert.Equal(HttpMethod.Post, capturedMethod);
            Assert.Equal("https://api.brevo.com/v3/smtp/email", capturedUrl);
            Assert.Equal("brevo-test-key", capturedApiKey);

            using var payload = JsonDocument.Parse(capturedPayloadJson!);
            Assert.Equal("EatFitAI - Mã xác minh email", payload.RootElement.GetProperty("subject").GetString());
            Assert.Equal("sender@eatfitai.test", payload.RootElement.GetProperty("sender").GetProperty("email").GetString());
            Assert.Equal("recipient@example.com", payload.RootElement.GetProperty("to")[0].GetProperty("email").GetString());
        }

        [Fact]
        public async Task SendVerificationCodeAsync_MissingBrevoConfigInProduction_ThrowsInvalidOperationException()
        {
            using var httpClient = new HttpClient(new StubHttpMessageHandler(_ =>
                new HttpResponseMessage(HttpStatusCode.Created)));
            var options = Microsoft.Extensions.Options.Options.Create(new BrevoOptions
            {
                ApiKey = "SET_IN_ENV_OR_SECRET_STORE",
                SenderEmail = "sender@eatfitai.test",
            });
            var environment = new Mock<IHostEnvironment>();
            environment.SetupGet(x => x.EnvironmentName).Returns(Environments.Production);

            var service = new EmailService(httpClient, options, environment.Object);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.SendVerificationCodeAsync("recipient@example.com", "123456", DateTime.UtcNow));

            Assert.Equal("Brevo email is not configured.", ex.Message);
        }

        private sealed class StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler) : HttpMessageHandler
        {
            protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            {
                return Task.FromResult(handler(request));
            }
        }
    }
}
