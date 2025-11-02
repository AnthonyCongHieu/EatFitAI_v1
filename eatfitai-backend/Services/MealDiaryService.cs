using AutoMapper;
using EatFitAI.API.Data;
using EatFitAI.API.DTOs.MealDiary;
using EatFitAI.API.Models;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services.Interfaces;

namespace EatFitAI.API.Services
{
    public class MealDiaryService : IMealDiaryService
    {
        private readonly IMealDiaryRepository _mealDiaryRepository;
        private readonly ApplicationDbContext _context;
        private readonly IMapper _mapper;

        public MealDiaryService(
            IMealDiaryRepository mealDiaryRepository,
            ApplicationDbContext context,
            IMapper mapper)
        {
            _mealDiaryRepository = mealDiaryRepository;
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<MealDiaryDto>> GetUserMealDiariesAsync(Guid userId, DateTime? date = null)
        {
            var mealDiaries = await _mealDiaryRepository.GetByUserIdAsync(userId, date);
            return _mapper.Map<IEnumerable<MealDiaryDto>>(mealDiaries);
        }

        public async Task<MealDiaryDto> GetMealDiaryByIdAsync(int id, Guid userId)
        {
            var mealDiary = await _mealDiaryRepository.GetByIdWithIncludesAsync(id);
            if (mealDiary == null || mealDiary.UserId != userId || mealDiary.IsDeleted)
            {
                throw new KeyNotFoundException("Meal diary entry not found");
            }

            return _mapper.Map<MealDiaryDto>(mealDiary);
        }

        public async Task<MealDiaryDto> CreateMealDiaryAsync(Guid userId, CreateMealDiaryRequest request)
        {
            var mealDiary = _mapper.Map<MealDiary>(request);
            mealDiary.UserId = userId;

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
    }
}