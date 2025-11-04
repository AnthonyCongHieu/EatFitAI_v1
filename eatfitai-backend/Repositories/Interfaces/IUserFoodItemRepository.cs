using EatFitAI.API.DbScaffold.Models;

namespace EatFitAI.API.Repositories.Interfaces
{
    public interface IUserFoodItemRepository : IRepository<UserFoodItem>
    {
        Task<IEnumerable<UserFoodItem>> SearchByUserAsync(Guid userId, string? search, int skip, int take);
        Task<int> CountByUserAsync(Guid userId, string? search);
        Task<UserFoodItem?> GetByIdForUserAsync(Guid userId, int id);
    }
}

