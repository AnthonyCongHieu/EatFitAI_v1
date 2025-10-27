using EatFitAI.Domain.Users;

namespace EatFitAI.Application.Repositories;

public interface IAuthRepository
{
    Task<NguoiDung?> FindByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<NguoiDung?> FindByIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<NguoiDung> CreateUserAsync(string email, byte[] passwordHash, string? hoTen, CancellationToken cancellationToken = default);
}
