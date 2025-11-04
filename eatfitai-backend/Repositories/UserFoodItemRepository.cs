using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Repositories
{
    public class UserFoodItemRepository : BaseRepository<UserFoodItem>, IUserFoodItemRepository
    {
        public UserFoodItemRepository(EatFitAIDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<UserFoodItem>> SearchByUserAsync(Guid userId, string? search, int skip, int take)
        {
            var query = _context.UserFoodItems
                .Where(x => x.UserId == userId && !x.IsDeleted);

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(x => EF.Functions.Like(x.FoodName, $"%{search}%"));
            }

            return await query
                .OrderBy(x => x.FoodName)
                .Skip(skip)
                .Take(take)
                .ToListAsync();
        }

        public async Task<int> CountByUserAsync(Guid userId, string? search)
        {
            var query = _context.UserFoodItems
                .Where(x => x.UserId == userId && !x.IsDeleted);

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(x => EF.Functions.Like(x.FoodName, $"%{search}%"));
            }

            return await query.CountAsync();
        }

        public async Task<UserFoodItem?> GetByIdForUserAsync(Guid userId, int id)
        {
            return await _context.UserFoodItems
                .FirstOrDefaultAsync(x => x.UserFoodItemId == id && x.UserId == userId && !x.IsDeleted);
        }
    }
}

