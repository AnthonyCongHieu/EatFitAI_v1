using EatFitAI.API.DTOs.Subscription;

namespace EatFitAI.API.Services.Interfaces;

public interface IEntitlementService
{
    Task<SubscriptionStatusDto> GetSubscriptionStatusAsync(Guid userId, CancellationToken cancellationToken = default);
}
