namespace EatFitAI.Api.Contracts.Auth;

public sealed class AuthResponse
{
    public Guid MaNguoiDung { get; init; }
    public string Email { get; init; } = string.Empty;
    public string? HoTen { get; init; }
    public string MaAccessToken { get; init; } = string.Empty;
    public DateTimeOffset ThoiGianHetHanAccessToken { get; init; }
    public string MaRefreshToken { get; init; } = string.Empty;
    public DateTimeOffset ThoiGianHetHanRefreshToken { get; init; }
}
