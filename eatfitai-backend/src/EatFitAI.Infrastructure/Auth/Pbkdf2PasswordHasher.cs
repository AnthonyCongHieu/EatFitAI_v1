using System.Buffers.Binary;
using System.Security.Cryptography;

namespace EatFitAI.Infrastructure.Auth;

public sealed class Pbkdf2PasswordHasher : IPasswordHasher
{
    private const int SaltSize = 16;
    private const int KeySize = 32;
    private const int Iterations = 100_000;
    private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;

    public byte[] HashPassword(string password)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(password);

        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var key = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, Algorithm, KeySize);

        var result = new byte[1 + sizeof(int) + SaltSize + KeySize];
        result[0] = 1; // version
        BinaryPrimitives.WriteInt32BigEndian(result.AsSpan(1, sizeof(int)), Iterations);
        salt.CopyTo(result.AsSpan(1 + sizeof(int), SaltSize));
        key.CopyTo(result.AsSpan(1 + sizeof(int) + SaltSize, KeySize));

        return result;
    }

    public bool VerifyPassword(string password, byte[] passwordHash)
    {
        ArgumentNullException.ThrowIfNull(passwordHash);
        if (passwordHash.Length < 1 + sizeof(int) + SaltSize + KeySize)
        {
            return false;
        }

        var version = passwordHash[0];
        if (version != 1)
        {
            return false;
        }

        var iterations = BinaryPrimitives.ReadInt32BigEndian(passwordHash.AsSpan(1, sizeof(int)));
        var salt = passwordHash.AsSpan(1 + sizeof(int), SaltSize).ToArray();
        var expectedKey = passwordHash.AsSpan(1 + sizeof(int) + SaltSize, KeySize);

        var actualKey = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, Algorithm, KeySize);
        return CryptographicOperations.FixedTimeEquals(actualKey, expectedKey);
    }
}
