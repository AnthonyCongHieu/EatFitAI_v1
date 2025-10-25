using EatFitAI.Domain.Foods;

namespace EatFitAI.Application.Repositories;

public interface IFoodRepository
{
    Task<Food?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<(IEnumerable<Food> Items, int TotalCount)> SearchAsync(string? query, int offset, int limit, CancellationToken cancellationToken = default);
}