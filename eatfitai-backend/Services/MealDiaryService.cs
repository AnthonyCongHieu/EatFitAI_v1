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
        private readonly IMealDiaryRepository _mealDiaryRepository;
        private readonly EatFitAIDbContext _context;
        private readonly IMapper _mapper;

        public MealDiaryService(
            IMealDiaryRepository mealDiaryRepository,
            EatFitAIDbContext context,
            IMapper mapper)
        {
            _mealDiaryRepository = mealDiaryRepository;
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<MealDiaryDto>> GetUserMealDiariesAsync(Guid userId, DateTime? date = null)
        {
            var mealDiaries = await _mealDiaryRepository.GetByUserIdAsync(userId, date);
            var dtos = _mapper.Map<List<MealDiaryDto>>(mealDiaries);
            await PopulateUserFoodNamesAsync(mealDiaries, dtos);
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
            await PopulateUserFoodNamesAsync(new[] { mealDiary }, new[] { dto });
            return dto;
        }

        public async Task<MealDiaryDto> CreateMealDiaryAsync(Guid userId, CreateMealDiaryRequest request)
        {
            var mealDiary = _mapper.Map<MealDiary>(request);
            mealDiary.UserId = userId;
            await ComputeAndAssignMacrosAsync(mealDiary, request.FoodItemId, request.UserFoodItemId, request.Grams);

            await _mealDiaryRepository.AddAsync(mealDiary);
            await _context.SaveChangesAsync();

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
            mealDiary.UpdatedAt = DateTime.UtcNow;

            // Determine which references/macros to compute from after mapping
            var foodItemId = request.FoodItemId ?? mealDiary.FoodItemId;
            var userFoodItemId = request.UserFoodItemId ?? mealDiary.UserFoodItemId;
            var grams = request.Grams ?? mealDiary.Grams;
            await ComputeAndAssignMacrosAsync(mealDiary, foodItemId, userFoodItemId, grams);
            _mealDiaryRepository.Update(mealDiary);
            await _context.SaveChangesAsync();

            // Fetch with includes for the response
            var updatedMealDiary = await _mealDiaryRepository.GetByIdWithIncludesAsync(id);
            return _mapper.Map<MealDiaryDto>(updatedMealDiary);
        }

        public async Task DeleteMealDiaryAsync(int id, Guid userId)
        {
            var mealDiary = await _mealDiaryRepository.GetByIdAsync(id);
            if (mealDiary == null || mealDiary.UserId != userId || mealDiary.IsDeleted)
            {
                throw new KeyNotFoundException("Meal diary entry not found");
            }

            mealDiary.IsDeleted = true;
            _mealDiaryRepository.Update(mealDiary);
            await _context.SaveChangesAsync();
        }

        private async Task ComputeAndAssignMacrosAsync(MealDiary mealDiary, int? foodItemId, int? userFoodItemId, decimal grams)
        {
            // Validation: grams phải > 0
            if (grams <= 0)
            {
                Console.WriteLine($"[MealDiaryService] Warning: grams <= 0 ({grams}), skipping macro compute");
                return;
            }

            Console.WriteLine($"[MealDiaryService] ComputeAndAssignMacros: entryId={mealDiary.MealDiaryId}, grams={grams}, foodItemId={foodItemId}, userFoodItemId={userFoodItemId}, userDishId={mealDiary.UserDishId}, recipeId={mealDiary.RecipeId}");

            // Priority 1: UserFoodItem
            if (userFoodItemId.HasValue)
            {
                var ufi = await _context.UserFoodItems.FindAsync(userFoodItemId.Value);
                if (ufi != null)
                {
                    mealDiary.UserFoodItemId = ufi.UserFoodItemId;
                    mealDiary.FoodItemId = null;
                    var factor = grams / 100m;
                    mealDiary.Grams = grams;
                    mealDiary.Calories = Math.Round(ufi.CaloriesPer100 * factor, 2);
                    mealDiary.Protein = Math.Round(ufi.ProteinPer100 * factor, 2);
                    mealDiary.Carb = Math.Round(ufi.CarbPer100 * factor, 2);
                    mealDiary.Fat = Math.Round(ufi.FatPer100 * factor, 2);
                    mealDiary.SourceMethod = "user";
                    Console.WriteLine($"[MealDiaryService] Computed from UserFoodItem: cal={mealDiary.Calories}");
                    return;
                }
            }

            // Priority 2: FoodItem từ catalog
            if (foodItemId.HasValue)
            {
                var fi = await _context.FoodItems.FindAsync(foodItemId.Value);
                if (fi != null)
                {
                    mealDiary.FoodItemId = fi.FoodItemId;
                    mealDiary.UserFoodItemId = null;
                    var factor = grams / 100m;
                    mealDiary.Grams = grams;
                    mealDiary.Calories = Math.Round(fi.CaloriesPer100g * factor, 2);
                    mealDiary.Protein = Math.Round(fi.ProteinPer100g * factor, 2);
                    mealDiary.Carb = Math.Round(fi.CarbPer100g * factor, 2);
                    mealDiary.Fat = Math.Round(fi.FatPer100g * factor, 2);
                    mealDiary.SourceMethod = "catalog";
                    Console.WriteLine($"[MealDiaryService] Computed from FoodItem: cal={mealDiary.Calories}");
                    return;
                }
            }

            // Priority 3: UserDish - tính từ tổng các nguyên liệu
            if (mealDiary.UserDishId.HasValue)
            {
                var userDish = await _context.UserDishes
                    .Include(ud => ud.UserDishIngredients)
                    .ThenInclude(udi => udi.FoodItem)
                    .FirstOrDefaultAsync(ud => ud.UserDishId == mealDiary.UserDishId.Value);
                    
                if (userDish != null && userDish.UserDishIngredients.Any())
                {
                    // Tính tổng macro từ FoodItem của mỗi nguyên liệu
                    decimal totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0, totalGrams = 0;
                    foreach (var ing in userDish.UserDishIngredients)
                    {
                        if (ing.FoodItem != null)
                        {
                            var ingGrams = ing.Grams;
                            totalGrams += ingGrams;
                            var factor = ingGrams / 100m;
                            totalCal += ing.FoodItem.CaloriesPer100g * factor;
                            totalPro += ing.FoodItem.ProteinPer100g * factor;
                            totalCarb += ing.FoodItem.CarbPer100g * factor;
                            totalFat += ing.FoodItem.FatPer100g * factor;
                        }
                    }
                    
                    if (totalGrams > 0)
                    {
                        var scaleFactor = grams / totalGrams;
                        mealDiary.Grams = grams;
                        mealDiary.Calories = Math.Round(totalCal * scaleFactor, 2);
                        mealDiary.Protein = Math.Round(totalPro * scaleFactor, 2);
                        mealDiary.Carb = Math.Round(totalCarb * scaleFactor, 2);
                        mealDiary.Fat = Math.Round(totalFat * scaleFactor, 2);
                        Console.WriteLine($"[MealDiaryService] Computed from UserDish: cal={mealDiary.Calories}");
                        return;
                    }
                }
            }

            // Priority 4: Recipe - tính từ các nguyên liệu của recipe
            if (mealDiary.RecipeId.HasValue)
            {
                var recipe = await _context.Recipes
                    .Include(r => r.RecipeIngredients)
                    .ThenInclude(ri => ri.FoodItem)
                    .FirstOrDefaultAsync(r => r.RecipeId == mealDiary.RecipeId.Value);
                    
                if (recipe != null && recipe.RecipeIngredients.Any())
                {
                    decimal totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0, totalGrams = 0;
                    foreach (var ri in recipe.RecipeIngredients)
                    {
                        if (ri.FoodItem != null)
                        {
                            var riGrams = ri.Grams;
                            totalGrams += riGrams;
                            var factor = riGrams / 100m;
                            totalCal += ri.FoodItem.CaloriesPer100g * factor;
                            totalPro += ri.FoodItem.ProteinPer100g * factor;
                            totalCarb += ri.FoodItem.CarbPer100g * factor;
                            totalFat += ri.FoodItem.FatPer100g * factor;
                        }
                    }
                    
                    if (totalGrams > 0)
                    {
                        var scaleFactor = grams / totalGrams;
                        mealDiary.Grams = grams;
                        mealDiary.Calories = Math.Round(totalCal * scaleFactor, 2);
                        mealDiary.Protein = Math.Round(totalPro * scaleFactor, 2);
                        mealDiary.Carb = Math.Round(totalCarb * scaleFactor, 2);
                        mealDiary.Fat = Math.Round(totalFat * scaleFactor, 2);
                        Console.WriteLine($"[MealDiaryService] Computed from Recipe: cal={mealDiary.Calories}");
                        return;
                    }
                }
            }

            // Fallback: Tính lại macros dựa trên tỷ lệ gram mới / gram cũ
            // Áp dụng cho entries không có source hoặc source đã bị xóa
            if (mealDiary.Grams > 0 && grams != mealDiary.Grams)
            {
                var ratio = grams / mealDiary.Grams;
                mealDiary.Calories = Math.Round(mealDiary.Calories * ratio, 2);
                mealDiary.Protein = Math.Round(mealDiary.Protein * ratio, 2);
                mealDiary.Carb = Math.Round(mealDiary.Carb * ratio, 2);
                mealDiary.Fat = Math.Round(mealDiary.Fat * ratio, 2);
                mealDiary.Grams = grams;
                Console.WriteLine($"[MealDiaryService] Computed via ratio fallback: cal={mealDiary.Calories}");
            }
            else if (mealDiary.Grams == 0 || mealDiary.Grams == grams)
            {
                // Grams cũ là 0 hoặc không đổi, chỉ update grams
                mealDiary.Grams = grams;
                Console.WriteLine($"[MealDiaryService] Updated grams only (no change in macros)");
            }
        }


        private async Task PopulateUserFoodNamesAsync(IEnumerable<MealDiary> entities, IEnumerable<MealDiaryDto> dtos)
        {
            // Build map: MealDiaryId -> UserFoodItemId
            var pairs = entities
                .Where(e => e.UserFoodItemId.HasValue)
                .Select(e => new { e.MealDiaryId, e.UserFoodItemId!.Value })
                .ToList();
            if (pairs.Count == 0) return;

            var userFoodItemIds = pairs.Select(p => p.Value).Distinct().ToList();
            var userFoods = await _context.UserFoodItems
                .Where(ufi => userFoodItemIds.Contains(ufi.UserFoodItemId))
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
