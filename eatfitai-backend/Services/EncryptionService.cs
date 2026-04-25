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
    private const string DefaultEncryptionKey = "  ";
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

    internal static string NormalizeKey(string? rawKey)
    {
        var value = string.IsNullOrWhiteSpace(rawKey)
            ? DefaultEncryptionKey
            : rawKey.Trim();

        if (value.Length < 32)
        {
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
