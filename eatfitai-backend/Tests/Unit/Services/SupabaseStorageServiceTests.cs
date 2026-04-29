using System.Net;
using EatFitAI.API.Options;
using EatFitAI.API.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services
{
    public class SupabaseStorageServiceTests
    {
        [Fact]
        public async Task UploadObjectAsync_SendsCacheControlAndReturnsPublicUrl()
        {
            HttpRequestMessage? capturedRequest = null;
            var handler = new CapturingHandler(request =>
            {
                capturedRequest = request;
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("{}")
                };
            });
            var client = new HttpClient(handler);
            var factory = new Mock<IHttpClientFactory>();
            factory.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(client);
            var service = new SupabaseStorageService(
                factory.Object,
                Microsoft.Extensions.Options.Options.Create(new SupabaseOptions
                {
                    Url = "https://example.supabase.co",
                    ServiceRoleKey = "service-role",
                    UserFoodBucket = "user-food"
                }),
                NullLogger<SupabaseStorageService>.Instance);

            var publicUrl = await service.UploadObjectAsync(
                "user-food",
                "v2/thumb/rice.webp",
                new byte[] { 1, 2, 3 },
                "image/webp",
                "public, max-age=31536000, immutable");

            Assert.Equal(
                "https://example.supabase.co/storage/v1/object/public/user-food/v2/thumb/rice.webp",
                publicUrl);
            Assert.NotNull(capturedRequest);
            Assert.True(capturedRequest!.Headers.TryGetValues("cache-control", out var values));
            Assert.Equal("31536000", Assert.Single(values));
            Assert.Equal("image/webp", capturedRequest.Content?.Headers.ContentType?.MediaType);
        }

        private sealed class CapturingHandler : HttpMessageHandler
        {
            private readonly Func<HttpRequestMessage, HttpResponseMessage> _respond;

            public CapturingHandler(Func<HttpRequestMessage, HttpResponseMessage> respond)
            {
                _respond = respond;
            }

            protected override Task<HttpResponseMessage> SendAsync(
                HttpRequestMessage request,
                CancellationToken cancellationToken)
            {
                return Task.FromResult(_respond(request));
            }
        }
    }
}
