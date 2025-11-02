using AutoMapper;
using EatFitAI.API.DTOs.Food;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services.Interfaces;

namespace EatFitAI.API.Services
{
    public class FoodService : IFoodService
    {
        private readonly IFoodItemRepository _foodItemRepository;
        private readonly IMapper _mapper;

        public FoodService(
            IFoodItemRepository foodItemRepository,
            IMapper mapper)
        {
            _foodItemRepository = foodItemRepository;
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
    }
}