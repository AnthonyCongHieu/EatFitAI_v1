using EatFitAI.Domain.Users;

namespace EatFitAI.Application.Auth;

public interface ITokenService
{
    Task<TokenPair> CreateTokenPairAsync(NguoiDung user, string? ipAddress, CancellationToken cancellationToken = default);
    Task<TokenPair> RefreshTokenAsync(string refreshToken, string? ipAddress, CancellationToken cancellationToken = default);
    Task RevokeRefreshTokenAsync(string refreshToken, string? ipAddress, CancellationToken cancellationToken = default);
}
