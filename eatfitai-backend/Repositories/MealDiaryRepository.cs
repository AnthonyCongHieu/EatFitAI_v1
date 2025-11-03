using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Repositories
{
    public class MealDiaryRepository : BaseRepository<MealDiary>, IMealDiaryRepository
    {
        public MealDiaryRepository(EatFitAIDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<MealDiary>> GetByUserIdAsync(Guid userId, DateTime? date = null)
        {
            var query = _context.MealDiaries
                .Where(md => md.UserId == userId && !md.IsDeleted)
                .Include(md => md.FoodItem)
                .Include(md => md.UserDish)
                .Include(md => md.Recipe)
                .Include(md => md.ServingUnit)
                .Include(md => md.MealType)
                .AsQueryable();

            if (date.HasValue)
            {
                var dateOnly = DateOnly.FromDateTime(date.Value);
                query = query.Where(md => md.EatenDate == dateOnly);
            }

            return await query.OrderByDescending(md => md.EatenDate).ToListAsync();
        }

        public async Task<IEnumerable<MealDiary>> GetByDateRangeAsync(Guid userId, DateTime startDate, DateTime endDate)
        {
            var start = DateOnly.FromDateTime(startDate);
            var end = DateOnly.FromDateTime(endDate);
            return await _context.MealDiaries
                .Where(md => md.UserId == userId && !md.IsDeleted &&
                            md.EatenDate >= start && md.EatenDate <= end)
                .Include(md => md.FoodItem)
                .Include(md => md.UserDish)
                .Include(md => md.Recipe)
                .Include(md => md.ServingUnit)
                .Include(md => md.MealType)
                .OrderByDescending(md => md.EatenDate)
                .ToListAsync();
        }

        public async Task<MealDiary?> GetByIdWithIncludesAsync(int id)
        {
            return await _context.MealDiaries
                .Include(md => md.FoodItem)
                .Include(md => md.UserDish)
                .Include(md => md.Recipe)
                .Include(md => md.ServingUnit)
                .Include(md => md.MealType)
                .FirstOrDefaultAsync(md => md.MealDiaryId == id && !md.IsDeleted);
        }
    }
}
