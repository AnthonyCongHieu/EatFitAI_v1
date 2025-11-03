using AutoMapper;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.Food;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services.Interfaces;

namespace EatFitAI.API.Services
{
    public class FoodService : IFoodService
    {
        private readonly IFoodItemRepository _foodItemRepository;
        private readonly EatFitAIDbContext _context;
        private readonly IMapper _mapper;

        public FoodService(
            IFoodItemRepository foodItemRepository,
            EatFitAIDbContext context,
            IMapper mapper)
        {
            _foodItemRepository = foodItemRepository;
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<FoodItemDto>> SearchFoodItemsAsync(string searchTerm, int limit = 50)
        {
            var foodItems = await _foodItemRepository.SearchByNameAsync(searchTerm, limit);
            return _mapper.Map<IEnumerable<FoodItemDto>>(foodItems);
        }

        public async Task<(FoodItemDto FoodItem, IEnumerable<FoodServingDto> Servings)> GetFoodItemWithServingsAsync(int id)
        {
            var (foodItem, servings) = await _foodItemRepository.GetByIdWithServingsAsync(id);
            if (foodItem == null)
            {
                throw new KeyNotFoundException("Food item not found");
            }

            var foodItemDto = _mapper.Map<FoodItemDto>(foodItem);
            var servingDtos = _mapper.Map<IEnumerable<FoodServingDto>>(servings);

            return (foodItemDto, servingDtos);
        }

        public async Task<CustomDishResponseDto> CreateCustomDishAsync(Guid userId, CustomDishDto customDishDto)
        {
            var userDish = new UserDish
            {
                UserId = userId,
                DishName = customDishDto.DishName,
                Description = customDishDto.Description,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsDeleted = false
            };

            await _context.UserDishes.AddAsync(userDish);
            await _context.SaveChangesAsync();

            // Add ingredients
            foreach (var ingredient in customDishDto.Ingredients)
            {
                var userDishIngredient = new UserDishIngredient
                {
                    UserDishId = userDish.UserDishId,
                    FoodItemId = ingredient.FoodItemId,
                    Grams = ingredient.Grams
                };
                await _context.UserDishIngredients.AddAsync(userDishIngredient);
            }

            await _context.SaveChangesAsync();

            // Return response with ingredients
            var response = new CustomDishResponseDto
            {
                UserDishId = userDish.UserDishId,
                DishName = userDish.DishName,
                Description = userDish.Description,
                CreatedAt = userDish.CreatedAt,
                UpdatedAt = userDish.UpdatedAt,
                Ingredients = customDishDto.Ingredients
            };

            return response;
        }
    }
}
