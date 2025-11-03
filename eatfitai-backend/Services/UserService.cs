using AutoMapper;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.User;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services.Interfaces;

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
    }
}
