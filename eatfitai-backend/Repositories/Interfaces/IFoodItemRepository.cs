using EatFitAI.API.DbScaffold.Models;

namespace EatFitAI.API.Repositories.Interfaces
{
    public interface IFoodItemRepository : IRepository<FoodItem>
    {
        Task<IEnumerable<FoodItem>> SearchByNameAsync(string searchTerm, int limit = 50);
        Task<IEnumerable<FoodItem>> GetActiveAsync();
        Task<(FoodItem? FoodItem, IEnumerable<FoodServing> Servings)> GetByIdWithServingsAsync(int id);
    }
}
