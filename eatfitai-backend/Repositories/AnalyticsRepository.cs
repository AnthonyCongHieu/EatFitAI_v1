using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.Analytics;
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

        public async Task<NutritionSummaryDto> GetNutritionSummaryAsync(Guid userId, DateTime startDate, DateTime endDate)
        {
            var start = DateOnly.FromDateTime(startDate);
            var end = DateOnly.FromDateTime(endDate);
            var query = _context.MealDiaries
                .AsNoTracking()
                .Where(md => md.UserId == userId && !md.IsDeleted && md.EatenDate >= start && md.EatenDate <= end);

            var totals = await query
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    TotalCalories = g.Sum(md => md.Calories),
                    TotalProtein = g.Sum(md => md.Protein),
                    TotalCarbs = g.Sum(md => md.Carb),
                    TotalFat = g.Sum(md => md.Fat),
                })
                .FirstOrDefaultAsync();

            var caloriesByMealType = await query
                .GroupBy(md => md.MealType.Name)
                .Select(g => new
                {
                    MealType = g.Key,
                    TotalCalories = g.Sum(md => md.Calories),
                })
                .ToListAsync();

            var dailyCalories = await query
                .GroupBy(md => md.EatenDate)
                .Select(g => new
                {
                    Date = g.Key,
                    TotalCalories = g.Sum(md => md.Calories),
                })
                .ToListAsync();

            return new NutritionSummaryDto
            {
                TotalCalories = totals?.TotalCalories ?? 0,
                TotalProtein = totals?.TotalProtein ?? 0,
                TotalCarbs = totals?.TotalCarbs ?? 0,
                TotalFat = totals?.TotalFat ?? 0,
                CaloriesByMealType = caloriesByMealType.ToDictionary(
                    item => item.MealType,
                    item => item.TotalCalories),
                DailyCalories = dailyCalories.ToDictionary(
                    item => item.Date.ToString("yyyy-MM-dd"),
                    item => item.TotalCalories),
            };
        }
    }
}
