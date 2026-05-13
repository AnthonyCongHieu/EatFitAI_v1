using EatFitAI.API.DTOs.Admin;

namespace EatFitAI.API.Services.Interfaces;

public interface IAdminControlPlaneService
{
    Task<AdminControlPlaneSnapshotDto> GetSnapshotAsync(CancellationToken cancellationToken = default);

    Task<AdminControlPlaneRefreshResultDto> RefreshAsync(
        AdminControlPlaneRefreshRequest request,
        HttpContext httpContext,
        CancellationToken cancellationToken = default);
}
