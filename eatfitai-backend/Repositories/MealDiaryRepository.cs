using EatFitAI.API.Data;
using EatFitAI.API.Models;
using EatFitAI.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Repositories
{
    public class MealDiaryRepository : BaseRepository<MealDiary>, IMealDiaryRepository
    {
        public MealDiaryRepository(ApplicationDbContext context) : base(context)
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
                query = query.Where(md => md.EatenDate.Date == date.Value.Date);
            }

            return await query.OrderByDescending(md => md.EatenDate).ToListAsync();
        }

        public async Task<IEnumerable<MealDiary>> GetByDateRangeAsync(Guid userId, DateTime startDate, DateTime endDate)
        {
            return await _context.MealDiaries
                .Where(md => md.UserId == userId && !md.IsDeleted &&
                            md.EatenDate.Date >= startDate.Date && md.EatenDate.Date <= endDate.Date)
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