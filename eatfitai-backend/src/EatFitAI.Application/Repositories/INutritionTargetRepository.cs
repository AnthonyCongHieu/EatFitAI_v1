using EatFitAI.Domain.Nutrition;

namespace EatFitAI.Application.Repositories;

public interface INutritionTargetRepository
{
    Task<NutritionTarget?> GetCurrentAsync(Guid userId, CancellationToken cancellationToken = default);
    Task AddAsync(NutritionTarget target, CancellationToken cancellationToken = default);
    Task UpdateAsync(NutritionTarget target, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}