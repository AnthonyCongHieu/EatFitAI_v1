using EatFitAI.API.DTOs.Admin;

namespace EatFitAI.API.Services.Interfaces;

public interface IAiRuntimeStatusService
{
    Task<AdminRuntimeSnapshotDto> GetSnapshotAsync(CancellationToken cancellationToken = default);
}
