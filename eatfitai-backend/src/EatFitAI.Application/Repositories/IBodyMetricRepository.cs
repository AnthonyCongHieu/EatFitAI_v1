using EatFitAI.Domain.Nutrition;

namespace EatFitAI.Application.Repositories;

public interface IBodyMetricRepository
{
    Task AddAsync(BodyMetric metric, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}