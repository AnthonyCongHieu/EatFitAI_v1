using EatFitAI.API.DTOs.User;

namespace EatFitAI.API.Services.Interfaces
{
    public interface IUserService
    {
        Task<UserDto> GetUserByIdAsync(Guid userId);
        Task<UserDto> UpdateUserAsync(Guid userId, UserDto userDto);
        Task<BodyMetricDto> RecordBodyMetricsAsync(Guid userId, BodyMetricDto bodyMetricDto);
    }
}