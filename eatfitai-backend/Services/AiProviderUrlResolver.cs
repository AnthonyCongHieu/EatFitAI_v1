namespace EatFitAI.API.Services;

public static class AiProviderUrlResolver
{
    private const string DefaultProviderBaseUrl = "http://127.0.0.1:5050";

    public static string GetVisionBaseUrl(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        return Normalize(configuration["AIProvider:VisionBaseUrl"], "AIProvider:VisionBaseUrl");
    }

    public static string GetVoiceBaseUrl(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var voiceValue = configuration["AIProvider:VoiceBaseUrl"];
        return string.IsNullOrWhiteSpace(voiceValue)
            ? GetVisionBaseUrl(configuration)
            : Normalize(voiceValue, "AIProvider:VoiceBaseUrl");
    }

    private static string Normalize(string? rawValue, string keyName)
    {
        var normalized = string.IsNullOrWhiteSpace(rawValue)
            ? DefaultProviderBaseUrl
            : rawValue.Trim().TrimEnd('/');

        if (!Uri.TryCreate(normalized, UriKind.Absolute, out var uri) || string.IsNullOrWhiteSpace(uri.Host))
        {
            throw new InvalidOperationException($"{keyName} is invalid after normalization.");
        }

        return normalized;
    }
}
