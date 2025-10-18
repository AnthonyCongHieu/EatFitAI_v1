namespace EatFitAI.Api.Auth;

public record RegisterRequest(string Email, string Password, string? HoTen);
public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken);
public record GoogleRequest(string IdToken);

public record AuthResponse(string AccessToken, string RefreshToken, string TokenType, int ExpiresIn);

