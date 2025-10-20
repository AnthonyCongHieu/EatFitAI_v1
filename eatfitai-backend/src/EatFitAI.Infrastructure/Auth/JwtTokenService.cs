using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using EatFitAI.Application.Auth;
using EatFitAI.Application.Configuration;
using EatFitAI.Domain.Auth;
using EatFitAI.Domain.Users;
using EatFitAI.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace EatFitAI.Infrastructure.Auth;

public class JwtTokenService : ITokenService
{
    private readonly AppDbContext _dbContext;
    private readonly JwtOptions _jwtOptions;
    private readonly ILogger<JwtTokenService> _logger;

    public JwtTokenService(
        AppDbContext dbContext,
        IOptions<JwtOptions> jwtOptions,
        ILogger<JwtTokenService> logger)
    {
        _dbContext = dbContext;
        _jwtOptions = jwtOptions.Value;
        _logger = logger;
    }

    public async Task<TokenPair> CreateTokenPairAsync(NguoiDung user, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var accessToken = GenerateJwt(user, now);
        var refreshToken = await CreateRefreshTokenAsync(user, ipAddress, now, cancellationToken);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new TokenPair(
            accessToken.Token,
            accessToken.ExpiresAt,
            refreshToken.Token,
            refreshToken.ExpiresAt);
    }

    public async Task<TokenPair> RefreshTokenAsync(string refreshTokenValue, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var refreshToken = await _dbContext.RefreshTokens
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.Token == refreshTokenValue, cancellationToken);

        if (refreshToken is null)
        {
            throw new SecurityTokenException("Invalid refresh token");
        }

        if (refreshToken.RevokedAt.HasValue)
        {
            await RevokeDescendantTokensAsync(refreshToken.ReplacedByToken, ipAddress, "Reuse detected", now, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
            throw new SecurityTokenException("Refresh token has been revoked");
        }

        if (refreshToken.ExpiresAt <= now.UtcDateTime)
        {
            refreshToken.RevokedAt = now.UtcDateTime;
            refreshToken.RevokedByIp = ipAddress;
            refreshToken.ReasonRevoked = "Expired";
            await _dbContext.SaveChangesAsync(cancellationToken);
            throw new SecurityTokenException("Refresh token expired");
        }

        var user = refreshToken.User ?? await _dbContext.Users.FirstOrDefaultAsync(x => x.Id == refreshToken.UserId, cancellationToken)
            ?? throw new SecurityTokenException("User not found for refresh token");

        refreshToken.RevokedAt = now.UtcDateTime;
        refreshToken.RevokedByIp = ipAddress;
        refreshToken.ReasonRevoked = "Rotated";

        var newRefreshToken = await CreateRefreshTokenAsync(user, ipAddress, now, cancellationToken);
        refreshToken.ReplacedByToken = newRefreshToken.Token;

        var jwt = GenerateJwt(user, now);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new TokenPair(jwt.Token, jwt.ExpiresAt, newRefreshToken.Token, newRefreshToken.ExpiresAt);
    }

    private async Task RevokeDescendantTokensAsync(string? refreshTokenValue, string? ipAddress, string reason, DateTimeOffset now, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(refreshTokenValue))
        {
            return;
        }

        var child = await _dbContext.RefreshTokens.FirstOrDefaultAsync(x => x.Token == refreshTokenValue, cancellationToken);
        if (child is null)
        {
            return;
        }

        if (!child.RevokedAt.HasValue)
        {
            child.RevokedAt = now.UtcDateTime;
            child.RevokedByIp = ipAddress;
            child.ReasonRevoked = reason;
        }

        await RevokeDescendantTokensAsync(child.ReplacedByToken, ipAddress, reason, now, cancellationToken);
    }

    private (string Token, DateTimeOffset ExpiresAt) GenerateJwt(NguoiDung user, DateTimeOffset now)
    {
        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.Key));
        var signingCredentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        if (!string.IsNullOrWhiteSpace(user.UserName))
        {
            claims.Add(new Claim(JwtRegisteredClaimNames.UniqueName, user.UserName));
        }

        var expiresAt = now.AddMinutes(_jwtOptions.AccessMinutes);
        var jwt = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: expiresAt.UtcDateTime,
            signingCredentials: signingCredentials);

        var tokenValue = new JwtSecurityTokenHandler().WriteToken(jwt);
        return (tokenValue, expiresAt);
    }

    private async Task<RefreshToken> CreateRefreshTokenAsync(NguoiDung user, string? ipAddress, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = GenerateRefreshTokenString(),
            CreatedAt = now.UtcDateTime,
            CreatedByIp = ipAddress,
            ExpiresAt = now.AddDays(_jwtOptions.RefreshDays).UtcDateTime
        };

        await _dbContext.RefreshTokens.AddAsync(refreshToken, cancellationToken);
        return refreshToken;
    }

    private static string GenerateRefreshTokenString()
    {
        var randomBytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(randomBytes);
    }
}
