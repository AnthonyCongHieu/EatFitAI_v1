using EatFitAI.Application.Repositories;
using EatFitAI.Domain.Nutrition;
using EatFitAI.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.Infrastructure.Repositories;

public class BodyMetricRepository : IBodyMetricRepository
{
    private readonly AppDbContext _context;

    public BodyMetricRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<BodyMetric?> GetByIdAsync(long id, Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.ChiSoCoThe
            .FirstOrDefaultAsync(b => b.MaChiSo == id && b.MaNguoiDung == userId, cancellationToken);
    }

    public async Task<IEnumerable<BodyMetric>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.ChiSoCoThe
            .Where(b => b.MaNguoiDung == userId)
            .OrderByDescending(b => b.NgayCapNhat)
            .ToListAsync(cancellationToken);
    }

    public async Task<BodyMetric?> GetLatestByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.ChiSoCoThe
            .Where(b => b.MaNguoiDung == userId)
            .OrderByDescending(b => b.NgayCapNhat)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task AddAsync(BodyMetric metric, CancellationToken cancellationToken = default)
    {
        await _context.ChiSoCoThe.AddAsync(metric, cancellationToken);
    }

    public Task UpdateAsync(BodyMetric metric, CancellationToken cancellationToken = default)
    {
        _context.ChiSoCoThe.Update(metric);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(BodyMetric metric, CancellationToken cancellationToken = default)
    {
        _context.ChiSoCoThe.Remove(metric);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}