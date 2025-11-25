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

        public async Task<UserProfileDto> GetUserProfileAsync(Guid userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) throw new KeyNotFoundException("User not found");

            var userProfile = _mapper.Map<UserProfileDto>(user);

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

            return userProfile;
        }

        public async Task<UserProfileDto> UpdateUserProfileAsync(Guid userId, UserProfileDto userProfileDto)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) throw new KeyNotFoundException("User not found");

            // Update User info
            user.DisplayName = userProfileDto.DisplayName;
            _userRepository.Update(user);

            // Check if metrics changed
            if (userProfileDto.CurrentHeightCm.HasValue || userProfileDto.CurrentWeightKg.HasValue)
            {
                 var latestMetric = await _context.BodyMetrics
                    .Where(bm => bm.UserId == userId)
                    .OrderByDescending(bm => bm.MeasuredDate)
                    .ThenByDescending(bm => bm.BodyMetricId)
                    .FirstOrDefaultAsync();
                
                decimal newHeight = userProfileDto.CurrentHeightCm ?? latestMetric?.HeightCm ?? 0;
                decimal newWeight = userProfileDto.CurrentWeightKg ?? latestMetric?.WeightKg ?? 0;

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
    }
}
