using EatFitAI.API.DTOs.Analytics;

namespace EatFitAI.API.Services.Interfaces
{
    public interface IAnalyticsService
    {
        Task<NutritionSummaryDto> GetNutritionSummaryAsync(Guid userId, DateTime startDate, DateTime endDate);
    }
}