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

            _mapper.Map(request, mealDiary);
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
            // Normalize: prefer UserFoodItem if provided; otherwise FoodItem; else leave as-is
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
                    return;
                }
            }

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
                    return;
                }
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
