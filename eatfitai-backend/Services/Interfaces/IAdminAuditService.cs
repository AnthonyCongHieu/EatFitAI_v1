using EatFitAI.API.DTOs.Admin;

namespace EatFitAI.API.Services.Interfaces;

public interface IAdminAuditService
{
    Task EnsureTableAsync(CancellationToken cancellationToken = default);
    Task WriteAsync(HttpContext httpContext, AdminAuditWriteRequest request, CancellationToken cancellationToken = default);
    Task<AdminAuditFeedDto> QueryAsync(AdminAuditQuery query, CancellationToken cancellationToken = default);
}
