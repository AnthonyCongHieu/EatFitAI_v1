using EatFitAI.API.DTOs.Food;
using EatFitAI.API.DTOs.MealDiary;

namespace EatFitAI.API.Services.Interfaces
{
    public interface ICustomDishService
    {
        Task<IEnumerable<CustomDishSummaryDto>> GetCustomDishesAsync(Guid userId);
        Task<CustomDishResponseDto> GetCustomDishAsync(Guid userId, int userDishId);
        Task<CustomDishResponseDto> CreateCustomDishAsync(Guid userId, CustomDishDto customDishDto);
        Task<CustomDishResponseDto> UpdateCustomDishAsync(Guid userId, int userDishId, CustomDishDto customDishDto);
        Task DeleteCustomDishAsync(Guid userId, int userDishId);
        Task<MealDiaryDto> ApplyCustomDishAsync(Guid userId, int userDishId, ApplyCustomDishRequest request);
    }
}
