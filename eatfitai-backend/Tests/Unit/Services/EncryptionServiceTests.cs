using EatFitAI.API.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class EncryptionServiceTests
{
    [Fact]
    public void Decrypt_WhenCipherWasEncryptedWithPreviousKey_ReturnsPlainText()
    {
        const string legacyKey = "legacy-encryption-key-1234567890";
        const string currentKey = "current-encryption-key-123456789";
        const string secret = "gemini-api-key";

        var legacyService = CreateService(legacyKey);
        var rotatedService = CreateService(currentKey, $"wrong-key-12345678901234567890;{legacyKey}");

        var cipherText = legacyService.Encrypt(secret);

        var plainText = rotatedService.Decrypt(cipherText);

        Assert.Equal(secret, plainText);
    }

    [Fact]
    public void Encrypt_UsesCurrentKeyForNewCipherText()
    {
        const string legacyKey = "legacy-encryption-key-1234567890";
        const string currentKey = "current-encryption-key-123456789";
        const string secret = "rotated-secret";

        var rotatedService = CreateService(currentKey, legacyKey);
        var currentOnlyService = CreateService(currentKey);

        var cipherText = rotatedService.Encrypt(secret);

        var plainText = currentOnlyService.Decrypt(cipherText);

        Assert.Equal(secret, plainText);
    }

    private static EncryptionService CreateService(string currentKey, string? previousKeys = null)
    {
        var values = new Dictionary<string, string?>
        {
            ["Encryption:Key"] = currentKey,
        };

        if (!string.IsNullOrWhiteSpace(previousKeys))
        {
            values["Encryption:PreviousKeys"] = previousKeys;
        }

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();

        return new EncryptionService(configuration, NullLogger<EncryptionService>.Instance);
    }
}
