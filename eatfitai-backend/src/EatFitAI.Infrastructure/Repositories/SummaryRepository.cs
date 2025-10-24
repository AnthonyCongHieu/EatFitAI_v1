using EatFitAI.Application.Repositories;
using EatFitAI.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.Infrastructure.Repositories;

public class SummaryRepository : ISummaryRepository
{
    private readonly AppDbContext _context;

    public SummaryRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<(decimal TotalQuantityGrams, decimal TotalCaloriesKcal, decimal TotalProteinGrams, decimal TotalCarbohydrateGrams, decimal TotalFatGrams)?> GetDaySummaryAsync(Guid userId, DateOnly date, CancellationToken cancellationToken = default)
    {
        var result = await _context.DiaryEntries
            .Where(e => e.UserId == userId && e.MealDate == date)
            .GroupBy(e => 1)
            .Select(g => new
            {
                TotalQuantityGrams = g.Sum(e => e.QuantityGrams),
                TotalCaloriesKcal = g.Sum(e => e.CaloriesKcal),
                TotalProteinGrams = g.Sum(e => e.ProteinGrams),
                TotalCarbohydrateGrams = g.Sum(e => e.CarbohydrateGrams),
                TotalFatGrams = g.Sum(e => e.FatGrams)
            })
            .FirstOrDefaultAsync(cancellationToken);

        return result is null ? null : (result.TotalQuantityGrams, result.TotalCaloriesKcal, result.TotalProteinGrams, result.TotalCarbohydrateGrams, result.TotalFatGrams);
    }

    public async Task<IEnumerable<(DateOnly MealDate, decimal TotalQuantityGrams, decimal TotalCaloriesKcal, decimal TotalProteinGrams, decimal TotalCarbohydrateGrams, decimal TotalFatGrams)>> GetWeekSummaryAsync(Guid userId, DateOnly endDate, CancellationToken cancellationToken = default)
    {
        var startDate = endDate.AddDays(-6);

        var results = await _context.DiaryEntries
            .Where(e => e.UserId == userId && e.MealDate >= startDate && e.MealDate <= endDate)
            .GroupBy(e => e.MealDate)
            .Select(g => new
            {
                MealDate = g.Key,
                TotalQuantityGrams = g.Sum(e => e.QuantityGrams),
                TotalCaloriesKcal = g.Sum(e => e.CaloriesKcal),
                TotalProteinGrams = g.Sum(e => e.ProteinGrams),
                TotalCarbohydrateGrams = g.Sum(e => e.CarbohydrateGrams),
                TotalFatGrams = g.Sum(e => e.FatGrams)
            })
            .OrderBy(r => r.MealDate)
            .ToListAsync(cancellationToken);

        return results.Select(r => (r.MealDate, r.TotalQuantityGrams, r.TotalCaloriesKcal, r.TotalProteinGrams, r.TotalCarbohydrateGrams, r.TotalFatGrams));
    }
}