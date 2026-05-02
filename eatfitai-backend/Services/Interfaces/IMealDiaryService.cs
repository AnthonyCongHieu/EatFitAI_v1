using EatFitAI.API.DTOs.MealDiary;

namespace EatFitAI.API.Services.Interfaces
{
    public interface IMealDiaryService
    {
        Task<IEnumerable<MealDiaryDto>> GetUserMealDiariesAsync(Guid userId, DateTime? date = null);
        Task<MealDiaryDto> GetMealDiaryByIdAsync(int id, Guid userId);
        Task<MealDiaryDto> CreateMealDiaryAsync(Guid userId, CreateMealDiaryRequest request);
        Task<IEnumerable<MealDiaryDto>> CreateMealDiariesAsync(Guid userId, BulkCreateMealDiaryRequest request);
        Task<IEnumerable<MealDiaryDto>> CopyPreviousDayAsync(Guid userId, CopyPreviousDayRequest request);
        Task<MealDiaryDto> UpdateMealDiaryAsync(int id, Guid userId, UpdateMealDiaryRequest request);
        Task DeleteMealDiaryAsync(int id, Guid userId);
    }
}
