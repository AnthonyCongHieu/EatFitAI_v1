using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using EatFitAI.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.Infrastructure.Auth;

public record TokenPair(string AccessToken, DateTime AccessExpiresAt, string RefreshToken, DateTime RefreshExpiresAt);

public interface IJwtTokenService
{
    Task<TokenPair> IssueAsync(IdentityUser<Guid> user, string? createdByIp = null, CancellationToken ct = default);
    Task<(IdentityUser<Guid>? user, RefreshToken? token)> ValidateRefreshAsync(string refreshToken, CancellationToken ct = default);
    Task<TokenPair> RotateAsync(IdentityUser<Guid> user, RefreshToken token, string? ip, CancellationToken ct = default);
}

public class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _config;
    private readonly EatFitAI.Infrastructure.Data.EatFitAIDbContext _db;
    private readonly UserManager<IdentityUser<Guid>> _userManager;

    public JwtTokenService(IConfiguration config, EatFitAI.Infrastructure.Data.EatFitAIDbContext db, UserManager<IdentityUser<Guid>> userManager)
    {
        _config = config;
        _db = db;
        _userManager = userManager;
    }

    public async Task<TokenPair> IssueAsync(IdentityUser<Guid> user, string? createdByIp = null, CancellationToken ct = default)
    {
        var (accessToken, accessExp) = CreateAccessToken(user);

        var refreshExp = DateTime.UtcNow.AddDays(7);
        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = GenerateSecureToken(),
            ExpiresAt = refreshExp,
            CreatedAt = DateTime.UtcNow,
            CreatedByIp = createdByIp
        };
        _db.RefreshTokens.Add(refreshToken);
        await _db.SaveChangesAsync(ct);

        return new TokenPair(accessToken, accessExp, refreshToken.Token, refreshExp);
    }

    public async Task<(IdentityUser<Guid>? user, RefreshToken? token)> ValidateRefreshAsync(string refreshToken, CancellationToken ct = default)
    {
        var token = await _db.RefreshTokens.AsQueryable().FirstOrDefaultAsync(t => t.Token == refreshToken, ct);
        if (token == null) return (null, null);
        if (token.RevokedAt != null)
        {
            await RevokeAllActiveForUser(token.UserId, "reused_token", ct);
            return (null, token);
        }
        if (token.ExpiresAt < DateTime.UtcNow) return (null, token);

        var user = await _userManager.FindByIdAsync(token.UserId.ToString());
        return (user, token);
    }

    public async Task<TokenPair> RotateAsync(IdentityUser<Guid> user, RefreshToken token, string? ip, CancellationToken ct = default)
    {
        token.RevokedAt = DateTime.UtcNow;
        token.RevokedByIp = ip;
        var newToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = GenerateSecureToken(),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            CreatedByIp = ip
        };
        token.ReplacedByToken = newToken.Token;
        _db.RefreshTokens.Add(newToken);
        await _db.SaveChangesAsync(ct);

        var (access, accessExp) = CreateAccessToken(user);
        return new TokenPair(access, accessExp, newToken.Token, newToken.ExpiresAt);
    }

    private async Task RevokeAllActiveForUser(Guid userId, string reason, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var actives = _db.RefreshTokens.Where(t => t.UserId == userId && t.RevokedAt == null && t.ExpiresAt > now);
        await actives.ExecuteUpdateAsync(s => s
            .SetProperty(t => t.RevokedAt, now)
            .SetProperty(t => t.ReasonRevoked, reason), ct);
    }

    private (string token, DateTime expiresAt) CreateAccessToken(IdentityUser<Guid> user)
    {
        var key = _config["Jwt:Key"] ?? _config["Jwt__Key"] ?? "dev_secret_key_change_me";
        var issuer = _config["Jwt:Issuer"] ?? _config["Jwt__Issuer"] ?? "eatfitai";
        var audience = _config["Jwt:Audience"] ?? _config["Jwt__Audience"] ?? "eatfitai.app";
        var expires = DateTime.UtcNow.AddMinutes(15);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
        var jwt = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expires,
            signingCredentials: creds
        );
        return (new JwtSecurityTokenHandler().WriteToken(jwt), expires);
    }

    private static string GenerateSecureToken()
    {
        var bytes = new byte[64];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes);
    }
}
