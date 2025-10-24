using EatFitAI.Application.Repositories;
using EatFitAI.Domain.Foods;
using EatFitAI.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.Infrastructure.Repositories;

public class FoodRepository : IFoodRepository
{
    private readonly AppDbContext _context;

    public FoodRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Food?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Foods.FindAsync(new object[] { id }, cancellationToken);
    }

    public async Task<(IEnumerable<Food> Items, int TotalCount)> SearchAsync(string? query, int offset, int limit, CancellationToken cancellationToken = default)
    {
        var queryable = _context.Foods.AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            queryable = queryable.Where(f => f.Name.Contains(query) || f.Brand.Contains(query) || f.Category.Contains(query));
        }

        var totalCount = await queryable.CountAsync(cancellationToken);

        var items = await queryable
            .OrderBy(f => f.Name)
            .Skip(offset)
            .Take(limit)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }
}