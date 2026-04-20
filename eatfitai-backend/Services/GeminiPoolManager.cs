using EatFitAI.API.Services.Interfaces;

namespace EatFitAI.API.Services;

public class GeminiPoolManager : IGeminiPoolManager
{
    private readonly IGeminiRuntimeProjectService _runtimeProjectService;

    public GeminiPoolManager(IGeminiRuntimeProjectService runtimeProjectService)
    {
        _runtimeProjectService = runtimeProjectService;
    }

    public async Task<(Guid KeyId, string ApiKey)> GetNextAvailableKeyAsync()
    {
        var selected = await _runtimeProjectService.AcquireKeyForRequestAsync("app-runtime");
        return (selected.KeyId, selected.ApiKey);
    }

    public Task ReportUsageAsync(Guid keyId)
    {
        // Legacy interface is retained for compatibility. New runtime flows should call
        // RecordRequestOutcomeAsync with provider truth instead.
        return Task.CompletedTask;
    }

    public void ReportFailure(Guid keyId, int statusCode)
    {
        var runtimeProjectId = _runtimeProjectService.ResolveRuntimeProjectIdForKey(keyId);
        _runtimeProjectService.RecordFailure(keyId, runtimeProjectId, statusCode);
    }
}
