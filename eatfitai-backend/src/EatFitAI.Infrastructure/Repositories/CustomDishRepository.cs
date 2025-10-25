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

    public async Task<CustomDish?> GetByIdAsync(long id, Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.MonNguoiDung
            .Include(d => d.Ingredients)
            .FirstOrDefaultAsync(d => d.MaMonNguoiDung == id && d.MaNguoiDung == userId, cancellationToken);
    }

    public async Task<IEnumerable<CustomDish>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.MonNguoiDung
            .Where(d => d.MaNguoiDung == userId)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(CustomDish dish, CancellationToken cancellationToken = default)
    {
        await _context.MonNguoiDung.AddAsync(dish, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}