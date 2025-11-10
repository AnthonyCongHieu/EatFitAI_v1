using EatFitAI.API.DTOs.Analytics;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services.Interfaces;

namespace EatFitAI.API.Services
{
    public class AnalyticsService : IAnalyticsService
    {
        private readonly IAnalyticsRepository _analyticsRepository;

        public AnalyticsService(IAnalyticsRepository analyticsRepository)
        {
            _analyticsRepository = analyticsRepository;
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
            var startOfWeek = date.Date.AddDays(-(int)date.DayOfWeek);
            var endOfWeek = startOfWeek.AddDays(7).AddTicks(-1);
            return await GetNutritionSummaryAsync(userId, startOfWeek, endOfWeek);
        }
    }
}
