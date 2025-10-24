using EatFitAI.Application.Repositories;
using EatFitAI.Domain.Foods;
using EatFitAI.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.Infrastructure.Repositories;

public class CustomDishRepository : ICustomDishRepository
{
    private readonly AppDbContext _context;

    public CustomDishRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<CustomDish?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.CustomDishes
            .Include(d => d.Ingredients)
            .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId, cancellationToken);
    }

    public async Task<IEnumerable<CustomDish>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.CustomDishes
            .Where(d => d.UserId == userId)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(CustomDish dish, CancellationToken cancellationToken = default)
    {
        await _context.CustomDishes.AddAsync(dish, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}