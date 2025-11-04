using EatFitAI.API.DTOs.Food;

namespace EatFitAI.API.Services.Interfaces
{
    public interface IUserFoodItemService
    {
        Task<(IEnumerable<UserFoodItemDto> Items, int Total)> ListAsync(Guid userId, string? search, int page, int pageSize);
        Task<UserFoodItemDto> GetAsync(Guid userId, int id);
        Task<UserFoodItemDto> CreateAsync(Guid userId, CreateUserFoodItemRequest request, string? uploadsRoot);
        Task<UserFoodItemDto> UpdateAsync(Guid userId, int id, UpdateUserFoodItemRequest request, string? uploadsRoot);
        Task DeleteAsync(Guid userId, int id);
    }
}

