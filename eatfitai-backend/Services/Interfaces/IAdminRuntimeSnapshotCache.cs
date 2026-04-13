using EatFitAI.API.DTOs.Admin;

namespace EatFitAI.API.Services.Interfaces;

public interface IAdminRuntimeSnapshotCache
{
    Task<AdminRuntimeSnapshotDto?> GetLatestAsync(CancellationToken cancellationToken = default);
    Task<AdminRuntimeSnapshotDto?> RefreshNowAsync(CancellationToken cancellationToken = default);
    AdminRuntimeSnapshotCacheState GetState();
}

public sealed class AdminRuntimeSnapshotCacheState
{
    public AdminRuntimeSnapshotDto? Snapshot { get; init; }
    public DateTimeOffset? LastAttemptAt { get; init; }
    public DateTimeOffset? LastSuccessAt { get; init; }
    public string? LastError { get; init; }
}
