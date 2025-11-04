using EatFitAI.API.DTOs.Food;

namespace EatFitAI.API.Services.Interfaces
{
    public interface IFoodService
    {
        Task<IEnumerable<FoodItemDto>> SearchFoodItemsAsync(string searchTerm, int limit = 50);
        Task<(FoodItemDto FoodItem, IEnumerable<FoodServingDto> Servings)> GetFoodItemWithServingsAsync(int id);
        Task<CustomDishResponseDto> CreateCustomDishAsync(Guid userId, CustomDishDto customDishDto);
        Task<IEnumerable<FoodSearchResultDto>> SearchAllAsync(string searchTerm, Guid? userId, int limit = 50);
    }
}
