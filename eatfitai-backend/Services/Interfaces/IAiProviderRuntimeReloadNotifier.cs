namespace EatFitAI.API.Services.Interfaces;

public interface IAiProviderRuntimeReloadNotifier
{
    Task<bool> ReloadGeminiKeysAsync(CancellationToken cancellationToken = default);
}
