using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using EatFitAI.API.Services.Interfaces;
using EatFitAI.API.Tests.Integration;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace EatFitAI.API.Tests.Integration.Controllers;

public class StorageControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public StorageControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = IntegrationTestHost.CreateFactory(
            factory,
            $"StorageControllerTests_{Guid.NewGuid():N}");
    }

    [Fact]
    public async Task GeneratePresignedUrl_DefaultsToVisionAndScopesObjectKeyToUser()
    {
        var userId = Guid.NewGuid();
        var storage = new FakeMediaStorageService();

        using var factory = CreateFactory(storage);
        using var client = CreateAuthorizedClient(factory, userId);

        using var response = await client.PostAsJsonAsync("/api/v1/storage/presigned-url", new
        {
            fileName = "scan.jpg",
            contentType = "image/jpeg"
        });

        response.EnsureSuccessStatusCode();
        Assert.Equal("vision", storage.LastBucket);
        Assert.NotNull(storage.LastObjectPath);
        Assert.StartsWith($"{userId:N}/", storage.LastObjectPath);
        Assert.Equal("image/jpeg", storage.LastContentType);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal($"vision/{storage.LastObjectPath}", body.GetProperty("objectKey").GetString());
        Assert.Equal("https://upload.example.test", body.GetProperty("presignedUrl").GetString());
        Assert.Equal($"https://media.example.test/vision/{storage.LastObjectPath}", body.GetProperty("publicUrl").GetString());
        Assert.True(body.GetProperty("uploadId").GetString()?.Length > 0);
    }

    [Fact]
    public async Task GeneratePresignedUrl_RejectsInvalidContentTypeBeforeSigning()
    {
        var userId = Guid.NewGuid();
        var storage = new FakeMediaStorageService();

        using var factory = CreateFactory(storage);
        using var client = CreateAuthorizedClient(factory, userId);

        using var response = await client.PostAsJsonAsync("/api/v1/storage/presigned-url", new
        {
            fileName = "scan.svg",
            contentType = "image/svg+xml"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Null(storage.LastBucket);
    }

    private WebApplicationFactory<Program> CreateFactory(FakeMediaStorageService storage)
    {
        return _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IMediaStorageService>();
                services.AddSingleton<IMediaStorageService>(storage);
            });
        });
    }

    private static HttpClient CreateAuthorizedClient(WebApplicationFactory<Program> factory, Guid userId)
    {
        var client = factory.CreateClient();
        var token = IntegrationTestHost.CreateJwtToken(
            factory.Services,
            userId,
            $"storage_{userId:N}@example.com",
            "Storage User");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private sealed class FakeMediaStorageService : IMediaStorageService
    {
        public bool IsConfigured => true;
        public string? LastBucket { get; private set; }
        public string? LastObjectPath { get; private set; }
        public string? LastContentType { get; private set; }

        public Task<string> UploadAsync(MediaUploadObject upload, CancellationToken cancellationToken = default)
        {
            throw new NotSupportedException();
        }

        public Task<(string PresignedUrl, string PublicUrl)> GetPresignedUrlAsync(
            string bucket,
            string objectPath,
            string contentType,
            TimeSpan expiresIn,
            CancellationToken cancellationToken = default)
        {
            LastBucket = bucket;
            LastObjectPath = objectPath;
            LastContentType = contentType;

            return Task.FromResult((
                "https://upload.example.test",
                $"https://media.example.test/{bucket}/{objectPath}"));
        }
    }
}
