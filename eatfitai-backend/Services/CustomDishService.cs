using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.Food;
using EatFitAI.API.DTOs.MealDiary;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services
{
    public class CustomDishService : ICustomDishService
    {
        private readonly EatFitAIDbContext _context;
        private readonly IMealDiaryService _mealDiaryService;

        public CustomDishService(EatFitAIDbContext context, IMealDiaryService mealDiaryService)
        {
            _context = context;
            _mealDiaryService = mealDiaryService;
        }

        public async Task<IEnumerable<CustomDishSummaryDto>> GetCustomDishesAsync(Guid userId)
        {
            var userDishes = await _context.UserDishes
                .AsNoTracking()
                .Where(userDish => userDish.UserId == userId && !userDish.IsDeleted)
                .Include(userDish => userDish.UserDishIngredients)
                .ThenInclude(ingredient => ingredient.FoodItem)
                .AsSplitQuery()
                .OrderByDescending(userDish => userDish.UpdatedAt)
                .ToListAsync();

            return userDishes.Select(MapSummary).ToList();
        }

        public async Task<CustomDishResponseDto> GetCustomDishAsync(Guid userId, int userDishId)
        {
            var userDish = await GetUserDishAsync(userId, userDishId, asNoTracking: true);
            return MapResponse(userDish);
        }

        public async Task<CustomDishResponseDto> CreateCustomDishAsync(Guid userId, CustomDishDto customDishDto)
        {
            ValidateRequest(customDishDto);
            await EnsureNoDuplicateNameAsync(userId, customDishDto.DishName);
            await EnsureIngredientsExistAsync(customDishDto.Ingredients);

            var utcNow = DateTime.UtcNow;
            var userDish = new UserDish
            {
                UserId = userId,
                DishName = customDishDto.DishName.Trim(),
                Description = string.IsNullOrWhiteSpace(customDishDto.Description)
                    ? null
                    : customDishDto.Description.Trim(),
                CreatedAt = utcNow,
                UpdatedAt = utcNow,
                IsDeleted = false,
                UserDishIngredients = customDishDto.Ingredients
                    .Select(ingredient => new UserDishIngredient
                    {
                        FoodItemId = ingredient.FoodItemId,
                        Grams = ingredient.Grams
                    })
                    .ToList()
            };

            await _context.UserDishes.AddAsync(userDish);
            await _context.SaveChangesAsync();

            return MapResponse(userDish);
        }

        public async Task<CustomDishResponseDto> UpdateCustomDishAsync(Guid userId, int userDishId, CustomDishDto customDishDto)
        {
            ValidateRequest(customDishDto);
            await EnsureNoDuplicateNameAsync(userId, customDishDto.DishName, userDishId);
            await EnsureIngredientsExistAsync(customDishDto.Ingredients);

            var userDish = await GetUserDishAsync(userId, userDishId, asNoTracking: false);

            userDish.DishName = customDishDto.DishName.Trim();
            userDish.Description = string.IsNullOrWhiteSpace(customDishDto.Description)
                ? null
                : customDishDto.Description.Trim();
            userDish.UpdatedAt = DateTime.UtcNow;

            if (userDish.UserDishIngredients.Count > 0)
            {
                _context.UserDishIngredients.RemoveRange(userDish.UserDishIngredients);
            }

            userDish.UserDishIngredients.Clear();
            foreach (var ingredient in customDishDto.Ingredients)
            {
                userDish.UserDishIngredients.Add(new UserDishIngredient
                {
                    UserDishId = userDish.UserDishId,
                    FoodItemId = ingredient.FoodItemId,
                    Grams = ingredient.Grams
                });
            }

            await _context.SaveChangesAsync();

            return MapResponse(userDish);
        }

        public async Task DeleteCustomDishAsync(Guid userId, int userDishId)
        {
            var userDish = await _context.UserDishes
                .FirstOrDefaultAsync(item =>
                    item.UserDishId == userDishId &&
                    item.UserId == userId &&
                    !item.IsDeleted);

            if (userDish == null)
            {
                throw new KeyNotFoundException("Custom dish not found");
            }

            userDish.IsDeleted = true;
            userDish.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task<MealDiaryDto> ApplyCustomDishAsync(Guid userId, int userDishId, ApplyCustomDishRequest request)
        {
            if (request == null)
            {
                throw new ArgumentException("Request body is required");
            }

            if (request.TargetDate == default)
            {
                throw new ArgumentException("Target date is required");
            }

            if (request.MealTypeId <= 0)
            {
                throw new ArgumentException("Meal type is invalid");
            }

            var userDish = await GetUserDishAsync(userId, userDishId, asNoTracking: true);
            var defaultGrams = userDish.UserDishIngredients.Sum(ingredient => ingredient.Grams);
            var grams = request.Grams ?? defaultGrams;

            if (grams <= 0)
            {
                throw new ArgumentException("Template grams must be greater than 0");
            }

            return await _mealDiaryService.CreateMealDiaryAsync(userId, new CreateMealDiaryRequest
            {
                EatenDate = request.TargetDate,
                MealTypeId = request.MealTypeId,
                UserDishId = userDishId,
                Grams = grams,
                Note = request.Note,
                SourceMethod = "template"
            });
        }

        private async Task<UserDish> GetUserDishAsync(Guid userId, int userDishId, bool asNoTracking)
        {
            IQueryable<UserDish> query = _context.UserDishes;
            if (asNoTracking)
            {
                query = query.AsNoTracking();
            }

            var userDish = await query
                .Where(item =>
                    item.UserDishId == userDishId &&
                    item.UserId == userId &&
                    !item.IsDeleted)
                .Include(item => item.UserDishIngredients)
                .ThenInclude(ingredient => ingredient.FoodItem)
                .AsSplitQuery()
                .FirstOrDefaultAsync();

            if (userDish == null)
            {
                throw new KeyNotFoundException("Custom dish not found");
            }

            if (userDish.UserDishIngredients.Count == 0)
            {
                throw new InvalidOperationException("Custom dish must contain at least one ingredient");
            }

            return userDish;
        }

        private static void ValidateRequest(CustomDishDto customDishDto)
        {
            if (customDishDto == null)
            {
                throw new ArgumentException("Request body is required");
            }

            if (string.IsNullOrWhiteSpace(customDishDto.DishName))
            {
                throw new ArgumentException("Dish name is required");
            }

            if (customDishDto.Ingredients == null || customDishDto.Ingredients.Count == 0)
            {
                throw new ArgumentException("Custom dish must contain at least one ingredient");
            }

            foreach (var ingredient in customDishDto.Ingredients)
            {
                if (ingredient.Grams <= 0)
                {
                    throw new ArgumentException("Custom dish ingredient grams must be greater than 0");
                }
            }
        }

        private async Task EnsureIngredientsExistAsync(IEnumerable<CustomDishIngredientDto> ingredients)
        {
            var ingredientIds = ingredients
                .Select(ingredient => ingredient.FoodItemId)
                .Distinct()
                .ToList();

            var availableCount = await _context.FoodItems
                .CountAsync(foodItem =>
                    ingredientIds.Contains(foodItem.FoodItemId) &&
                    !foodItem.IsDeleted &&
                    foodItem.IsActive);

            if (availableCount != ingredientIds.Count)
            {
                throw new KeyNotFoundException("One or more food items were not found");
            }
        }

        private async Task EnsureNoDuplicateNameAsync(Guid userId, string dishName, int? excludedUserDishId = null)
        {
            var normalizedName = dishName.Trim();
            var duplicateExists = await _context.UserDishes.AnyAsync(userDish =>
                userDish.UserId == userId &&
                !userDish.IsDeleted &&
                userDish.DishName == normalizedName &&
                (!excludedUserDishId.HasValue || userDish.UserDishId != excludedUserDishId.Value));

            if (duplicateExists)
            {
                throw new InvalidOperationException("Custom dish with the same name already exists");
            }
        }

        private static CustomDishResponseDto MapResponse(UserDish userDish)
        {
            return new CustomDishResponseDto
            {
                UserDishId = userDish.UserDishId,
                DishName = userDish.DishName,
                Description = userDish.Description,
                CreatedAt = userDish.CreatedAt,
                UpdatedAt = userDish.UpdatedAt,
                Ingredients = userDish.UserDishIngredients
                    .OrderBy(ingredient => ingredient.UserDishIngredientId)
                    .Select(ingredient => new CustomDishIngredientDto
                    {
                        FoodItemId = ingredient.FoodItemId,
                        Grams = ingredient.Grams,
                        FoodName = ingredient.FoodItem?.FoodName,
                        CaloriesPer100g = ingredient.FoodItem?.CaloriesPer100g,
                        ProteinPer100g = ingredient.FoodItem?.ProteinPer100g,
                        CarbPer100g = ingredient.FoodItem?.CarbPer100g,
                        FatPer100g = ingredient.FoodItem?.FatPer100g,
                        ThumbnailUrl = ingredient.FoodItem?.ThumbNail
                    })
                    .ToList()
            };
        }

        private static CustomDishSummaryDto MapSummary(UserDish userDish)
        {
            var defaultGrams = userDish.UserDishIngredients.Sum(ingredient => ingredient.Grams);
            decimal calories = 0m;
            decimal protein = 0m;
            decimal carb = 0m;
            decimal fat = 0m;

            foreach (var ingredient in userDish.UserDishIngredients)
            {
                if (ingredient.FoodItem == null)
                {
                    continue;
                }

                var factor = ingredient.Grams / 100m;
                calories += ingredient.FoodItem.CaloriesPer100g * factor;
                protein += ingredient.FoodItem.ProteinPer100g * factor;
                carb += ingredient.FoodItem.CarbPer100g * factor;
                fat += ingredient.FoodItem.FatPer100g * factor;
            }

            return new CustomDishSummaryDto
            {
                UserDishId = userDish.UserDishId,
                DishName = userDish.DishName,
                Description = userDish.Description,
                IngredientCount = userDish.UserDishIngredients.Count,
                DefaultGrams = Math.Round(defaultGrams, 2),
                Calories = Math.Round(calories, 2),
                Protein = Math.Round(protein, 2),
                Carb = Math.Round(carb, 2),
                Fat = Math.Round(fat, 2),
                CreatedAt = userDish.CreatedAt,
                UpdatedAt = userDish.UpdatedAt
            };
        }
    }
}
