using EatFitAI.Domain.Foods;

namespace EatFitAI.Application.Repositories;

public interface ICustomDishRepository
{
    Task<CustomDish?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<CustomDish>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task AddAsync(CustomDish dish, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}