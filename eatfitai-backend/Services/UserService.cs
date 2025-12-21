using AutoMapper;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.User;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;
        private readonly EatFitAIDbContext _context;
        private readonly IMapper _mapper;

        public UserService(
            IUserRepository userRepository,
            EatFitAIDbContext context,
            IMapper mapper)
        {
            _userRepository = userRepository;
            _context = context;
            _mapper = mapper;
        }

        public async Task<UserDto> GetUserByIdAsync(Guid userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new KeyNotFoundException("User not found");
            }

            return _mapper.Map<UserDto>(user);
        }

        public async Task<UserDto> UpdateUserAsync(Guid userId, UserDto userDto)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new KeyNotFoundException("User not found");
            }

            // Update only allowed fields
            user.DisplayName = userDto.DisplayName;

            _userRepository.Update(user);
            await _context.SaveChangesAsync();

            return _mapper.Map<UserDto>(user);
        }

        public async Task<BodyMetricDto> RecordBodyMetricsAsync(Guid userId, BodyMetricDto bodyMetricDto)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new KeyNotFoundException("User not found");
            }

            var bodyMetric = new BodyMetric
            {
                UserId = userId,
                HeightCm = bodyMetricDto.HeightCm,
                WeightKg = bodyMetricDto.WeightKg,
                MeasuredDate = DateOnly.FromDateTime(bodyMetricDto.MeasuredDate),
                Note = bodyMetricDto.Note
            };

            await _context.BodyMetrics.AddAsync(bodyMetric);
            await _context.SaveChangesAsync();

            return _mapper.Map<BodyMetricDto>(bodyMetric);
        }

        public async Task<List<BodyMetricDto>> GetBodyMetricsHistoryAsync(Guid userId, int limit = 30)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new KeyNotFoundException("User not found");
            }

            var bodyMetrics = await _context.BodyMetrics
                .Where(bm => bm.UserId == userId)
                .OrderByDescending(bm => bm.MeasuredDate)
                .ThenByDescending(bm => bm.BodyMetricId)
                .Take(limit)
                .ToListAsync();

            return _mapper.Map<List<BodyMetricDto>>(bodyMetrics);
        }


        public async Task<UserProfileDto> GetUserProfileAsync(Guid userId)
        {
            // Include ActivityLevel để lấy ActivityFactor
            var user = await _context.Users
                .Include(u => u.ActivityLevel)
                .FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null) throw new KeyNotFoundException("User not found");

            var userProfile = _mapper.Map<UserProfileDto>(user);
            
            // Map thêm các profile fields mới
            userProfile.Gender = user.Gender;
            userProfile.DateOfBirth = user.DateOfBirth;
            userProfile.ActivityLevelId = user.ActivityLevelId;
            userProfile.ActivityFactor = user.ActivityLevel?.ActivityFactor != null 
                ? (double)user.ActivityLevel.ActivityFactor 
                : null;
            userProfile.Goal = user.Goal;

            // Get latest body metrics
            var latestMetric = await _context.BodyMetrics
                .Where(bm => bm.UserId == userId)
                .OrderByDescending(bm => bm.MeasuredDate)
                .ThenByDescending(bm => bm.BodyMetricId)
                .FirstOrDefaultAsync();

            if (latestMetric != null)
            {
                userProfile.CurrentHeightCm = latestMetric.HeightCm;
                userProfile.CurrentWeightKg = latestMetric.WeightKg;
                userProfile.LastMeasuredDate = latestMetric.MeasuredDate;
            }

            // Map streak và target weight fields (Profile 2026)
            userProfile.TargetWeightKg = user.TargetWeightKg;
            userProfile.CurrentStreak = user.CurrentStreak;
            userProfile.LongestStreak = user.LongestStreak;

            return userProfile;
        }

        public async Task<UserProfileDto> UpdateUserProfileAsync(Guid userId, UserProfileDto userProfileDto)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) throw new KeyNotFoundException("User not found");

            // Update User info
            user.DisplayName = userProfileDto.DisplayName;
            
            // Update profile fields for AI nutrition
            if (userProfileDto.Gender != null)
                user.Gender = userProfileDto.Gender;
            if (userProfileDto.DateOfBirth.HasValue)
                user.DateOfBirth = userProfileDto.DateOfBirth;
            if (userProfileDto.ActivityLevelId.HasValue)
                user.ActivityLevelId = userProfileDto.ActivityLevelId;
            if (userProfileDto.Goal != null)
                user.Goal = userProfileDto.Goal;
            
            // Update target weight (Profile 2026)
            if (userProfileDto.TargetWeightKg.HasValue)
                user.TargetWeightKg = userProfileDto.TargetWeightKg;
            
            _userRepository.Update(user);

            // Check if metrics changed
            if (userProfileDto.CurrentHeightCm.HasValue || userProfileDto.CurrentWeightKg.HasValue)
            {
                 var latestMetric = await _context.BodyMetrics
                    .Where(bm => bm.UserId == userId)
                    .OrderByDescending(bm => bm.MeasuredDate)
                    .ThenByDescending(bm => bm.BodyMetricId)
                    .FirstOrDefaultAsync();
                
                decimal newHeight = userProfileDto.CurrentHeightCm ?? latestMetric?.HeightCm ?? 0m;
                decimal newWeight = userProfileDto.CurrentWeightKg ?? latestMetric?.WeightKg ?? 0m;

                bool isChanged = latestMetric == null ||
                                 latestMetric.HeightCm != newHeight ||
                                 latestMetric.WeightKg != newWeight;

                if (isChanged && (newHeight > 0 || newWeight > 0))
                {
                    var newMetric = new BodyMetric
                    {
                        UserId = userId,
                        HeightCm = newHeight,
                        WeightKg = newWeight,
                        MeasuredDate = DateOnly.FromDateTime(DateTime.Now),
                        Note = "Cập nhật từ Hồ sơ"
                    };
                    await _context.BodyMetrics.AddAsync(newMetric);
                }
            }

            await _context.SaveChangesAsync();
            return await GetUserProfileAsync(userId);
        }

        public async Task DeleteUserAsync(Guid userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new KeyNotFoundException("User not found");
            }

            // Delete all related records first (due to ClientSetNull delete behavior)
            // Delete AILogs
            var aiLogs = await _context.AILogs.Where(x => x.UserId == userId).ToListAsync();
            _context.AILogs.RemoveRange(aiLogs);

            // Delete BodyMetrics
            var bodyMetrics = await _context.BodyMetrics.Where(x => x.UserId == userId).ToListAsync();
            _context.BodyMetrics.RemoveRange(bodyMetrics);

            // Delete MealDiaries
            var mealDiaries = await _context.MealDiaries
                .Where(x => x.UserId == userId)
                .ToListAsync();
            _context.MealDiaries.RemoveRange(mealDiaries);

            // Delete NutritionTargets
            var nutritionTargets = await _context.NutritionTargets.Where(x => x.UserId == userId).ToListAsync();
            _context.NutritionTargets.RemoveRange(nutritionTargets);

            // Delete UserDishes
            var userDishes = await _context.UserDishes.Where(x => x.UserId == userId).ToListAsync();
            _context.UserDishes.RemoveRange(userDishes);

            // Delete UserFavoriteFoods
            var userFavoriteFoods = await _context.UserFavoriteFoods.Where(x => x.UserId == userId).ToListAsync();
            _context.UserFavoriteFoods.RemoveRange(userFavoriteFoods);

            // Delete UserFoodItems
            var userFoodItems = await _context.UserFoodItems.Where(x => x.UserId == userId).ToListAsync();
            _context.UserFoodItems.RemoveRange(userFoodItems);

            // Delete UserRecentFoods
            var userRecentFoods = await _context.UserRecentFoods.Where(x => x.UserId == userId).ToListAsync();
            _context.UserRecentFoods.RemoveRange(userRecentFoods);

            // Finally, delete the user
            _userRepository.Remove(user);
            await _context.SaveChangesAsync();
        }
    }
}
