using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.AdminAi;

namespace EatFitAI.API.Services.Interfaces;

public interface IGeminiRuntimeProjectService
{
    Task<List<AdminRuntimeProjectDto>> GetRuntimeProjectsAsync(CancellationToken cancellationToken = default);
    Task<AdminRuntimeProjectDto?> GetRuntimeProjectAsync(string runtimeProjectId, CancellationToken cancellationToken = default);
    Task<AdminRuntimeMetricsDto> GetMetricsAsync(CancellationToken cancellationToken = default);
    Task<List<AdminRuntimeTelemetryDto>> GetTelemetryAsync(CancellationToken cancellationToken = default);
    Task<ProbeRuntimeProjectResult> ProbeProjectAsync(string runtimeProjectId, CancellationToken cancellationToken = default);
    Task<AdminRuntimeProjectDto?> ToggleProjectAsync(string runtimeProjectId, CancellationToken cancellationToken = default);
    Task<AdminRuntimeProjectDto?> SetRoleAsync(string runtimeProjectId, string manualRole, CancellationToken cancellationToken = default);
    Task<AdminRuntimeSnapshotDto> BuildSnapshotAsync(CancellationToken cancellationToken = default);
    Task<AdminRuntimeTelemetryDto> SimulateRequestAsync(int? forcedStatusCode, string triggerSource, CancellationToken cancellationToken = default);
    Task<Guid> ImportProjectAsync(RuntimeProjectImportRequest request, CancellationToken cancellationToken = default);
    Task<(Guid KeyId, string ApiKey, string RuntimeProjectId, string ProjectAlias, string Model)> AcquireKeyForRequestAsync(string triggerSource, CancellationToken cancellationToken = default);
    Task RecordRequestOutcomeAsync(
        string requestId,
        Guid keyId,
        string runtimeProjectId,
        string projectAlias,
        string model,
        string triggerSource,
        DateTime startedAtUtc,
        int providerStatusCode,
        string outcome,
        string? usageMetadataJson,
        string? finishReason,
        string? providerErrorCode,
        string? failoverFromProjectId,
        CancellationToken cancellationToken = default);
    string ResolveRuntimeProjectIdForKey(Guid keyId);
    void RecordFailure(Guid keyId, string runtimeProjectId, int statusCode);
}
