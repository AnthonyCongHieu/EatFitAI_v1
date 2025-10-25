namespace EatFitAI.Api.Contracts.Auth;

public sealed class AuthResponse
{
    public Guid UserId { get; init; }
    public string Email { get; init; } = string.Empty;
    public string? HoTen { get; init; }
    public string AccessToken { get; init; } = string.Empty;
    public DateTimeOffset AccessTokenExpiresAt { get; init; }
    public string RefreshToken { get; init; } = string.Empty;
    public DateTimeOffset RefreshTokenExpiresAt { get; init; }
}
