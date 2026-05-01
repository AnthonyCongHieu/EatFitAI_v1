using AutoMapper;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.MealDiary;
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
        private readonly IStreakService _streakService;
        private readonly IMediaUrlResolver _mediaUrlResolver;

        public MealDiaryService(
            IMealDiaryRepository mealDiaryRepository,
            EatFitAIDbContext context,
            IMapper mapper,
            IStreakService streakService,
            IMediaUrlResolver mediaUrlResolver)
        {
            _mealDiaryRepository = mealDiaryRepository;
            _context = context;
            _mapper = mapper;
            _streakService = streakService;
            _mediaUrlResolver = mediaUrlResolver;
        }

        public async Task<IEnumerable<MealDiaryDto>> GetUserMealDiariesAsync(Guid userId, DateTime? date = null)
        {
            var mealDiaries = await _mealDiaryRepository.GetByUserIdAsync(userId, date);
            var dtos = _mapper.Map<List<MealDiaryDto>>(mealDiaries);
            await PopulateUserFoodNamesAsync(userId, mealDiaries, dtos);
            return NormalizeMediaUrls(dtos);
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
            return NormalizeMediaUrls(dto);
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
            await TrackRecentFoodsAsync(userId, new[] { mealDiary.FoodItemId });
            await _context.SaveChangesAsync();
            await _streakService.UpdateStreakOnMealLogAsync(userId);

            return await GetMappedMealDiaryAsync(mealDiary.MealDiaryId, userId);
        }

        public async Task<IEnumerable<MealDiaryDto>> CreateMealDiariesAsync(Guid userId, BulkCreateMealDiaryRequest request)
        {
            if (request?.Items == null)
            {
                throw new ArgumentException("Request body is required");
            }

            if (request.Items.Count == 0)
            {
                throw new ArgumentException("At least one meal diary entry is required");
            }

            if (request.Items.Count > 20)
            {
                throw new ArgumentException("Bulk meal diary creation supports up to 20 entries");
            }

            var mealDiaryIds = await ExecuteInTransactionAsync(async () =>
            {
                var mealDiaries = new List<MealDiary>(request.Items.Count);

                foreach (var item in request.Items)
                {
                    if (item == null)
                    {
                        throw new ArgumentException("Meal diary entry is required");
                    }

                    var mealDiary = _mapper.Map<MealDiary>(item);
                    mealDiary.UserId = userId;
                    ApplyExclusiveSource(
                        mealDiary,
                        item.FoodItemId,
                        item.UserFoodItemId,
                        item.UserDishId,
                        item.RecipeId);

                    await ComputeAndAssignMacrosAsync(mealDiary, userId);
                    mealDiaries.Add(mealDiary);
                }

                await _context.MealDiaries.AddRangeAsync(mealDiaries);
                await TrackRecentFoodsAsync(userId, mealDiaries.Select(entry => entry.FoodItemId));
                await _context.SaveChangesAsync();
                await _streakService.UpdateStreakOnMealLogAsync(userId);

                return mealDiaries.Select(entry => entry.MealDiaryId).ToList();
            });

            return await GetMappedMealDiariesAsync(userId, mealDiaryIds);
        }

        public async Task<IEnumerable<MealDiaryDto>> CopyPreviousDayAsync(Guid userId, CopyPreviousDayRequest request)
        {
            if (request == null)
            {
                throw new ArgumentException("Request body is required");
            }

            if (request.TargetDate == default)
            {
                throw new ArgumentException("Target date is required");
            }

            if (request.MealTypeId is <= 0)
            {
                throw new ArgumentException("Meal type is invalid");
            }

            var targetDate = DateOnly.FromDateTime(request.TargetDate.Date);
            var sourceDate = targetDate.AddDays(-1);

            var sourceQuery = _context.MealDiaries
                .AsNoTracking()
                .Where(mealDiary =>
                    mealDiary.UserId == userId &&
                    !mealDiary.IsDeleted &&
                    mealDiary.EatenDate == sourceDate);

            if (request.MealTypeId.HasValue)
            {
                sourceQuery = sourceQuery.Where(mealDiary => mealDiary.MealTypeId == request.MealTypeId.Value);
            }

            var sourceEntries = await sourceQuery
                .OrderBy(mealDiary => mealDiary.MealTypeId)
                .ThenBy(mealDiary => mealDiary.CreatedAt)
                .ToListAsync();

            if (sourceEntries.Count == 0)
            {
                throw new KeyNotFoundException("No meal diary entries found for the previous day");
            }

            var existingTargetQuery = _context.MealDiaries.Where(mealDiary =>
                mealDiary.UserId == userId &&
                !mealDiary.IsDeleted &&
                mealDiary.EatenDate == targetDate);

            if (request.MealTypeId.HasValue)
            {
                existingTargetQuery = existingTargetQuery.Where(mealDiary => mealDiary.MealTypeId == request.MealTypeId.Value);
            }

            if (await existingTargetQuery.AnyAsync())
            {
                throw new InvalidOperationException("Target date already has meal diary entries for the requested scope");
            }

            var copiedEntries = new List<MealDiary>(sourceEntries.Count);
            foreach (var sourceEntry in sourceEntries)
            {
                var copiedEntry = CloneMealDiary(sourceEntry, targetDate);
                await ComputeAndAssignMacrosAsync(copiedEntry, userId);
                copiedEntries.Add(copiedEntry);
            }

            await _context.MealDiaries.AddRangeAsync(copiedEntries);
            await TrackRecentFoodsAsync(userId, copiedEntries.Select(entry => entry.FoodItemId));
            await _context.SaveChangesAsync();
            await _streakService.UpdateStreakOnMealLogAsync(userId);

            return await GetMappedMealDiariesAsync(
                userId,
                copiedEntries.Select(entry => entry.MealDiaryId).ToList());
        }

        public async Task<MealDiaryDto> UpdateMealDiaryAsync(int id, Guid userId, UpdateMealDiaryRequest request)
        {
            var mealDiary = await _mealDiaryRepository.GetByIdAsync(id);
            if (mealDiary == null || mealDiary.UserId != userId || mealDiary.IsDeleted)
            {
                throw new KeyNotFoundException("Meal diary entry not found");
            }

            var originalFoodItemId = mealDiary.FoodItemId;

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
            if (mealDiary.FoodItemId.HasValue && originalFoodItemId != mealDiary.FoodItemId)
            {
                await TrackRecentFoodsAsync(userId, new[] { mealDiary.FoodItemId });
            }

            await _context.SaveChangesAsync();
            return await GetMappedMealDiaryAsync(id, userId);
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

        private static MealDiary CloneMealDiary(MealDiary sourceEntry, DateOnly targetDate)
        {
            var utcNow = DateTime.UtcNow;

            return new MealDiary
            {
                UserId = sourceEntry.UserId,
                EatenDate = targetDate,
                MealTypeId = sourceEntry.MealTypeId,
                FoodItemId = sourceEntry.FoodItemId,
                UserFoodItemId = sourceEntry.UserFoodItemId,
                UserDishId = sourceEntry.UserDishId,
                RecipeId = sourceEntry.RecipeId,
                ServingUnitId = sourceEntry.ServingUnitId,
                PortionQuantity = sourceEntry.PortionQuantity,
                Grams = sourceEntry.Grams,
                Calories = sourceEntry.Calories,
                Protein = sourceEntry.Protein,
                Carb = sourceEntry.Carb,
                Fat = sourceEntry.Fat,
                Note = sourceEntry.Note,
                PhotoUrl = sourceEntry.PhotoUrl,
                SourceMethod = sourceEntry.SourceMethod,
                CreatedAt = utcNow,
                UpdatedAt = utcNow,
                IsDeleted = false
            };
        }

        private async Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> operation)
        {
            if (IsInMemoryProvider())
            {
                return await operation();
            }

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var result = await operation();
                await transaction.CommitAsync();
                return result;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private bool IsInMemoryProvider()
        {
            return (_context.Database.ProviderName ?? string.Empty)
                .Contains("InMemory", StringComparison.OrdinalIgnoreCase);
        }

        private async Task TrackRecentFoodsAsync(Guid userId, IEnumerable<int?> foodItemIds)
        {
            var groupedIds = foodItemIds
                .Where(foodItemId => foodItemId.HasValue)
                .Select(foodItemId => foodItemId!.Value)
                .GroupBy(foodItemId => foodItemId)
                .ToList();

            if (groupedIds.Count == 0)
            {
                return;
            }

            var recentFoodIds = groupedIds.Select(group => group.Key).ToList();
            var existingRows = await _context.UserRecentFoods
                .Where(item => item.UserId == userId && recentFoodIds.Contains(item.FoodItemId))
                .ToListAsync();

            var utcNow = DateTime.UtcNow;
            foreach (var group in groupedIds)
            {
                var existingRow = existingRows.FirstOrDefault(item => item.FoodItemId == group.Key);
                if (existingRow == null)
                {
                    await _context.UserRecentFoods.AddAsync(new UserRecentFood
                    {
                        UserId = userId,
                        FoodItemId = group.Key,
                        LastUsedAt = utcNow,
                        UsedCount = group.Count()
                    });
                    continue;
                }

                existingRow.LastUsedAt = utcNow;
                existingRow.UsedCount += group.Count();
            }
        }

        private async Task<MealDiaryDto> GetMappedMealDiaryAsync(int mealDiaryId, Guid userId)
        {
            var mealDiary = await _mealDiaryRepository.GetByIdWithIncludesAsync(mealDiaryId)
                ?? throw new KeyNotFoundException("Meal diary entry not found");

            var dto = _mapper.Map<MealDiaryDto>(mealDiary);
            await PopulateUserFoodNamesAsync(userId, new[] { mealDiary }, new[] { dto });
            return NormalizeMediaUrls(dto);
        }

        private async Task<List<MealDiaryDto>> GetMappedMealDiariesAsync(Guid userId, IReadOnlyCollection<int> mealDiaryIds)
        {
            if (mealDiaryIds.Count == 0)
            {
                return new List<MealDiaryDto>();
            }

            var mealDiaries = await _context.MealDiaries
                .Where(mealDiary => mealDiaryIds.Contains(mealDiary.MealDiaryId) && !mealDiary.IsDeleted)
                .Include(mealDiary => mealDiary.FoodItem)
                .Include(mealDiary => mealDiary.UserDish)
                .Include(mealDiary => mealDiary.Recipe)
                .Include(mealDiary => mealDiary.ServingUnit)
                .Include(mealDiary => mealDiary.MealType)
                .AsSplitQuery()
                .AsNoTracking()
                .OrderBy(mealDiary => mealDiary.MealTypeId)
                .ThenBy(mealDiary => mealDiary.CreatedAt)
                .ToListAsync();

            var dtos = _mapper.Map<List<MealDiaryDto>>(mealDiaries);
            await PopulateUserFoodNamesAsync(userId, mealDiaries, dtos);
            return NormalizeMediaUrls(dtos);
        }

        private MealDiaryDto NormalizeMediaUrls(MealDiaryDto dto)
        {
            dto.FoodItemThumbNail = _mediaUrlResolver.NormalizePublicUrl(dto.FoodItemThumbNail);
            dto.PhotoUrl = _mediaUrlResolver.NormalizePublicUrl(dto.PhotoUrl);
            return dto;
        }

        private List<MealDiaryDto> NormalizeMediaUrls(List<MealDiaryDto> dtos)
        {
            foreach (var dto in dtos)
            {
                NormalizeMediaUrls(dto);
            }

            return dtos;
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
                    var userFoodItem = await _context.UserFoodItems
                        .AsNoTracking()
                        .FirstOrDefaultAsync(item =>
                            item.UserFoodItemId == mealDiary.UserFoodItemId!.Value &&
                            item.UserId == userId &&
                            !item.IsDeleted);
                    if (userFoodItem == null)
                    {
                        throw new KeyNotFoundException("User food item not found");
                    }

                    mealDiary.Grams = grams;
                    mealDiary.Calories = Math.Round(userFoodItem.CaloriesPer100 * factor, 2);
                    mealDiary.Protein = Math.Round(userFoodItem.ProteinPer100 * factor, 2);
                    mealDiary.Carb = Math.Round(userFoodItem.CarbPer100 * factor, 2);
                    mealDiary.Fat = Math.Round(userFoodItem.FatPer100 * factor, 2);
                    mealDiary.SourceMethod = "user";
                    return;
                }

                case MealDiarySourceKind.FoodItem:
                {
                    var foodItem = await _context.FoodItems
                        .AsNoTracking()
                        .FirstOrDefaultAsync(item =>
                            item.FoodItemId == mealDiary.FoodItemId!.Value &&
                            !item.IsDeleted &&
                            item.IsActive);
                    if (foodItem == null)
                    {
                        throw new KeyNotFoundException("Food item not found");
                    }

                    mealDiary.Grams = grams;
                    mealDiary.Calories = Math.Round(foodItem.CaloriesPer100g * factor, 2);
                    mealDiary.Protein = Math.Round(foodItem.ProteinPer100g * factor, 2);
                    mealDiary.Carb = Math.Round(foodItem.CarbPer100g * factor, 2);
                    mealDiary.Fat = Math.Round(foodItem.FatPer100g * factor, 2);
                    mealDiary.SourceMethod = "catalog";
                    return;
                }

                case MealDiarySourceKind.UserDish:
                {
                    var userDish = await _context.UserDishes
                        .AsNoTracking()
                        .Include(dish => dish.UserDishIngredients)
                        .ThenInclude(ingredient => ingredient.FoodItem)
                        .FirstOrDefaultAsync(dish =>
                            dish.UserDishId == mealDiary.UserDishId!.Value &&
                            dish.UserId == userId &&
                            !dish.IsDeleted);

                    if (userDish == null)
                    {
                        throw new KeyNotFoundException("User dish not found");
                    }

                    if (!userDish.UserDishIngredients.Any())
                    {
                        throw new InvalidOperationException("User dish must contain at least one ingredient");
                    }

                    decimal totalCalories = 0m;
                    decimal totalProtein = 0m;
                    decimal totalCarb = 0m;
                    decimal totalFat = 0m;
                    decimal totalGrams = 0m;

                    foreach (var ingredient in userDish.UserDishIngredients)
                    {
                        if (ingredient.FoodItem == null)
                        {
                            throw new KeyNotFoundException("User dish ingredient food item not found");
                        }

                        var ingredientGrams = ingredient.Grams;
                        totalGrams += ingredientGrams;
                        var ingredientFactor = ingredientGrams / 100m;
                        totalCalories += ingredient.FoodItem.CaloriesPer100g * ingredientFactor;
                        totalProtein += ingredient.FoodItem.ProteinPer100g * ingredientFactor;
                        totalCarb += ingredient.FoodItem.CarbPer100g * ingredientFactor;
                        totalFat += ingredient.FoodItem.FatPer100g * ingredientFactor;
                    }

                    if (totalGrams <= 0)
                    {
                        throw new InvalidOperationException("User dish ingredients must have positive grams");
                    }

                    var scaleFactor = grams / totalGrams;
                    mealDiary.Grams = grams;
                    mealDiary.Calories = Math.Round(totalCalories * scaleFactor, 2);
                    mealDiary.Protein = Math.Round(totalProtein * scaleFactor, 2);
                    mealDiary.Carb = Math.Round(totalCarb * scaleFactor, 2);
                    mealDiary.Fat = Math.Round(totalFat * scaleFactor, 2);
                    mealDiary.SourceMethod = "user_dish";
                    return;
                }

                case MealDiarySourceKind.Recipe:
                {
                    var recipe = await _context.Recipes
                        .AsNoTracking()
                        .Include(item => item.RecipeIngredients)
                        .ThenInclude(ingredient => ingredient.FoodItem)
                        .FirstOrDefaultAsync(item => item.RecipeId == mealDiary.RecipeId!.Value);

                    if (recipe == null)
                    {
                        throw new KeyNotFoundException("Recipe not found");
                    }

                    if (!recipe.RecipeIngredients.Any())
                    {
                        throw new InvalidOperationException("Recipe must contain at least one ingredient");
                    }

                    decimal totalCalories = 0m;
                    decimal totalProtein = 0m;
                    decimal totalCarb = 0m;
                    decimal totalFat = 0m;
                    decimal totalGrams = 0m;

                    foreach (var ingredient in recipe.RecipeIngredients)
                    {
                        if (ingredient.FoodItem == null)
                        {
                            throw new KeyNotFoundException("Recipe ingredient food item not found");
                        }

                        var ingredientGrams = ingredient.Grams;
                        totalGrams += ingredientGrams;
                        var ingredientFactor = ingredientGrams / 100m;
                        totalCalories += ingredient.FoodItem.CaloriesPer100g * ingredientFactor;
                        totalProtein += ingredient.FoodItem.ProteinPer100g * ingredientFactor;
                        totalCarb += ingredient.FoodItem.CarbPer100g * ingredientFactor;
                        totalFat += ingredient.FoodItem.FatPer100g * ingredientFactor;
                    }

                    if (totalGrams <= 0)
                    {
                        throw new InvalidOperationException("Recipe ingredients must have positive grams");
                    }

                    var scaleFactor = grams / totalGrams;
                    mealDiary.Grams = grams;
                    mealDiary.Calories = Math.Round(totalCalories * scaleFactor, 2);
                    mealDiary.Protein = Math.Round(totalProtein * scaleFactor, 2);
                    mealDiary.Carb = Math.Round(totalCarb * scaleFactor, 2);
                    mealDiary.Fat = Math.Round(totalFat * scaleFactor, 2);
                    mealDiary.SourceMethod = "recipe";
                    return;
                }
            }
        }

        private async Task PopulateUserFoodNamesAsync(Guid userId, IEnumerable<MealDiary> entities, IEnumerable<MealDiaryDto> dtos)
        {
            var pairs = entities
                .Where(entity => entity.UserFoodItemId.HasValue)
                .Select(entity => new { entity.MealDiaryId, UserFoodItemId = entity.UserFoodItemId!.Value })
                .ToList();
            if (pairs.Count == 0)
            {
                return;
            }

            var userFoodItemIds = pairs.Select(pair => pair.UserFoodItemId).Distinct().ToList();
            var userFoods = await _context.UserFoodItems
                .Where(item => item.UserId == userId && userFoodItemIds.Contains(item.UserFoodItemId))
                .Select(item => new { item.UserFoodItemId, item.FoodName, item.ThumbnailUrl })
                .ToListAsync();
            var byId = userFoods.ToDictionary(item => item.UserFoodItemId);

            var nameByDiaryId = pairs
                .Where(pair => byId.ContainsKey(pair.UserFoodItemId))
                .ToDictionary(pair => pair.MealDiaryId, pair => byId[pair.UserFoodItemId]);

            foreach (var dto in dtos)
            {
                if (nameByDiaryId.TryGetValue(dto.MealDiaryId, out var userFood))
                {
                    dto.FoodItemName = userFood.FoodName;
                    dto.FoodItemThumbNail = userFood.ThumbnailUrl;
                }
            }
        }
    }
}
