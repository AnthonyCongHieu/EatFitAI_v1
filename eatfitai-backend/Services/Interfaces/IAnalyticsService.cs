using EatFitAI.API.DTOs.Analytics;
using EatFitAI.API.DTOs;

namespace EatFitAI.API.Services.Interfaces
{
    public interface IAnalyticsService
    {
        Task<NutritionSummaryDto> GetNutritionSummaryAsync(Guid userId, DateTime startDate, DateTime endDate);
        Task<NutritionSummaryDto> GetDaySummaryAsync(Guid userId, DateTime date);
        Task<NutritionSummaryDto> GetWeekSummaryAsync(Guid userId, DateTime date);
        Task<DaySummaryDto> GetDaySummaryWithMealsAsync(Guid userId, DateTime date);
        Task<WeeklyReviewDto> GetWeeklyReviewAsync(Guid userId);
    }
}
