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
        _logger.LogInformation("Creating token pair for user: {UserId} from IP: {IpAddress}", user.MaNguoiDung, ipAddress ?? "unknown");

        var accessToken = GenerateJwt(user, now);
        _logger.LogInformation("Access token generated for user: {UserId}, expires at: {ExpiresAt}", user.MaNguoiDung, accessToken.ExpiresAt);

        var refreshToken = await CreateRefreshTokenAsync(user, ipAddress, now, cancellationToken);
        _logger.LogInformation("Refresh token created for user: {UserId}, expires at: {ExpiresAt}", user.MaNguoiDung, refreshToken.HetHanVao);

        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Database changes saved for token creation");

        var tokenPair = new TokenPair(
            accessToken.Token,
            accessToken.ExpiresAt,
            refreshToken.Token,
            refreshToken.HetHanVao);

        _logger.LogInformation("Token pair created successfully: AccessToken present: {HasAccess}, RefreshToken present: {HasRefresh}",
            !string.IsNullOrEmpty(tokenPair.AccessToken), !string.IsNullOrEmpty(tokenPair.RefreshToken));

        return tokenPair;
    }

    public async Task<TokenPair> RefreshTokenAsync(string refreshTokenValue, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var refreshToken = await _dbContext.RefreshToken
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.Token == refreshTokenValue, cancellationToken);

        if (refreshToken is null)
        {
            throw new SecurityTokenException("Invalid refresh token");
        }

        if (refreshToken.ThuHoiVao.HasValue)
        {
            await RevokeDescendantTokensAsync(refreshToken.ThayTheBangToken, ipAddress, "Reuse detected", now, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
            throw new SecurityTokenException("Refresh token has been revoked");
        }

        if (refreshToken.HetHanVao <= now.UtcDateTime)
        {
            refreshToken.ThuHoiVao = now.UtcDateTime;
            refreshToken.ThuHoiBoiIP = ipAddress;
            refreshToken.LyDoThuHoi = "Expired";
            await _dbContext.SaveChangesAsync(cancellationToken);
            throw new SecurityTokenException("Refresh token expired");
        }

        var user = refreshToken.User ?? await _dbContext.NguoiDung.FirstOrDefaultAsync(x => x.MaNguoiDung == refreshToken.MaNguoiDung, cancellationToken)
            ?? throw new SecurityTokenException("User not found for refresh token");

        refreshToken.ThuHoiVao = now.UtcDateTime;
        refreshToken.ThuHoiBoiIP = ipAddress;
        refreshToken.LyDoThuHoi = "Rotated";

        var newRefreshToken = await CreateRefreshTokenAsync(user, ipAddress, now, cancellationToken);
        refreshToken.ThayTheBangToken = newRefreshToken.Token;

        var jwt = GenerateJwt(user, now);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new TokenPair(jwt.Token, jwt.ExpiresAt, newRefreshToken.Token, newRefreshToken.HetHanVao);
    }

    public async Task RevokeRefreshTokenAsync(string refreshTokenValue, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var token = await _dbContext.RefreshToken
            .FirstOrDefaultAsync(x => x.Token == refreshTokenValue, cancellationToken);

        if (token is null)
        {
            return; // nothing to revoke
        }

        if (!token.ThuHoiVao.HasValue)
        {
            token.ThuHoiVao = now.UtcDateTime;
            token.ThuHoiBoiIP = ipAddress;
            token.LyDoThuHoi = "UserLogout";
        }

        // if this token had a replacement chain, revoke descendants too
        await RevokeDescendantTokensAsync(token.ThayTheBangToken, ipAddress, "AncestorLogout", now, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task RevokeDescendantTokensAsync(string? refreshTokenValue, string? ipAddress, string reason, DateTimeOffset now, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(refreshTokenValue))
        {
            return;
        }

        var child = await _dbContext.RefreshToken.FirstOrDefaultAsync(x => x.Token == refreshTokenValue, cancellationToken);
        if (child is null)
        {
            return;
        }

        if (!child.ThuHoiVao.HasValue)
        {
            child.ThuHoiVao = now.UtcDateTime;
            child.ThuHoiBoiIP = ipAddress;
            child.LyDoThuHoi = reason;
        }

        await RevokeDescendantTokensAsync(child.ThayTheBangToken, ipAddress, reason, now, cancellationToken);
    }

    private (string Token, DateTimeOffset ExpiresAt) GenerateJwt(NguoiDung user, DateTimeOffset now)
    {
        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.Key));
        var signingCredentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.MaNguoiDung.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        if (!string.IsNullOrWhiteSpace(user.HoTen))
        {
            claims.Add(new Claim(JwtRegisteredClaimNames.UniqueName, user.HoTen));
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
            MaRefreshToken = Guid.NewGuid(),
            MaNguoiDung = user.MaNguoiDung,
            Token = GenerateRefreshTokenString(),
            NgayTao = now.UtcDateTime,
            TaoBoiIP = ipAddress,
            HetHanVao = now.AddDays(_jwtOptions.RefreshDays).UtcDateTime
        };

        await _dbContext.RefreshToken.AddAsync(refreshToken, cancellationToken);
        return refreshToken;
    }

    private static string GenerateRefreshTokenString()
    {
        var randomBytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(randomBytes);
    }
}
