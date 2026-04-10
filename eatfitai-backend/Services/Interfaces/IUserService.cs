using EatFitAI.API.DTOs.User;
using Microsoft.AspNetCore.Http;

namespace EatFitAI.API.Services.Interfaces
{
    public interface IUserService
    {
        Task<UserDto> GetUserByIdAsync(Guid userId);
        Task<UserDto> UpdateUserAsync(Guid userId, UserDto userDto);
        Task<UserProfileDto> GetUserProfileAsync(Guid userId);
        Task<UserProfileDto> UpdateUserProfileAsync(Guid userId, UserProfileDto userProfileDto);
        Task<string> UpdateAvatarAsync(Guid userId, IFormFile file, string? uploadsRoot);
        Task<BodyMetricDto> RecordBodyMetricsAsync(Guid userId, BodyMetricDto bodyMetricDto);
        Task<List<BodyMetricDto>> GetBodyMetricsHistoryAsync(Guid userId, int limit = 30);
        Task DeleteUserAsync(Guid userId);
    }
}
