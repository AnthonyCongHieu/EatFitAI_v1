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

    public async Task<(decimal TotalQuantityGrams, decimal TotalCaloriesKcal, decimal TotalProteinGrams, decimal TotalCarbohydrateGrams, decimal TotalFatGrams)?> GetDaySummaryAsync(Guid maNguoiDung, DateOnly ngayAn, CancellationToken cancellationToken = default)
    {
        var result = await _context.NhatKyAnUong
            .Where(e => e.MaNguoiDung == maNguoiDung && e.NgayAn == ngayAn)
            .GroupBy(e => 1)
            .Select(g => new
            {
                TotalQuantityGrams = g.Sum(e => e.KhoiLuongGram),
                TotalCaloriesKcal = g.Sum(e => e.Calo),
                TotalProteinGrams = g.Sum(e => e.Protein),
                TotalCarbohydrateGrams = g.Sum(e => e.Carb),
                TotalFatGrams = g.Sum(e => e.Fat)
            })
            .FirstOrDefaultAsync(cancellationToken);

        return result is null ? null : (result.TotalQuantityGrams, result.TotalCaloriesKcal, result.TotalProteinGrams, result.TotalCarbohydrateGrams, result.TotalFatGrams);
    }

    public async Task<IEnumerable<(DateOnly MealDate, decimal TotalQuantityGrams, decimal TotalCaloriesKcal, decimal TotalProteinGrams, decimal TotalCarbohydrateGrams, decimal TotalFatGrams)>> GetWeekSummaryAsync(Guid maNguoiDung, DateOnly ngayKetThuc, CancellationToken cancellationToken = default)
    {
        var ngayBatDau = ngayKetThuc.AddDays(-6);

        var results = await _context.NhatKyAnUong
            .Where(e => e.MaNguoiDung == maNguoiDung && e.NgayAn >= ngayBatDau && e.NgayAn <= ngayKetThuc)
            .GroupBy(e => e.NgayAn)
            .Select(g => new
            {
                MealDate = g.Key,
                TotalQuantityGrams = g.Sum(e => e.KhoiLuongGram),
                TotalCaloriesKcal = g.Sum(e => e.Calo),
                TotalProteinGrams = g.Sum(e => e.Protein),
                TotalCarbohydrateGrams = g.Sum(e => e.Carb),
                TotalFatGrams = g.Sum(e => e.Fat)
            })
            .OrderBy(r => r.MealDate)
            .ToListAsync(cancellationToken);

        return results.Select(r => (r.MealDate, r.TotalQuantityGrams, r.TotalCaloriesKcal, r.TotalProteinGrams, r.TotalCarbohydrateGrams, r.TotalFatGrams));
    }
}