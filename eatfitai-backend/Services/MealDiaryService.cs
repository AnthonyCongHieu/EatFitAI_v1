using AutoMapper;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.MealDiary;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services
{
    public class MealDiaryService : IMealDiaryService
    {
        private enum MealDiarySourceKind
        {
            FoodItem,
            UserFoodItem,
            UserDish,
            Recipe
        }

        private readonly IMealDiaryRepository _mealDiaryRepository;
        private readonly EatFitAIDbContext _context;
        private readonly IMapper _mapper;
        private readonly IStreakService _streakService;  // Profile 2026 - Streak tracking

        public MealDiaryService(
            IMealDiaryRepository mealDiaryRepository,
            EatFitAIDbContext context,
            IMapper mapper,
            IStreakService streakService)  // Profile 2026 - Streak tracking
        {
            _mealDiaryRepository = mealDiaryRepository;
            _context = context;
            _mapper = mapper;
            _streakService = streakService;
        }

        public async Task<IEnumerable<MealDiaryDto>> GetUserMealDiariesAsync(Guid userId, DateTime? date = null)
        {
            var mealDiaries = await _mealDiaryRepository.GetByUserIdAsync(userId, date);
            var dtos = _mapper.Map<List<MealDiaryDto>>(mealDiaries);
            await PopulateUserFoodNamesAsync(userId, mealDiaries, dtos);
            return dtos;
        }

        public async Task<MealDiaryDto> GetMealDiaryByIdAsync(int id, Guid userId)
        {
            var mealDiary = await _mealDiaryRepository.GetByIdWithIncludesAsync(id);
            if (mealDiary == null || mealDiary.UserId != userId || mealDiary.IsDeleted)
            {
                throw new KeyNotFoundException("Meal diary entry not found");
            }

            var dto = _mapper.Map<MealDiaryDto>(mealDiary);
            await PopulateUserFoodNamesAsync(userId, new[] { mealDiary }, new[] { dto });
            return dto;
        }

        public async Task<MealDiaryDto> CreateMealDiaryAsync(Guid userId, CreateMealDiaryRequest request)
        {
            var mealDiary = _mapper.Map<MealDiary>(request);
            mealDiary.UserId = userId;
            ApplyExclusiveSource(
                mealDiary,
                request.FoodItemId,
                request.UserFoodItemId,
                request.UserDishId,
                request.RecipeId);
            await ComputeAndAssignMacrosAsync(mealDiary, userId);

            await _mealDiaryRepository.AddAsync(mealDiary);
            await _context.SaveChangesAsync();

            // Update streak sau khi log meal thành công (Profile 2026)
            await _streakService.UpdateStreakOnMealLogAsync(userId);

            // Fetch with includes for the response
            var createdMealDiary = await _mealDiaryRepository.GetByIdWithIncludesAsync(mealDiary.MealDiaryId);
            return _mapper.Map<MealDiaryDto>(createdMealDiary);
        }

        public async Task<MealDiaryDto> UpdateMealDiaryAsync(int id, Guid userId, UpdateMealDiaryRequest request)
        {
            var mealDiary = await _mealDiaryRepository.GetByIdAsync(id);
            if (mealDiary == null || mealDiary.UserId != userId || mealDiary.IsDeleted)
            {
                throw new KeyNotFoundException("Meal diary entry not found");
            }

            // Manual mapping - chỉ update các fields được gửi để tránh FK violation
            // Không dùng AutoMapper vì nullable int bị map thành 0 (default)
            if (request.EatenDate.HasValue)
                mealDiary.EatenDate = DateOnly.FromDateTime(request.EatenDate.Value);
            if (request.MealTypeId.HasValue)
                mealDiary.MealTypeId = request.MealTypeId.Value;
            if (request.FoodItemId.HasValue)
                mealDiary.FoodItemId = request.FoodItemId.Value;
            if (request.UserFoodItemId.HasValue)
                mealDiary.UserFoodItemId = request.UserFoodItemId.Value;
            if (request.UserDishId.HasValue)
                mealDiary.UserDishId = request.UserDishId.Value;
            if (request.RecipeId.HasValue)
                mealDiary.RecipeId = request.RecipeId.Value;
            if (request.ServingUnitId.HasValue)
                mealDiary.ServingUnitId = request.ServingUnitId.Value;
            if (request.PortionQuantity.HasValue)
                mealDiary.PortionQuantity = request.PortionQuantity.Value;
            if (request.Grams.HasValue)
                mealDiary.Grams = request.Grams.Value;
            if (request.Note != null)
                mealDiary.Note = request.Note;
            if (request.PhotoUrl != null)
                mealDiary.PhotoUrl = request.PhotoUrl;
            if (request.SourceMethod != null)
                mealDiary.SourceMethod = request.SourceMethod;

            if (HasAnySourceChange(request))
            {
                ApplyExclusiveSource(
                    mealDiary,
                    request.FoodItemId,
                    request.UserFoodItemId,
                    request.UserDishId,
                    request.RecipeId);
            }
            mealDiary.UpdatedAt = DateTime.UtcNow;

            await ComputeAndAssignMacrosAsync(mealDiary, userId);
            _mealDiaryRepository.Update(mealDiary);
            await _context.SaveChangesAsync();

            // Fetch with includes for the response
            var updatedMealDiary = await _mealDiaryRepository.GetByIdWithIncludesAsync(id);
            return _mapper.Map<MealDiaryDto>(updatedMealDiary);
        }

        public async Task DeleteMealDiaryAsync(int id, Guid userId)
        {
            var providerName = _context.Database.ProviderName ?? string.Empty;
            if (providerName.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
            {
                var utcNow = DateTime.UtcNow;
                var affectedRows = await _context.MealDiaries
                    .Where(mealDiary => mealDiary.MealDiaryId == id && mealDiary.UserId == userId && !mealDiary.IsDeleted)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(mealDiary => mealDiary.IsDeleted, _ => true)
                        .SetProperty(mealDiary => mealDiary.UpdatedAt, _ => utcNow));

                if (affectedRows == 0)
                {
                    throw new KeyNotFoundException("Meal diary entry not found");
                }

                return;
            }

            var mealDiary = await _mealDiaryRepository.GetByIdAsync(id);
            if (mealDiary == null || mealDiary.UserId != userId || mealDiary.IsDeleted)
            {
                throw new KeyNotFoundException("Meal diary entry not found");
            }

            mealDiary.IsDeleted = true;
            mealDiary.UpdatedAt = DateTime.UtcNow;
            _mealDiaryRepository.Update(mealDiary);
            await _context.SaveChangesAsync();
        }

        private static bool HasAnySourceChange(UpdateMealDiaryRequest request)
        {
            return request.FoodItemId.HasValue
                || request.UserFoodItemId.HasValue
                || request.UserDishId.HasValue
                || request.RecipeId.HasValue;
        }

        private static void ApplyExclusiveSource(
            MealDiary mealDiary,
            int? foodItemId,
            int? userFoodItemId,
            int? userDishId,
            int? recipeId)
        {
            var sourceCount = new[]
            {
                foodItemId.HasValue,
                userFoodItemId.HasValue,
                userDishId.HasValue,
                recipeId.HasValue
            }.Count(hasValue => hasValue);

            if (sourceCount != 1)
            {
                throw new ArgumentException("Meal diary must reference exactly one food source");
            }

            mealDiary.FoodItemId = foodItemId;
            mealDiary.UserFoodItemId = userFoodItemId;
            mealDiary.UserDishId = userDishId;
            mealDiary.RecipeId = recipeId;
        }

        private static MealDiarySourceKind? GetSourceKind(MealDiary mealDiary)
        {
            var sourceCount = new[]
            {
                mealDiary.FoodItemId.HasValue,
                mealDiary.UserFoodItemId.HasValue,
                mealDiary.UserDishId.HasValue,
                mealDiary.RecipeId.HasValue
            }.Count(hasValue => hasValue);

            if (sourceCount != 1)
            {
                return null;
            }

            if (mealDiary.UserFoodItemId.HasValue)
            {
                return MealDiarySourceKind.UserFoodItem;
            }

            if (mealDiary.UserDishId.HasValue)
            {
                return MealDiarySourceKind.UserDish;
            }

            if (mealDiary.RecipeId.HasValue)
            {
                return MealDiarySourceKind.Recipe;
            }

            return MealDiarySourceKind.FoodItem;
        }

        private async Task ComputeAndAssignMacrosAsync(MealDiary mealDiary, Guid userId)
        {
            var sourceKind = GetSourceKind(mealDiary);
            if (sourceKind == null)
            {
                throw new InvalidOperationException("Meal diary must reference exactly one food source");
            }

            // Validation: grams phải > 0
            if (mealDiary.Grams <= 0)
            {
                Console.WriteLine($"[MealDiaryService] Warning: grams <= 0 ({mealDiary.Grams}), skipping macro compute");
                return;
            }

            Console.WriteLine($"[MealDiaryService] ComputeAndAssignMacros: entryId={mealDiary.MealDiaryId}, grams={mealDiary.Grams}, source={sourceKind}");

            var grams = mealDiary.Grams;
            var factor = grams / 100m;

            switch (sourceKind)
            {
                case MealDiarySourceKind.UserFoodItem:
                {
                    var ufi = await _context.UserFoodItems
                        .AsNoTracking()
                        .FirstOrDefaultAsync(item =>
                            item.UserFoodItemId == mealDiary.UserFoodItemId!.Value &&
                            item.UserId == userId &&
                            !item.IsDeleted);
                    if (ufi == null)
                    {
                        throw new KeyNotFoundException("User food item not found");
                    }

                    mealDiary.Grams = grams;
                    mealDiary.Calories = Math.Round(ufi.CaloriesPer100 * factor, 2);
                    mealDiary.Protein = Math.Round(ufi.ProteinPer100 * factor, 2);
                    mealDiary.Carb = Math.Round(ufi.CarbPer100 * factor, 2);
                    mealDiary.Fat = Math.Round(ufi.FatPer100 * factor, 2);
                    mealDiary.SourceMethod = "user";
                    return;
                }

                case MealDiarySourceKind.FoodItem:
                {
                    var fi = await _context.FoodItems
                        .AsNoTracking()
                        .FirstOrDefaultAsync(item =>
                            item.FoodItemId == mealDiary.FoodItemId!.Value &&
                            !item.IsDeleted &&
                            item.IsActive);
                    if (fi == null)
                    {
                        throw new KeyNotFoundException("Food item not found");
                    }

                    mealDiary.Grams = grams;
                    mealDiary.Calories = Math.Round(fi.CaloriesPer100g * factor, 2);
                    mealDiary.Protein = Math.Round(fi.ProteinPer100g * factor, 2);
                    mealDiary.Carb = Math.Round(fi.CarbPer100g * factor, 2);
                    mealDiary.Fat = Math.Round(fi.FatPer100g * factor, 2);
                    mealDiary.SourceMethod = "catalog";
                    return;
                }

                case MealDiarySourceKind.UserDish:
                {
                    var userDish = await _context.UserDishes
                        .AsNoTracking()
                        .Include(ud => ud.UserDishIngredients)
                        .ThenInclude(udi => udi.FoodItem)
                        .FirstOrDefaultAsync(ud =>
                            ud.UserDishId == mealDiary.UserDishId!.Value &&
                            ud.UserId == userId &&
                            !ud.IsDeleted);

                    if (userDish == null)
                    {
                        throw new KeyNotFoundException("User dish not found");
                    }

                    if (!userDish.UserDishIngredients.Any())
                    {
                        throw new InvalidOperationException("User dish must contain at least one ingredient");
                    }

                    decimal totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0, totalGrams = 0;
                    foreach (var ing in userDish.UserDishIngredients)
                    {
                        if (ing.FoodItem == null)
                        {
                            throw new KeyNotFoundException("User dish ingredient food item not found");
                        }

                        var ingGrams = ing.Grams;
                        totalGrams += ingGrams;
                        var ingFactor = ingGrams / 100m;
                        totalCal += ing.FoodItem.CaloriesPer100g * ingFactor;
                        totalPro += ing.FoodItem.ProteinPer100g * ingFactor;
                        totalCarb += ing.FoodItem.CarbPer100g * ingFactor;
                        totalFat += ing.FoodItem.FatPer100g * ingFactor;
                    }

                    if (totalGrams <= 0)
                    {
                        throw new InvalidOperationException("User dish ingredients must have positive grams");
                    }

                    var scaleFactor = grams / totalGrams;
                    mealDiary.Grams = grams;
                    mealDiary.Calories = Math.Round(totalCal * scaleFactor, 2);
                    mealDiary.Protein = Math.Round(totalPro * scaleFactor, 2);
                    mealDiary.Carb = Math.Round(totalCarb * scaleFactor, 2);
                    mealDiary.Fat = Math.Round(totalFat * scaleFactor, 2);
                    mealDiary.SourceMethod = "user_dish";
                    return;
                }

                case MealDiarySourceKind.Recipe:
                {
                    var recipe = await _context.Recipes
                        .AsNoTracking()
                        .Include(r => r.RecipeIngredients)
                        .ThenInclude(ri => ri.FoodItem)
                        .FirstOrDefaultAsync(r => r.RecipeId == mealDiary.RecipeId!.Value);

                    if (recipe == null)
                    {
                        throw new KeyNotFoundException("Recipe not found");
                    }

                    if (!recipe.RecipeIngredients.Any())
                    {
                        throw new InvalidOperationException("Recipe must contain at least one ingredient");
                    }

                    decimal totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0, totalGrams = 0;
                    foreach (var ri in recipe.RecipeIngredients)
                    {
                        if (ri.FoodItem == null)
                        {
                            throw new KeyNotFoundException("Recipe ingredient food item not found");
                        }

                        var riGrams = ri.Grams;
                        totalGrams += riGrams;
                        var riFactor = riGrams / 100m;
                        totalCal += ri.FoodItem.CaloriesPer100g * riFactor;
                        totalPro += ri.FoodItem.ProteinPer100g * riFactor;
                        totalCarb += ri.FoodItem.CarbPer100g * riFactor;
                        totalFat += ri.FoodItem.FatPer100g * riFactor;
                    }

                    if (totalGrams <= 0)
                    {
                        throw new InvalidOperationException("Recipe ingredients must have positive grams");
                    }

                    var scaleFactor = grams / totalGrams;
                    mealDiary.Grams = grams;
                    mealDiary.Calories = Math.Round(totalCal * scaleFactor, 2);
                    mealDiary.Protein = Math.Round(totalPro * scaleFactor, 2);
                    mealDiary.Carb = Math.Round(totalCarb * scaleFactor, 2);
                    mealDiary.Fat = Math.Round(totalFat * scaleFactor, 2);
                    mealDiary.SourceMethod = "recipe";
                    return;
                }
            }
        }


        private async Task PopulateUserFoodNamesAsync(Guid userId, IEnumerable<MealDiary> entities, IEnumerable<MealDiaryDto> dtos)
        {
            // Build map: MealDiaryId -> UserFoodItemId
            var pairs = entities
                .Where(e => e.UserFoodItemId.HasValue)
                .Select(e => new { e.MealDiaryId, e.UserFoodItemId!.Value })
                .ToList();
            if (pairs.Count == 0) return;

            var userFoodItemIds = pairs.Select(p => p.Value).Distinct().ToList();
            var userFoods = await _context.UserFoodItems
                .Where(ufi => ufi.UserId == userId && userFoodItemIds.Contains(ufi.UserFoodItemId))
                .Select(ufi => new { ufi.UserFoodItemId, ufi.FoodName })
                .ToListAsync();
            var nameById = userFoods.ToDictionary(x => x.UserFoodItemId, x => x.FoodName);

            // Map MealDiaryId -> name
            var nameByDiaryId = pairs
                .Where(p => nameById.ContainsKey(p.Value))
                .ToDictionary(p => p.MealDiaryId, p => nameById[p.Value]);

            foreach (var dto in dtos)
            {
                if (nameByDiaryId.TryGetValue(dto.MealDiaryId, out var name))
                {
                    dto.FoodItemName = name;
                }
            }
        }
    }
}
