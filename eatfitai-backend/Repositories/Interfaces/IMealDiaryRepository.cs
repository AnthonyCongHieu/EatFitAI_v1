using EatFitAI.API.Models;

namespace EatFitAI.API.Repositories.Interfaces
{
    public interface IMealDiaryRepository : IRepository<MealDiary>
    {
        Task<IEnumerable<MealDiary>> GetByUserIdAsync(Guid userId, DateTime? date = null);
        Task<IEnumerable<MealDiary>> GetByDateRangeAsync(Guid userId, DateTime startDate, DateTime endDate);
        Task<MealDiary?> GetByIdWithIncludesAsync(int id);
    }
}