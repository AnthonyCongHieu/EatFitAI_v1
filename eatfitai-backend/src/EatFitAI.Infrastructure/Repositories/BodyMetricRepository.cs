using EatFitAI.Application.Repositories;
using EatFitAI.Domain.Nutrition;
using EatFitAI.Infrastructure.Persistence;

namespace EatFitAI.Infrastructure.Repositories;

public class BodyMetricRepository : IBodyMetricRepository
{
    private readonly AppDbContext _context;

    public BodyMetricRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(BodyMetric metric, CancellationToken cancellationToken = default)
    {
        await _context.BodyMetrics.AddAsync(metric, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}