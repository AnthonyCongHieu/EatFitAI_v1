using EatFitAI.API.DTOs.User;

namespace EatFitAI.API.Services.Interfaces
{
    public interface IUserService
    {
        Task<UserDto> GetUserByIdAsync(Guid userId);
        Task<UserDto> UpdateUserAsync(Guid userId, UserDto userDto);
        Task<UserProfileDto> GetUserProfileAsync(Guid userId);
        Task<UserProfileDto> UpdateUserProfileAsync(Guid userId, UserProfileDto userProfileDto);
        Task<BodyMetricDto> RecordBodyMetricsAsync(Guid userId, BodyMetricDto bodyMetricDto);
        Task<List<BodyMetricDto>> GetBodyMetricsHistoryAsync(Guid userId, int limit = 30);
        Task DeleteUserAsync(Guid userId);
    }
}
