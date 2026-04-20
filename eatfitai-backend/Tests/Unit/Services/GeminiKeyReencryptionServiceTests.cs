using EatFitAI.API.Data;
using EatFitAI.API.Models;
using EatFitAI.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class GeminiKeyReencryptionServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly GeminiKeyReencryptionService _service;

    public GeminiKeyReencryptionServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _context = new ApplicationDbContext(options);
        _service = new GeminiKeyReencryptionService(_context, NullLogger<GeminiKeyReencryptionService>.Instance);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task ReencryptAsync_RewritesCipherTextUsingNewKey()
    {
        const string oldKey = "legacy-encryption-key-1234567890";
        const string newKey = "current-encryption-key-123456789";
        const string apiKey = "gm-live-123";

        var oldEncryptionService = CreateEncryptionService(oldKey);
        var newEncryptionService = CreateEncryptionService(newKey);
        var originalCipherText = oldEncryptionService.Encrypt(apiKey);

        _context.GeminiKeys.Add(new GeminiKey
        {
            Id = Guid.NewGuid(),
            KeyName = "runtime-primary",
            EncryptedApiKey = originalCipherText,
            CreatedAt = DateTime.UtcNow,
        });
        await _context.SaveChangesAsync();

        var report = await _service.ReencryptAsync(oldKey, newKey);
        var storedKey = await _context.GeminiKeys.SingleAsync();

        Assert.Equal(1, report.ReencryptedCount);
        Assert.NotEqual(originalCipherText, storedKey.EncryptedApiKey);
        Assert.Equal(apiKey, newEncryptionService.Decrypt(storedKey.EncryptedApiKey));
        Assert.Throws<InvalidOperationException>(() => oldEncryptionService.Decrypt(storedKey.EncryptedApiKey));
    }

    [Fact]
    public async Task ReencryptAsync_WhenSomeKeysAlreadyUseNewKey_SkipsThemAndContinues()
    {
        const string oldKey = "legacy-encryption-key-1234567890";
        const string newKey = "current-encryption-key-123456789";
        const string oldApiKey = "gm-live-old";
        const string newApiKey = "gm-live-new";

        var oldEncryptionService = CreateEncryptionService(oldKey);
        var newEncryptionService = CreateEncryptionService(newKey);
        var oldCipherText = oldEncryptionService.Encrypt(oldApiKey);
        var newCipherText = newEncryptionService.Encrypt(newApiKey);

        _context.GeminiKeys.AddRange(
            new GeminiKey
            {
                Id = Guid.NewGuid(),
                KeyName = "legacy-runtime",
                EncryptedApiKey = oldCipherText,
                CreatedAt = DateTime.UtcNow.AddMinutes(-1),
            },
            new GeminiKey
            {
                Id = Guid.NewGuid(),
                KeyName = "current-runtime",
                EncryptedApiKey = newCipherText,
                CreatedAt = DateTime.UtcNow,
            });
        await _context.SaveChangesAsync();

        var report = await _service.ReencryptAsync(oldKey, newKey);
        var storedKeys = await _context.GeminiKeys
            .OrderBy(item => item.KeyName)
            .ToListAsync();

        Assert.Equal(1, report.ReencryptedCount);
        Assert.Equal(newApiKey, newEncryptionService.Decrypt(storedKeys[0].EncryptedApiKey));
        Assert.Equal(oldApiKey, newEncryptionService.Decrypt(storedKeys[1].EncryptedApiKey));
    }

    [Fact]
    public async Task ReencryptAsync_WhenAnyKeyCannotBeDecrypted_DoesNotPersistPartialWrites()
    {
        const string oldKey = "legacy-encryption-key-1234567890";
        const string newKey = "current-encryption-key-123456789";

        var oldEncryptionService = CreateEncryptionService(oldKey);
        var validCipherText = oldEncryptionService.Encrypt("gm-live-123");
        const string invalidCipherText = "not-a-valid-cipher";

        _context.GeminiKeys.AddRange(
            new GeminiKey
            {
                Id = Guid.NewGuid(),
                KeyName = "runtime-primary",
                EncryptedApiKey = validCipherText,
                CreatedAt = DateTime.UtcNow,
            },
            new GeminiKey
            {
                Id = Guid.NewGuid(),
                KeyName = "runtime-secondary",
                EncryptedApiKey = invalidCipherText,
                CreatedAt = DateTime.UtcNow,
            });
        await _context.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.ReencryptAsync(oldKey, newKey));

        var storedKeys = await _context.GeminiKeys
            .OrderBy(item => item.KeyName)
            .ToListAsync();

        Assert.Equal(validCipherText, storedKeys[0].EncryptedApiKey);
        Assert.Equal(invalidCipherText, storedKeys[1].EncryptedApiKey);
    }

    private static EncryptionService CreateEncryptionService(string currentKey)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Encryption:Key"] = currentKey,
            })
            .Build();

        return new EncryptionService(configuration, NullLogger<EncryptionService>.Instance);
    }
}
