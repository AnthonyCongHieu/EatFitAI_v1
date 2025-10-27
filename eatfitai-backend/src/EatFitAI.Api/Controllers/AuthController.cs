using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using EatFitAI.Api.Contracts.Auth;
using EatFitAI.Application.Auth;
using EatFitAI.Application.Repositories;
using EatFitAI.Domain.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace EatFitAI.Api.Controllers;

[ApiController]
[Route("api/auth")]
[AllowAnonymous]
public class AuthController : ControllerBase
{
    private readonly IAuthRepository _authRepository;
    private readonly ITokenService _tokenService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IAuthRepository authRepository,
        ITokenService tokenService,
        ILogger<AuthController> logger)
    {
        _authRepository = authRepository;
        _tokenService = tokenService;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        // Validate password
        var passwordErrors = ValidatePassword(request.MatKhau);
        if (passwordErrors.Any())
        {
            return ValidationProblem(CreateValidationProblem(passwordErrors));
        }

        // Check if email exists
        var existing = await _authRepository.FindByEmailAsync(request.Email, cancellationToken);
        if (existing is not null)
        {
            return Problem(statusCode: StatusCodes.Status422UnprocessableEntity, title: "Email da ton tai");
        }

        // Hash password
        var passwordHash = HashPassword(request.MatKhau);

        // Create user
        var user = await _authRepository.CreateUserAsync(request.Email, passwordHash, request.HoTen, cancellationToken);

        var tokens = await _tokenService.CreateTokenPairAsync(user, GetClientIp(), cancellationToken);
        return Ok(ToAuthResponse(user, tokens, request.HoTen));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await _authRepository.FindByEmailAsync(request.Email, cancellationToken);
        if (user is null)
        {
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Sai email hoac mat khau");
        }

        // Verify password
        if (!VerifyPassword(request.MatKhau, user.MatKhauHash))
        {
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Sai email hoac mat khau");
        }

        var tokens = await _tokenService.CreateTokenPairAsync(user, GetClientIp(), cancellationToken);
        return Ok(ToAuthResponse(user, tokens));
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var tokens = await _tokenService.RefreshTokenAsync(request.MaRefreshToken, GetClientIp(), cancellationToken);
            var user = await GetUserFromAccessTokenAsync(tokens.AccessToken, cancellationToken);
            if (user is null)
            {
                return Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Khong tim thay nguoi dung");
            }

            return Ok(ToAuthResponse(user, tokens));
        }
        catch (SecurityTokenException ex)
        {
            _logger.LogWarning(ex, "Refresh token rejected");
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: ex.Message);
        }
    }

    [HttpPost("google")]
    public async Task<IActionResult> Google([FromBody] GoogleLoginRequest request, CancellationToken cancellationToken)
    {
        if (!TryExtractEmail(request.MaIdToken, out var email))
        {
            return Problem(statusCode: StatusCodes.Status422UnprocessableEntity, title: "Khong doc duoc email tu id_token");
        }

        var user = await _authRepository.FindByEmailAsync(email, cancellationToken);
        if (user is null)
        {
            // Create user with random password for Google login
            var randomPassword = $"Gg!{Guid.NewGuid():N}";
            var passwordHash = HashPassword(randomPassword);
            user = await _authRepository.CreateUserAsync(email, passwordHash, null, cancellationToken);
        }

        var tokens = await _tokenService.CreateTokenPairAsync(user, GetClientIp(), cancellationToken);
        return Ok(ToAuthResponse(user, tokens));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.MaRefreshToken))
        {
            return Problem(statusCode: StatusCodes.Status422UnprocessableEntity, title: "Thieu refresh token");
        }

        await _tokenService.RevokeRefreshTokenAsync(request.MaRefreshToken, GetClientIp(), cancellationToken);
        return NoContent();
    }

    private ValidationProblemDetails CreateValidationProblem(IEnumerable<string> errors)
    {
        var details = new ValidationProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Type = "https://httpstatuses.io/400",
            Title = "Đăng ký không hợp lệ",
            Detail = "Vui lòng kiểm tra lại thông tin nhập vào."
        };

        foreach (var error in errors)
        {
            if (!details.Errors.ContainsKey("password"))
            {
                details.Errors["password"] = [error];
            }
            else
            {
                var currentErrors = details.Errors["password"].ToList();
                currentErrors.Add(error);
                details.Errors["password"] = currentErrors.Distinct().ToArray();
            }
        }

        return details;
    }

    private static List<string> ValidatePassword(string password)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(password) || password.Length < 6)
        {
            errors.Add("Mật khẩu phải có ít nhất 6 ký tự.");
        }

        if (!password.Any(char.IsUpper))
        {
            errors.Add("Mật khẩu cần chứa ít nhất một chữ hoa.");
        }

        if (!password.Any(char.IsLower))
        {
            errors.Add("Mật khẩu cần chứa ít nhất một chữ thường.");
        }

        if (!password.Any(char.IsDigit))
        {
            errors.Add("Mật khẩu cần chứa ít nhất một chữ số.");
        }

        return errors;
    }

    private static byte[] HashPassword(string password)
    {
        // BCrypt tự động thêm salt và sử dụng thuật toán an toàn
        var hash = BCrypt.Net.BCrypt.HashPassword(password);
        return Encoding.UTF8.GetBytes(hash);
    }

    private static bool VerifyPassword(string password, byte[] storedHash)
    {
        try
        {
            var hashString = Encoding.UTF8.GetString(storedHash);
            return BCrypt.Net.BCrypt.Verify(password, hashString);
        }
        catch
        {
            return false;
        }
    }

    private string? GetClientIp()
    {
        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }

    private static bool TryExtractEmail(string idToken, out string email)
    {
        email = string.Empty;

        if (string.IsNullOrWhiteSpace(idToken))
        {
            return false;
        }

        var handler = new JwtSecurityTokenHandler();
        if (handler.CanReadToken(idToken))
        {
            var token = handler.ReadJwtToken(idToken);
            email = token.Claims.FirstOrDefault(c => c.Type == "email" || c.Type == ClaimTypes.Email)?.Value ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(email))
            {
                return true;
            }
        }

        if (idToken.Contains("|", StringComparison.Ordinal))
        {
            var parts = idToken.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (parts.Length >= 2)
            {
                email = parts[1];
                return true;
            }
        }

        return false;
    }

    private async Task<NguoiDung?> GetUserFromAccessTokenAsync(string accessToken, CancellationToken cancellationToken)
    {
        var handler = new JwtSecurityTokenHandler();
        if (!handler.CanReadToken(accessToken))
        {
            return null;
        }

        var token = handler.ReadJwtToken(accessToken);
        var sub = token.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub)?.Value;
        if (string.IsNullOrWhiteSpace(sub) || !Guid.TryParse(sub, out var userId))
        {
            return null;
        }

        return await _authRepository.FindByIdAsync(userId, cancellationToken);
    }

    private static AuthResponse ToAuthResponse(NguoiDung user, TokenPair tokens, string? fullNameOverride = null)
    {
        return new AuthResponse
        {
            MaNguoiDung = user.MaNguoiDung,
            Email = user.Email ?? string.Empty,
            HoTen = fullNameOverride ?? user.HoTen,
            MaAccessToken = tokens.AccessToken,
            ThoiGianHetHanAccessToken = tokens.AccessTokenExpiresAt,
            MaRefreshToken = tokens.RefreshToken,
            ThoiGianHetHanRefreshToken = tokens.RefreshTokenExpiresAt
        };
    }
}
