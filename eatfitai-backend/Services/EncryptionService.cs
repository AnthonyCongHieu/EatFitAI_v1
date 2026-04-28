using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using EatFitAI.API.Services.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace EatFitAI.API.Services;

public class EncryptionService : IEncryptionService
{
    private readonly string _encryptionKey;
    private readonly string[] _decryptionKeys;
    private readonly ILogger<EncryptionService> _logger;

    public EncryptionService(IConfiguration configuration, ILogger<EncryptionService> logger)
    {
        _logger = logger;
        _encryptionKey = NormalizeKey(configuration["Encryption:Key"]);
        _decryptionKeys = BuildDecryptionKeys(
            configuration["Encryption:Key"],
            configuration["Encryption:PreviousKeys"]);
    }

    public string Encrypt(string plainText)
    {
        if (string.IsNullOrEmpty(plainText))
        {
            return plainText;
        }

        try
        {
            return EncryptWithKey(plainText, _encryptionKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to encrypt data.");
            throw new InvalidOperationException("Encryption failed", ex);
        }
    }

    public string Decrypt(string cipherText)
    {
        if (string.IsNullOrEmpty(cipherText))
            return cipherText;

        foreach (var key in _decryptionKeys)
        {
            if (TryDecryptWithKey(cipherText, key, out var plainText))
            {
                return plainText;
            }
        }

        _logger.LogError("Failed to decrypt data with the configured current/previous encryption keys.");
        throw new InvalidOperationException("Decryption failed");
    }

    internal static string EncryptWithKey(string plainText, string rawKey)
    {
        var normalizedKey = NormalizeKey(rawKey);

        using var aes = Aes.Create();
        aes.Key = Encoding.UTF8.GetBytes(normalizedKey);
        aes.GenerateIV();
        var iv = aes.IV;

        using var memoryStream = new MemoryStream();
        memoryStream.Write(iv, 0, iv.Length);

        using var cryptoStream = new CryptoStream(memoryStream, aes.CreateEncryptor(), CryptoStreamMode.Write);
        using var streamWriter = new StreamWriter(cryptoStream);

        streamWriter.Write(plainText);
        streamWriter.Flush();
        cryptoStream.FlushFinalBlock();

        return Convert.ToBase64String(memoryStream.ToArray());
    }

    internal static bool TryDecryptWithKey(string cipherText, string rawKey, out string plainText)
    {
        plainText = string.Empty;

        try
        {
            plainText = DecryptWithKey(cipherText, rawKey);
            return true;
        }
        catch (FormatException)
        {
            return false;
        }
        catch (CryptographicException)
        {
            return false;
        }
        catch (InvalidOperationException)
        {
            return false;
        }
        catch (DecoderFallbackException)
        {
            return false;
        }
    }

    /// <summary>
    /// Normalizes a raw encryption key to exactly 32 bytes (AES-256).
    /// In Production, missing or short keys will cause a hard failure (fail-closed).
    /// In Development/Test, a deterministic fallback is used for convenience.
    /// </summary>
    internal static string NormalizeKey(string? rawKey)
    {
        if (string.IsNullOrWhiteSpace(rawKey))
        {
            var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
            if (string.Equals(env, "Production", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Encryption:Key is not configured. Encryption cannot operate without a valid key in Production.");
            }
            // Development/test fallback — deterministic but weak
            rawKey = "DevOnlyFallbackKey__NOT_FOR_PROD";
        }

        var value = rawKey.Trim();

        if (value.Length < 32)
        {
            var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
            if (string.Equals(env, "Production", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    $"Encryption:Key must be at least 32 characters (got {value.Length}). Refusing to pad in Production.");
            }
            return value.PadRight(32, 'X');
        }

        return value.Length > 32
            ? value.Substring(0, 32)
            : value;
    }

    private static string[] BuildDecryptionKeys(string? currentKey, string? previousKeys)
    {
        var keys = new List<string>
        {
            NormalizeKey(currentKey)
        };

        if (!string.IsNullOrWhiteSpace(previousKeys))
        {
            foreach (var candidate in previousKeys.Split([';', ',', '\r', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                var normalizedCandidate = NormalizeKey(candidate);
                if (!keys.Contains(normalizedCandidate, StringComparer.Ordinal))
                {
                    keys.Add(normalizedCandidate);
                }
            }
        }

        return keys.ToArray();
    }

    private static string DecryptWithKey(string cipherText, string rawKey)
    {
        var normalizedKey = NormalizeKey(rawKey);
        var fullCipher = Convert.FromBase64String(cipherText);
        using var aes = Aes.Create();

        var iv = new byte[aes.BlockSize / 8];
        var cipher = new byte[fullCipher.Length - iv.Length];

        Array.Copy(fullCipher, iv, iv.Length);
        Array.Copy(fullCipher, iv.Length, cipher, 0, cipher.Length);

        aes.Key = Encoding.UTF8.GetBytes(normalizedKey);
        aes.IV = iv;

        using var memoryStream = new MemoryStream(cipher);
        using var cryptoStream = new CryptoStream(memoryStream, aes.CreateDecryptor(), CryptoStreamMode.Read);
        using var streamReader = new StreamReader(
            cryptoStream,
            new UTF8Encoding(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true),
            detectEncodingFromByteOrderMarks: false);

        return streamReader.ReadToEnd();
    }
}
