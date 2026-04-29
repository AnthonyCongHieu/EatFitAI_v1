using System.Globalization;
using System.Text;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Repositories
{
    public class FoodItemRepository : BaseRepository<FoodItem>, IFoodItemRepository
    {
        private const string AccentInsensitiveCollation = "Latin1_General_100_CI_AI";

        public FoodItemRepository(EatFitAIDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<FoodItem>> SearchByNameAsync(string searchTerm, int skip = 0, int limit = 50)
        {
            var rawSearch = searchTerm.Trim();
            var unsignedSearch = NormalizeForSearch(rawSearch);
            
            var rawPattern = $"%{rawSearch}%";
            var unsignedPattern = $"%{unsignedSearch}%";

            if (_context.Database.IsInMemory())
            {
                var items = await _context.FoodItems
                    .Where(fi => fi.IsActive && !fi.IsDeleted)
                    .ToListAsync();

                return items
                    .Where(fi => fi.FoodName.Contains(rawSearch, StringComparison.OrdinalIgnoreCase) ||
                                 (fi.FoodNameEn != null && fi.FoodNameEn.Contains(rawSearch, StringComparison.OrdinalIgnoreCase)) ||
                                 NormalizeForSearch(fi.FoodName).Contains(unsignedSearch, StringComparison.OrdinalIgnoreCase))
                    .OrderBy(fi => fi.FoodName)
                    .Skip(skip)
                    .Take(limit)
                    .ToList();
            }

            return await _context.FoodItems
                .Where(fi => fi.IsActive && !fi.IsDeleted)
                .Where(fi => EF.Functions.ILike(fi.FoodName, rawPattern) ||
                             (fi.FoodNameEn != null && EF.Functions.ILike(fi.FoodNameEn, rawPattern)) ||
                             (fi.FoodNameUnsigned != null && EF.Functions.ILike(fi.FoodNameUnsigned, unsignedPattern)))
                .OrderBy(fi => fi.FoodName)
                .Skip(skip)
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
