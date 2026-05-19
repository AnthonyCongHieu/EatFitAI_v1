using EatFitAI.API.Helpers;
using EatFitAI.API.Services.Interfaces;

namespace EatFitAI.API.Services;

public sealed class AiProviderRuntimeReloadNotifier : IAiProviderRuntimeReloadNotifier
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AiProviderRuntimeReloadNotifier> _logger;

    public AiProviderRuntimeReloadNotifier(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<AiProviderRuntimeReloadNotifier> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> ReloadGeminiKeysAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var providerBaseUrl = AiProviderUrlResolver.GetVisionBaseUrl(_configuration);
            using var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);

            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"{providerBaseUrl}/internal/runtime/reload-keys");
            AiProviderRequestHelper.AddInternalTokenHeader(request, _configuration, _logger);

            using var response = await client.SendAsync(request, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return true;
            }

            _logger.LogWarning(
                "AI provider Gemini key reload returned HTTP {StatusCode}. Runtime reload pending.",
                (int)response.StatusCode);
            return false;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "AI provider Gemini key reload failed. Runtime reload pending.");
            return false;
        }
    }
}
