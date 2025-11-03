using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Repositories
{
    public class AnalyticsRepository : BaseRepository<MealDiary>, IAnalyticsRepository
    {
        public AnalyticsRepository(EatFitAIDbContext context) : base(context)
        {
        }

        public async Task<decimal> GetTotalCaloriesAsync(Guid userId, DateTime startDate, DateTime endDate)
        {
            var start = DateOnly.FromDateTime(startDate);
            var end = DateOnly.FromDateTime(endDate);
            var result = await _context.MealDiaries
                .Where(md => md.UserId == userId && !md.IsDeleted && md.EatenDate >= start && md.EatenDate <= end)
                .SumAsync(md => md.Calories);
            return result;
        }

        public async Task<decimal> GetTotalProteinAsync(Guid userId, DateTime startDate, DateTime endDate)
        {
            var start = DateOnly.FromDateTime(startDate);
            var end = DateOnly.FromDateTime(endDate);
            var result = await _context.MealDiaries
                .Where(md => md.UserId == userId && !md.IsDeleted && md.EatenDate >= start && md.EatenDate <= end)
                .SumAsync(md => md.Protein);
            return result;
        }

        public async Task<decimal> GetTotalCarbsAsync(Guid userId, DateTime startDate, DateTime endDate)
        {
            var start = DateOnly.FromDateTime(startDate);
            var end = DateOnly.FromDateTime(endDate);
            var result = await _context.MealDiaries
                .Where(md => md.UserId == userId && !md.IsDeleted && md.EatenDate >= start && md.EatenDate <= end)
                .SumAsync(md => md.Carb);
            return result;
        }

        public async Task<decimal> GetTotalFatAsync(Guid userId, DateTime startDate, DateTime endDate)
        {
            var start = DateOnly.FromDateTime(startDate);
            var end = DateOnly.FromDateTime(endDate);
            var result = await _context.MealDiaries
                .Where(md => md.UserId == userId && !md.IsDeleted && md.EatenDate >= start && md.EatenDate <= end)
                .SumAsync(md => md.Fat);
            return result;
        }

        public async Task<Dictionary<string, decimal>> GetCaloriesByMealTypeAsync(Guid userId, DateTime startDate, DateTime endDate)
        {
            var start = DateOnly.FromDateTime(startDate);
            var end = DateOnly.FromDateTime(endDate);
            var result = await _context.MealDiaries
                .Where(md => md.UserId == userId && !md.IsDeleted && md.EatenDate >= start && md.EatenDate <= end)
                .Include(md => md.MealType)
                .GroupBy(md => md.MealType!.Name)
                .Select(g => new { MealType = g.Key, TotalCalories = g.Sum(md => md.Calories) })
                .ToListAsync();

            return result.ToDictionary(x => x.MealType, x => x.TotalCalories);
        }

        public async Task<Dictionary<DateTime, decimal>> GetDailyCaloriesAsync(Guid userId, DateTime startDate, DateTime endDate)
        {
            var start = DateOnly.FromDateTime(startDate);
            var end = DateOnly.FromDateTime(endDate);
            var result = await _context.MealDiaries
                .Where(md => md.UserId == userId && !md.IsDeleted && md.EatenDate >= start && md.EatenDate <= end)
                .GroupBy(md => md.EatenDate)
                .Select(g => new { Date = g.Key, TotalCalories = g.Sum(md => md.Calories) })
                .ToListAsync();

            return result.ToDictionary(x => x.Date.ToDateTime(TimeOnly.MinValue), x => x.TotalCalories);
        }
    }
}
