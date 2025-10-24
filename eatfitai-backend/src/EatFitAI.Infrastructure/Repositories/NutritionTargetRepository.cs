using EatFitAI.Application.Repositories;
using EatFitAI.Domain.Nutrition;
using EatFitAI.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.Infrastructure.Repositories;

public class NutritionTargetRepository : INutritionTargetRepository
{
    private readonly AppDbContext _context;

    public NutritionTargetRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<NutritionTarget?> GetCurrentAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.NutritionTargets
            .Where(t => t.UserId == userId && t.IsActive)
            .OrderByDescending(t => t.EffectiveDate)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task AddAsync(NutritionTarget target, CancellationToken cancellationToken = default)
    {
        await _context.NutritionTargets.AddAsync(target, cancellationToken);
    }

    public Task UpdateAsync(NutritionTarget target, CancellationToken cancellationToken = default)
    {
        _context.NutritionTargets.Update(target);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}