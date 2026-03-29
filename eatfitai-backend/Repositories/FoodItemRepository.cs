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

        public async Task<IEnumerable<FoodItem>> SearchByNameAsync(string searchTerm, int limit = 50)
        {
            var normalizedSearchTerm = searchTerm.Trim();

            if (!_context.Database.IsSqlServer())
            {
                var items = await _context.FoodItems
                    .Where(fi => fi.IsActive && !fi.IsDeleted)
                    .ToListAsync();

                return items
                    .Where(fi =>
                        MatchesSearch(fi.FoodName, normalizedSearchTerm) ||
                        MatchesSearch(fi.FoodNameEn, normalizedSearchTerm) ||
                        MatchesSearch(fi.FoodNameUnsigned, normalizedSearchTerm))
                    .OrderByDescending(fi => StartsWithNormalized(fi.FoodName, normalizedSearchTerm))
                    .ThenByDescending(fi => StartsWithNormalized(fi.FoodNameEn, normalizedSearchTerm))
                    .ThenByDescending(fi => StartsWithNormalized(fi.FoodNameUnsigned, normalizedSearchTerm))
                    .ThenBy(fi => fi.FoodName)
                    .Take(limit)
                    .ToList();
            }

            var containsPattern = BuildContainsPattern(normalizedSearchTerm);
            var startsWithPattern = BuildStartsWithPattern(normalizedSearchTerm);

            return await _context.FoodItems
                .Where(fi => fi.IsActive && !fi.IsDeleted)
                .Select(fi => new
                {
                    FoodItem = fi,
                    FoodName = EF.Functions.Collate(fi.FoodName, AccentInsensitiveCollation),
                    FoodNameEn = EF.Functions.Collate(fi.FoodNameEn ?? string.Empty, AccentInsensitiveCollation),
                    FoodNameUnsigned = EF.Functions.Collate(fi.FoodNameUnsigned ?? string.Empty, AccentInsensitiveCollation),
                })
                .Where(x =>
                    EF.Functions.Like(x.FoodName, containsPattern) ||
                    EF.Functions.Like(x.FoodNameEn, containsPattern) ||
                    EF.Functions.Like(x.FoodNameUnsigned, containsPattern))
                .OrderByDescending(x => x.FoodName == normalizedSearchTerm)
                .ThenByDescending(x => x.FoodNameEn == normalizedSearchTerm)
                .ThenByDescending(x => x.FoodNameUnsigned == normalizedSearchTerm)
                .ThenByDescending(x => EF.Functions.Like(x.FoodName, startsWithPattern))
                .ThenByDescending(x => EF.Functions.Like(x.FoodNameEn, startsWithPattern))
                .ThenByDescending(x => EF.Functions.Like(x.FoodNameUnsigned, startsWithPattern))
                .ThenBy(x => x.FoodItem.FoodName)
                .Select(x => x.FoodItem)
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

        private static string BuildContainsPattern(string searchTerm)
        {
            return $"%{EscapeLikeValue(searchTerm)}%";
        }

        private static string BuildStartsWithPattern(string searchTerm)
        {
            return $"{EscapeLikeValue(searchTerm)}%";
        }

        private static string EscapeLikeValue(string value)
        {
            return value
                .Replace("[", "[[]", StringComparison.Ordinal)
                .Replace("%", "[%]", StringComparison.Ordinal)
                .Replace("_", "[_]", StringComparison.Ordinal);
        }

        private static bool MatchesSearch(string? candidate, string searchTerm)
        {
            if (string.IsNullOrWhiteSpace(candidate))
            {
                return false;
            }

            return NormalizeForSearch(candidate).Contains(
                NormalizeForSearch(searchTerm),
                StringComparison.Ordinal);
        }

        private static bool StartsWithNormalized(string? candidate, string searchTerm)
        {
            if (string.IsNullOrWhiteSpace(candidate))
            {
                return false;
            }

            return NormalizeForSearch(candidate).StartsWith(
                NormalizeForSearch(searchTerm),
                StringComparison.Ordinal);
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
