using EatFitAI.API.Data;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public sealed class GeminiKeyReencryptionService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<GeminiKeyReencryptionService> _logger;

    public GeminiKeyReencryptionService(
        ApplicationDbContext context,
        ILogger<GeminiKeyReencryptionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public Task<GeminiKeyReencryptionReport> ReencryptAsync(
        string oldKey,
        string newKey,
        CancellationToken cancellationToken = default)
    {
        return ReencryptCoreAsync(oldKey, newKey, cancellationToken);
    }

    private async Task<GeminiKeyReencryptionReport> ReencryptCoreAsync(
        string oldKey,
        string newKey,
        CancellationToken cancellationToken)
    {
        var normalizedOldKey = EncryptionService.NormalizeKey(oldKey);
        var normalizedNewKey = EncryptionService.NormalizeKey(newKey);
        if (string.Equals(normalizedOldKey, normalizedNewKey, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Old and new encryption keys must be different.");
        }

        var keys = await _context.GeminiKeys
            .OrderBy(item => item.CreatedAt)
            .ThenBy(item => item.KeyName)
            .ToListAsync(cancellationToken);

        var decryptedKeys = new List<(Models.GeminiKey Key, string PlainText)>(keys.Count);
        var alreadyUsingNewKeyCount = 0;
        foreach (var key in keys)
        {
            if (EncryptionService.TryDecryptWithKey(key.EncryptedApiKey, normalizedOldKey, out var plainText))
            {
                decryptedKeys.Add((key, plainText));
                continue;
            }

            if (EncryptionService.TryDecryptWithKey(key.EncryptedApiKey, normalizedNewKey, out _))
            {
                alreadyUsingNewKeyCount += 1;
                continue;
            }

            throw new InvalidOperationException(
                $"Unable to decrypt Gemini key '{key.KeyName}' ({key.Id}) with the provided old or new encryption key.");
        }

        foreach (var item in decryptedKeys)
        {
            item.Key.EncryptedApiKey = EncryptionService.EncryptWithKey(item.PlainText, normalizedNewKey);
        }

        await _context.SaveChangesAsync(cancellationToken);

        var report = new GeminiKeyReencryptionReport(
            decryptedKeys.Count,
            DateTimeOffset.UtcNow);
        _logger.LogInformation(
            "Re-encrypted {Count} Gemini keys with the new encryption key. Skipped {SkippedCount} keys already encrypted with the new key.",
            report.ReencryptedCount,
            alreadyUsingNewKeyCount);

        return report;
    }
}

public sealed record GeminiKeyReencryptionReport(
    int ReencryptedCount,
    DateTimeOffset CompletedAt);
