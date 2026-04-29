using System.Globalization;
using System.Text;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Repositories
{
    public class UserFoodItemRepository : BaseRepository<UserFoodItem>, IUserFoodItemRepository
    {
        private const string AccentInsensitiveCollation = "Latin1_General_100_CI_AI";

        public UserFoodItemRepository(EatFitAIDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<UserFoodItem>> SearchByUserAsync(Guid userId, string? search, int skip, int take)
        {
            var query = _context.UserFoodItems
                .Where(x => x.UserId == userId && !x.IsDeleted);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var rawSearch = search.Trim();
                var unsignedSearch = NormalizeForSearch(rawSearch);
                
                var rawPattern = $"%{rawSearch}%";
                var unsignedPattern = $"%{unsignedSearch}%";

                if (_context.Database.IsInMemory())
                {
                    var items = await query.ToListAsync();
                    return items
                        .Where(x => x.FoodName.Contains(rawSearch, StringComparison.OrdinalIgnoreCase) ||
                                    NormalizeForSearch(x.FoodName).Contains(unsignedSearch, StringComparison.OrdinalIgnoreCase))
                        .OrderBy(x => x.FoodName)
                        .Skip(skip)
                        .Take(take)
                        .ToList();
                }

                // Server-side search with ILike
                query = query.Where(x => EF.Functions.ILike(x.FoodName, rawPattern));
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
                var rawSearch = search.Trim();
                var unsignedSearch = NormalizeForSearch(rawSearch);
                
                var rawPattern = $"%{rawSearch}%";
                var unsignedPattern = $"%{unsignedSearch}%";

                if (_context.Database.IsInMemory())
                {
                    var items = await query.ToListAsync();
                    return items.Count(x => x.FoodName.Contains(rawSearch, StringComparison.OrdinalIgnoreCase));
                }

                query = query.Where(x => EF.Functions.ILike(x.FoodName, rawPattern));
            }

            return await query.CountAsync();
        }

        public async Task<UserFoodItem?> GetByIdForUserAsync(Guid userId, int id)
        {
            return await _context.UserFoodItems
                .FirstOrDefaultAsync(x => x.UserFoodItemId == id && x.UserId == userId && !x.IsDeleted);
        }

        /// <summary>
        /// Tìm UserFoodItem theo UserId và FoodName (bao gồm cả đã xóa mềm để có thể khôi phục)
        /// </summary>
        public async Task<UserFoodItem?> GetByUserAndNameAsync(Guid userId, string foodName)
        {
            return await _context.UserFoodItems
                .FirstOrDefaultAsync(x => x.UserId == userId && x.FoodName == foodName);
        }

        private static string NormalizeForSearch(string value)
        {
            var normalized = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(normalized.Length);

            foreach (var character in normalized)
            {
                var category = CharUnicodeInfo.GetUnicodeCategory(character);
                if (category == UnicodeCategory.NonSpacingMark)
                {
                    continue;
                }

                builder.Append(character switch
                {
                    '\u0111' => 'd',
                    '\u0110' => 'd',
                    _ => character,
                });
            }

            return builder.ToString().Normalize(NormalizationForm.FormC);
        }
    }
}
