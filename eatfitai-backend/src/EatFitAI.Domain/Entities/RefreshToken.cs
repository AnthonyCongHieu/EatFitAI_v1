using System;

namespace EatFitAI.Domain.Entities;

public class RefreshToken
{
    public Guid RefreshTokenId { get; set; }

    public Guid MaNguoiDung { get; set; }

    public string Token { get; set; } = null!;

    public string? JwtId { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public string? CreatedByIp { get; set; }

    public DateTimeOffset? RevokedAt { get; set; }

    public string? RevokedByIp { get; set; }

    public string? RevokedReason { get; set; }

    public string? ReplacedByToken { get; set; }
}
