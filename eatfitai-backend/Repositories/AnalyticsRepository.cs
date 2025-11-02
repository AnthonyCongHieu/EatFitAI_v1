using EatFitAI.API.Data;
using EatFitAI.API.Models;
using EatFitAI.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Repositories
{
    public class AnalyticsRepository : BaseRepository<MealDiary>, IAnalyticsRepository
    {
        public AnalyticsRepository(ApplicationDbContext context) : base(context)
        {
        }

        public async Task<decimal> GetTotalCaloriesAsync(Guid userId, DateTime startDate, DateTime endDate)
        {
            var result = await _context.MealDiaries
                .Where(md => md.UserId == userId && !md.IsDeleted &&
                            md.EatenDate.Date >= startDate.Date && md.EatenDate.Date <= endDate.Date)
                .SumAsync(md => md.Calories);
            return result;
        }

        public async Task<decimal> GetTotalProteinAsync(Guid userId, DateTime startDate, DateTime endDate)
        {
            var result = await _context.MealDiaries
                .Where(md => md.UserId == userId && !md.IsDeleted &&
                            md.EatenDate.Date >= startDate.Date && md.EatenDate.Date <= endDate.Date)
                .SumAsync(md => md.Protein);
            return result;
        }

        public async Task<decimal> GetTotalCarbsAsync(Guid userId, DateTime startDate, DateTime endDate)
        {
            var result = await _context.MealDiaries
                .Where(md => md.UserId == userId && !md.IsDeleted &&
                            md.EatenDate.Date >= startDate.Date && md.EatenDate.Date <= endDate.Date)
                .SumAsync(md => md.Carb);
            return result;
        }

        public async Task<decimal> GetTotalFatAsync(Guid userId, DateTime startDate, DateTime endDate)
        {
            var result = await _context.MealDiaries
                .Where(md => md.UserId == userId && !md.IsDeleted &&
                            md.EatenDate.Date >= startDate.Date && md.EatenDate.Date <= endDate.Date)
                .SumAsync(md => md.Fat);
            return result;
        }

        public async Task<Dictionary<string, decimal>> GetCaloriesByMealTypeAsync(Guid userId, DateTime startDate, DateTime endDate)
        {
            var result = await _context.MealDiaries
                .Where(md => md.UserId == userId && !md.IsDeleted &&
                            md.EatenDate.Date >= startDate.Date && md.EatenDate.Date <= endDate.Date)
                .Include(md => md.MealType)
                .GroupBy(md => md.MealType!.Name)
                .Select(g => new { MealType = g.Key, TotalCalories = g.Sum(md => md.Calories) })
                .ToListAsync();

            return result.ToDictionary(x => x.MealType, x => x.TotalCalories);
        }

        public async Task<Dictionary<DateTime, decimal>> GetDailyCaloriesAsync(Guid userId, DateTime startDate, DateTime endDate)
        {
            var result = await _context.MealDiaries
                .Where(md => md.UserId == userId && !md.IsDeleted &&
                            md.EatenDate.Date >= startDate.Date && md.EatenDate.Date <= endDate.Date)
                .GroupBy(md => md.EatenDate.Date)
                .Select(g => new { Date = g.Key, TotalCalories = g.Sum(md => md.Calories) })
                .ToListAsync();

            return result.ToDictionary(x => x.Date, x => x.TotalCalories);
        }
    }
}