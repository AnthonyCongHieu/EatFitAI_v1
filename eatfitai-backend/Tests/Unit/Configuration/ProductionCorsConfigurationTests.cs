using System.Text.Json;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Configuration;

public class ProductionCorsConfigurationTests
{
    [Fact]
    public void ProductionAllowedOrigins_DoNotUseWildcardOrigins_WithCredentialedCors()
    {
        var productionConfigPath = FindRepositoryFile("eatfitai-backend", "appsettings.Production.json");
        using var stream = File.OpenRead(productionConfigPath);
        using var document = JsonDocument.Parse(stream);

        var origins = document.RootElement
            .GetProperty("AllowedOrigins")
            .EnumerateArray()
            .Select(item => item.GetString())
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .ToArray();

        Assert.Contains("https://eatfitai-admin.vercel.app", origins);
        Assert.DoesNotContain(origins, origin => origin!.Contains('*', StringComparison.Ordinal));
    }

    private static string FindRepositoryFile(params string[] pathSegments)
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);
        while (current != null)
        {
            var candidate = Path.Combine(new[] { current.FullName }.Concat(pathSegments).ToArray());
            if (File.Exists(candidate))
            {
                return candidate;
            }

            current = current.Parent;
        }

        throw new FileNotFoundException(
            $"Could not find repository file: {Path.Combine(pathSegments)}");
    }
}
