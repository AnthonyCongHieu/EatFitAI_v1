using EatFitAI.Domain.Nutrition;

namespace EatFitAI.Application.Repositories;

public interface IBodyMetricRepository
{
    Task<BodyMetric?> GetByIdAsync(long id, Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<BodyMetric>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<BodyMetric?> GetLatestByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task AddAsync(BodyMetric metric, CancellationToken cancellationToken = default);
    Task UpdateAsync(BodyMetric metric, CancellationToken cancellationToken = default);
    Task DeleteAsync(BodyMetric metric, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}