using EatFitAI.API.DTOs.Analytics;
using EatFitAI.API.DTOs.MealDiary;
using EatFitAI.API.DTOs;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services.Interfaces;
using EatFitAI.API.DbScaffold.Data;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services
{
    public class AnalyticsService : IAnalyticsService
    {
        private readonly IAnalyticsRepository _analyticsRepository;
        private readonly IMealDiaryService _mealDiaryService;
        private readonly EatFitAIDbContext _dbContext;
        private readonly AIReviewService _aiReviewService;

        public AnalyticsService(
            IAnalyticsRepository analyticsRepository,
            IMealDiaryService mealDiaryService,
            EatFitAIDbContext dbContext,
            AIReviewService aiReviewService)
        {
            _analyticsRepository = analyticsRepository;
            _mealDiaryService = mealDiaryService;
            _dbContext = dbContext;
            _aiReviewService = aiReviewService;
        }

        public async Task<NutritionSummaryDto> GetNutritionSummaryAsync(Guid userId, DateTime startDate, DateTime endDate)
        {
            var totalCalories = await _analyticsRepository.GetTotalCaloriesAsync(userId, startDate, endDate);
            var totalProtein = await _analyticsRepository.GetTotalProteinAsync(userId, startDate, endDate);
            var totalCarbs = await _analyticsRepository.GetTotalCarbsAsync(userId, startDate, endDate);
            var totalFat = await _analyticsRepository.GetTotalFatAsync(userId, startDate, endDate);
            var caloriesByMealType = await _analyticsRepository.GetCaloriesByMealTypeAsync(userId, startDate, endDate);
            var dailyCalories = await _analyticsRepository.GetDailyCaloriesAsync(userId, startDate, endDate);

            return new NutritionSummaryDto
            {
                TotalCalories = totalCalories,
                TotalProtein = totalProtein,
                TotalCarbs = totalCarbs,
                TotalFat = totalFat,
                CaloriesByMealType = caloriesByMealType,
                DailyCalories = dailyCalories.ToDictionary(
                    kvp => kvp.Key.ToString("yyyy-MM-dd"),
                    kvp => kvp.Value)
            };
        }

        public async Task<NutritionSummaryDto> GetDaySummaryAsync(Guid userId, DateTime date)
        {
            var startDate = date.Date;
            var endDate = startDate.AddDays(1).AddTicks(-1);
            return await GetNutritionSummaryAsync(userId, startDate, endDate);
        }

        public async Task<NutritionSummaryDto> GetWeekSummaryAsync(Guid userId, DateTime date)
        {
            // Tính start of week từ Thứ 2 (Monday) - phù hợp với chuẩn Việt Nam và frontend
            var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
            var startOfWeek = date.Date.AddDays(-diff);
            var endOfWeek = startOfWeek.AddDays(7).AddTicks(-1);
            return await GetNutritionSummaryAsync(userId, startOfWeek, endOfWeek);
        }

        public async Task<DaySummaryDto> GetDaySummaryWithMealsAsync(Guid userId, DateTime date)
        {
            var startDate = date.Date;
            var endDate = startDate.AddDays(1).AddTicks(-1);

            // Get nutrition summary
            var summary = await GetDaySummaryAsync(userId, date);

            // Get target calories and macros from NutritionTarget table
            // Default values based on standard nutrition guidelines for adults
            int targetCalories = 2000;  // Default 2000 kcal/day
            int targetProtein = 50;     // Default 50g protein/day
            int targetCarbs = 250;      // Default 250g carbs/day
            int targetFat = 65;         // Default 65g fat/day
            try
            {
                var d = DateOnly.FromDateTime(date.Date);
                var nutritionTarget = await _dbContext.NutritionTargets
                    .Where(t => t.UserId == userId && t.EffectiveFrom <= d && (t.EffectiveTo == null || t.EffectiveTo >= d))
                    .OrderByDescending(t => t.EffectiveFrom)
                    .ThenByDescending(t => t.NutritionTargetId) // Lấy record mới nhất nếu cùng ngày
                    .FirstOrDefaultAsync();
                
                // CHỈ sử dụng giá trị từ DB nếu record tồn tại VÀ có giá trị khác 0
                if (nutritionTarget != null && nutritionTarget.TargetCalories > 0)
                {
                    targetCalories = nutritionTarget.TargetCalories;
                    targetProtein = nutritionTarget.TargetProtein > 0 ? nutritionTarget.TargetProtein : targetProtein;
                    targetCarbs = nutritionTarget.TargetCarb > 0 ? nutritionTarget.TargetCarb : targetCarbs;
                    targetFat = nutritionTarget.TargetFat > 0 ? nutritionTarget.TargetFat : targetFat;
                }
            }
            catch { /* ignore target lookup errors, use defaults */ }


            // Get meal diary entries for the day
            var mealEntries = await _mealDiaryService.GetUserMealDiariesAsync(userId, date);

            // Group entries by meal type
            var mealGroups = mealEntries
                .GroupBy(m => new { m.MealTypeId, m.MealTypeName })
                .Select(g => new MealGroupDto
                {
                    MealTypeId = g.Key.MealTypeId,
                    MealTypeName = g.Key.MealTypeName,
                    TotalCalories = g.Sum(m => m.Calories),
                    Protein = g.Sum(m => m.Protein),
                    Carbs = g.Sum(m => m.Carb), // Note: DTO uses Carb (singular)
                    Fat = g.Sum(m => m.Fat),
                    Entries = g.ToList()
                })
                .OrderBy(g => g.MealTypeId)
                .ToList();

            return new DaySummaryDto
            {
                Date = date,
                TotalCalories = summary.TotalCalories,
                TargetCalories = targetCalories,
                TotalProtein = summary.TotalProtein,
                TotalCarbs = summary.TotalCarbs,
                TotalFat = summary.TotalFat,
                // Target macros để hiển thị consumed/target
                TargetProtein = targetProtein,
                TargetCarbs = targetCarbs,
                TargetFat = targetFat,
                CaloriesByMealType = summary.CaloriesByMealType,
                Meals = mealGroups
            };
        }

        public Task<WeeklyReviewDto> GetWeeklyReviewAsync(Guid userId)
        {
            return _aiReviewService.AnalyzeWeeklyProgress(userId);
        }
    }
}
