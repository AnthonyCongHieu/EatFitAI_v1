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
    private readonly ILogger<EncryptionService> _logger;

    public EncryptionService(IConfiguration configuration, ILogger<EncryptionService> logger)
    {
        _logger = logger;
        _encryptionKey = configuration["Encryption:Key"] ?? 
                         "EATFITAI_FALLBACK_DEFAULT_KEY_32BYTES!"; // Should be 32 chars for AES-256
        
        // Ensure the key is exactly 32 bytes (256 bits)
        if (_encryptionKey.Length < 32)
        {
            _encryptionKey = _encryptionKey.PadRight(32, 'X');
        }
        else if (_encryptionKey.Length > 32)
        {
            _encryptionKey = _encryptionKey.Substring(0, 32);
        }
    }

    public string Encrypt(string plainText)
    {
        if (string.IsNullOrEmpty(plainText))
            return plainText;

        try
        {
            using var aes = Aes.Create();
            aes.Key = Encoding.UTF8.GetBytes(_encryptionKey);
            aes.GenerateIV();
            var iv = aes.IV;

            using var memoryStream = new MemoryStream();
            memoryStream.Write(iv, 0, iv.Length); // Prepend IV to ciphertext

            using var cryptoStream = new CryptoStream(memoryStream, aes.CreateEncryptor(), CryptoStreamMode.Write);
            using var streamWriter = new StreamWriter(cryptoStream);
            
            streamWriter.Write(plainText);
            streamWriter.Flush();
            cryptoStream.FlushFinalBlock();

            return Convert.ToBase64String(memoryStream.ToArray());
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

        try
        {
            var fullCipher = Convert.FromBase64String(cipherText);
            using var aes = Aes.Create();

            var iv = new byte[aes.BlockSize / 8];
            var cipher = new byte[fullCipher.Length - iv.Length];

            Array.Copy(fullCipher, iv, iv.Length);
            Array.Copy(fullCipher, iv.Length, cipher, 0, cipher.Length);

            aes.Key = Encoding.UTF8.GetBytes(_encryptionKey);
            aes.IV = iv;

            using var memoryStream = new MemoryStream(cipher);
            using var cryptoStream = new CryptoStream(memoryStream, aes.CreateDecryptor(), CryptoStreamMode.Read);
            using var streamReader = new StreamReader(cryptoStream);

            return streamReader.ReadToEnd();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to decrypt data.");
            throw new InvalidOperationException("Decryption failed", ex);
        }
    }
}
