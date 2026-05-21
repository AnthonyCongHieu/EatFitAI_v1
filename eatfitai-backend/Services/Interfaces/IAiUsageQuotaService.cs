using EatFitAI.API.DTOs.AI;

namespace EatFitAI.API.Services.Interfaces;

public interface IAiUsageQuotaService
{
    Task<AiUsageQuotaStatusDto> GetStatusAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<AiUsageQuotaFeatureDto> EnsureCanUseAsync(
        Guid userId,
        string featureKey,
        CancellationToken cancellationToken = default);

    Task RecordUsageAsync(
        Guid userId,
        string featureKey,
        object? input,
        object? output,
        long durationMs = 0,
        CancellationToken cancellationToken = default);
}
