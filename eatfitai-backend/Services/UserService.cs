using AutoMapper;
using EatFitAI.API.Data;
using EatFitAI.API.DTOs.User;
using EatFitAI.API.Models;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services.Interfaces;

namespace EatFitAI.API.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;
        private readonly ApplicationDbContext _context;
        private readonly IMapper _mapper;

        public UserService(
            IUserRepository userRepository,
            ApplicationDbContext context,
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
    }
}