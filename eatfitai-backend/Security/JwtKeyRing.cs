using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace EatFitAI.API.Security;

public static class JwtKeyRing
{
    public static IReadOnlyList<string> GetConfiguredKeys(IConfiguration configuration)
    {
        var primaryKey = configuration["Jwt:Key"];
        if (IsPlaceholderSecret(primaryKey))
        {
            throw new InvalidOperationException("Jwt:Key is missing or insecure.");
        }

        var keys = new List<string> { primaryKey!.Trim() };
        var previousKeys = configuration["Jwt:PreviousKeys"];
        if (string.IsNullOrWhiteSpace(previousKeys))
        {
            return keys;
        }

        foreach (var candidate in previousKeys
                     .Split(new[] { ',', ';', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (IsPlaceholderSecret(candidate) || keys.Contains(candidate, StringComparer.Ordinal))
            {
                continue;
            }

            keys.Add(candidate);
        }

        return keys;
    }

    public static IReadOnlyList<SecurityKey> GetConfiguredSigningKeys(IConfiguration configuration)
    {
        return GetConfiguredKeys(configuration)
            .Select(key => new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)))
            .Cast<SecurityKey>()
            .ToArray();
    }

    public static byte[] GetPrimarySigningKeyBytes(IConfiguration configuration)
    {
        var primaryKey = configuration["Jwt:Key"];
        if (IsPlaceholderSecret(primaryKey))
        {
            throw new InvalidOperationException("Jwt:Key is missing or insecure.");
        }

        return Encoding.UTF8.GetBytes(primaryKey!);
    }

    private static bool IsPlaceholderSecret(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return true;
        }

        return string.Equals(value, "default-secret-key", StringComparison.OrdinalIgnoreCase)
            || string.Equals(value, "REPLACE_WITH_USER_SECRET", StringComparison.OrdinalIgnoreCase)
            || string.Equals(value, "SET_IN_USER_SECRETS", StringComparison.OrdinalIgnoreCase)
            || string.Equals(value, "SET_IN_ENV_OR_SECRET_STORE", StringComparison.OrdinalIgnoreCase)
            || string.Equals(value, "YourSuperSecretKeyHereThatIsAtLeast32CharactersLongForProductionUse", StringComparison.OrdinalIgnoreCase)
            || string.Equals(value, "YourSuperSecretKeyHereThatIsAtLeast32CharactersLongForDevelopmentUse", StringComparison.OrdinalIgnoreCase);
    }
}
