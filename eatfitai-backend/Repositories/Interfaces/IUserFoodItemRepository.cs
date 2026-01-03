using EatFitAI.API.DbScaffold.Models;

namespace EatFitAI.API.Repositories.Interfaces
{
    public interface IUserFoodItemRepository : IRepository<UserFoodItem>
    {
        Task<IEnumerable<UserFoodItem>> SearchByUserAsync(Guid userId, string? search, int skip, int take);
        Task<int> CountByUserAsync(Guid userId, string? search);
        Task<UserFoodItem?> GetByIdForUserAsync(Guid userId, int id);
        
        /// <summary>
        /// Tìm UserFoodItem theo UserId và FoodName (dùng để kiểm tra trùng lặp)
        /// </summary>
        Task<UserFoodItem?> GetByUserAndNameAsync(Guid userId, string foodName);
    }
}

