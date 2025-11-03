using EatFitAI.API.DbScaffold.Models;

namespace EatFitAI.API.Repositories.Interfaces
{
    public interface IAnalyticsRepository : IRepository<MealDiary>
    {
        Task<decimal> GetTotalCaloriesAsync(Guid userId, DateTime startDate, DateTime endDate);
        Task<decimal> GetTotalProteinAsync(Guid userId, DateTime startDate, DateTime endDate);
        Task<decimal> GetTotalCarbsAsync(Guid userId, DateTime startDate, DateTime endDate);
        Task<decimal> GetTotalFatAsync(Guid userId, DateTime startDate, DateTime endDate);
        Task<Dictionary<string, decimal>> GetCaloriesByMealTypeAsync(Guid userId, DateTime startDate, DateTime endDate);
        Task<Dictionary<DateTime, decimal>> GetDailyCaloriesAsync(Guid userId, DateTime startDate, DateTime endDate);
    }
}
