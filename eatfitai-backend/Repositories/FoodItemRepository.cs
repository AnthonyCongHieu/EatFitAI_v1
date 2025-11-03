using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Repositories
{
    public class FoodItemRepository : BaseRepository<FoodItem>, IFoodItemRepository
    {
        public FoodItemRepository(EatFitAIDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<FoodItem>> SearchByNameAsync(string searchTerm, int limit = 50)
        {
            return await _context.FoodItems
                .Where(fi => fi.IsActive && !fi.IsDeleted &&
                            EF.Functions.Like(fi.FoodName, $"%{searchTerm}%"))
                .OrderBy(fi => fi.FoodName)
                .Take(limit)
                .ToListAsync();
        }

        public async Task<IEnumerable<FoodItem>> GetActiveAsync()
        {
            return await _context.FoodItems
                .Where(fi => fi.IsActive && !fi.IsDeleted)
                .OrderBy(fi => fi.FoodName)
                .ToListAsync();
        }

        public async Task<(FoodItem? FoodItem, IEnumerable<FoodServing> Servings)> GetByIdWithServingsAsync(int id)
        {
            var foodItem = await _context.FoodItems
                .FirstOrDefaultAsync(fi => fi.FoodItemId == id && fi.IsActive && !fi.IsDeleted);

            var foodServings = await _context.FoodServings
                .Where(fs => fs.FoodItemId == id)
                .Include(fs => fs.ServingUnit)
                .ToListAsync();

            return (foodItem, foodServings);
        }
    }
}
