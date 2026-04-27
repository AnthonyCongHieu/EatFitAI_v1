using System.Net;
using Amazon.S3;
using Amazon.S3.Model;
using EatFitAI.API.Options;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;
using OptionsFactory = Microsoft.Extensions.Options.Options;

namespace EatFitAI.API.Tests.Unit.Services
{
    public class R2MediaStorageServiceTests
    {
        [Fact]
        public void IsConfigured_ReturnsFalseForPlaceholderSettings()
        {
            var service = new TestR2MediaStorageService(
                OptionsFactory.Create(new MediaOptions
                {
                    PublicBaseUrl = "https://media.example.com"
                }),
                OptionsFactory.Create(new R2Options
                {
                    AccountId = "SET_IN_ENV_OR_SECRET_STORE",
                    Bucket = "eatfitai-media",
                    AccessKeyId = "SET_IN_ENV_OR_SECRET_STORE",
                    SecretAccessKey = "SET_IN_ENV_OR_SECRET_STORE"
                }),
                Mock.Of<IAmazonS3>());

            Assert.False(service.IsConfigured);
        }

        [Fact]
        public async Task UploadAsync_SetsObjectKeyHeadersAndReturnsPublicUrl()
        {
            PutObjectRequest? capturedRequest = null;
            var s3Client = new Mock<IAmazonS3>();
            s3Client
                .Setup(client => client.PutObjectAsync(
                    It.IsAny<PutObjectRequest>(),
                    It.IsAny<CancellationToken>()))
                .Callback<PutObjectRequest, CancellationToken>((request, _) => capturedRequest = request)
                .ReturnsAsync(new PutObjectResponse { HttpStatusCode = HttpStatusCode.OK });

            var service = new TestR2MediaStorageService(
                OptionsFactory.Create(new MediaOptions
                {
                    PublicBaseUrl = "https://media.example.com"
                }),
                OptionsFactory.Create(new R2Options
                {
                    AccountId = "account",
                    Bucket = "eatfitai-media",
                    AccessKeyId = "access",
                    SecretAccessKey = "secret"
                }),
                s3Client.Object);

            var publicUrl = await service.UploadAsync(new MediaUploadObject
            {
                Bucket = "food-images",
                ObjectPath = "v2/thumb/42.webp",
                Bytes = new byte[] { 1, 2, 3 },
                ContentType = "image/webp"
            });

            Assert.Equal("https://media.example.com/food-images/v2/thumb/42.webp", publicUrl);
            Assert.NotNull(capturedRequest);
            Assert.Equal("eatfitai-media", capturedRequest.BucketName);
            Assert.Equal("food-images/v2/thumb/42.webp", capturedRequest.Key);
            Assert.Equal("image/webp", capturedRequest.ContentType);
            Assert.Equal("public, max-age=31536000, immutable", capturedRequest.Headers.CacheControl);
        }

        private sealed class TestR2MediaStorageService : R2MediaStorageService
        {
            private readonly IAmazonS3 _client;

            public TestR2MediaStorageService(
                IOptions<MediaOptions> mediaOptions,
                IOptions<R2Options> r2Options,
                IAmazonS3 client)
                : base(mediaOptions, r2Options, NullLogger<R2MediaStorageService>.Instance)
            {
                _client = client;
            }

            protected override IAmazonS3 CreateClient()
            {
                return _client;
            }
        }
    }
}
