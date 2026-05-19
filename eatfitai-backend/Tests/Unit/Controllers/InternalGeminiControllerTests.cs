using System.Text.Json;
using EatFitAI.API.Controllers;
using EatFitAI.API.Data;
using EatFitAI.API.Helpers;
using EatFitAI.API.Models;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Controllers;

public class InternalGeminiControllerTests
{
    [Fact]
    public async Task GetKeyPool_RejectsMissingOrWrongInternalToken()
    {
        await using var context = CreateDbContext();
        var controller = CreateController(context, "expected-token");

        var result = await controller.GetKeyPool(CancellationToken.None);

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task GetKeyPool_ReturnsOnlyActiveDecryptedKeysWithQuotaLimits()
    {
        var activeId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        await using var context = CreateDbContext();
        context.GeminiKeys.AddRange(
            new GeminiKey
            {
                Id = activeId,
                KeyName = "admin-key-1",
                EncryptedApiKey = "cipher:live-key-1",
                Model = "gemini-2.5-flash",
                IsActive = true,
                RpmLimit = 7,
                TpmLimit = 1234,
                RpdLimit = 33,
                DailyQuotaLimit = 33,
                CreatedAt = DateTime.UtcNow.AddMinutes(-1),
            },
            new GeminiKey
            {
                Id = Guid.NewGuid(),
                KeyName = "inactive-key",
                EncryptedApiKey = "cipher:inactive",
                IsActive = false,
                CreatedAt = DateTime.UtcNow,
            });
        await context.SaveChangesAsync();

        var controller = CreateController(context, "expected-token");
        controller.ControllerContext.HttpContext.Request.Headers[AiProviderRequestHelper.InternalTokenHeader] = "expected-token";

        var result = await controller.GetKeyPool(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = JsonSerializer.Serialize(ok.Value);
        Assert.Contains(activeId.ToString(), json);
        Assert.Contains("live-key-1", json);
        Assert.Contains("\"rpmLimit\":7", json);
        Assert.Contains("\"tpmLimit\":1234", json);
        Assert.Contains("\"rpdLimit\":33", json);
        Assert.DoesNotContain("inactive", json, StringComparison.OrdinalIgnoreCase);
    }

    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private static InternalGeminiController CreateController(ApplicationDbContext context, string internalToken)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AIProvider:InternalToken"] = internalToken,
            })
            .Build();

        return new InternalGeminiController(
            context,
            new FakeEncryptionService(),
            configuration,
            NullLogger<InternalGeminiController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext(),
            },
        };
    }

    private sealed class FakeEncryptionService : IEncryptionService
    {
        public string Encrypt(string plainText) => $"cipher:{plainText}";

        public string Decrypt(string cipherText) =>
            cipherText.StartsWith("cipher:", StringComparison.Ordinal)
                ? cipherText["cipher:".Length..]
                : throw new InvalidOperationException("invalid cipher");
    }
}
