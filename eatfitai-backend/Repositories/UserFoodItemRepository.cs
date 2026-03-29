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
                var normalizedSearch = search.Trim();

                if (!_context.Database.IsSqlServer())
                {
                    var items = await query.ToListAsync();
                    return items
                        .Where(x => MatchesSearch(x.FoodName, normalizedSearch))
                        .OrderByDescending(x => StartsWithNormalized(x.FoodName, normalizedSearch))
                        .ThenBy(x => x.FoodName)
                        .Skip(skip)
                        .Take(take)
                        .ToList();
                }

                var containsPattern = BuildContainsPattern(normalizedSearch);
                var startsWithPattern = BuildStartsWithPattern(normalizedSearch);

                query = query
                    .Select(x => new
                    {
                        Item = x,
                        FoodName = EF.Functions.Collate(x.FoodName, AccentInsensitiveCollation),
                    })
                    .Where(x => EF.Functions.Like(x.FoodName, containsPattern))
                    .OrderByDescending(x => x.FoodName == normalizedSearch)
                    .ThenByDescending(x => EF.Functions.Like(x.FoodName, startsWithPattern))
                    .ThenBy(x => x.Item.FoodName)
                    .Select(x => x.Item);
            }
            else
            {
                query = query.OrderBy(x => x.FoodName);
            }

            return await query
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
                var normalizedSearch = search.Trim();

                if (!_context.Database.IsSqlServer())
                {
                    var items = await query.ToListAsync();
                    return items.Count(x => MatchesSearch(x.FoodName, normalizedSearch));
                }

                var containsPattern = BuildContainsPattern(normalizedSearch);

                query = query.Where(x =>
                    EF.Functions.Like(
                        EF.Functions.Collate(x.FoodName, AccentInsensitiveCollation),
                        containsPattern));
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
