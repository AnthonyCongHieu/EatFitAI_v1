using EatFitAI.API.DTOs.Admin;

namespace EatFitAI.API.Services.Interfaces;

public interface IAdminQuotaOverviewService
{
    Task<AdminQuotaOverviewDto> GetOverviewAsync(
        AdminQuotaOverviewQuery query,
        CancellationToken cancellationToken = default);

    Task<AdminQuotaBulkActionPreviewDto> PreviewBulkActionAsync(
        AdminQuotaBulkActionRequest request,
        CancellationToken cancellationToken = default);

    Task<AdminQuotaBulkActionPreviewDto> CommitBulkActionAsync(
        AdminQuotaBulkActionRequest request,
        CancellationToken cancellationToken = default);
}
