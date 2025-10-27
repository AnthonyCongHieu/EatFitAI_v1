using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using Asp.Versioning;
using EatFitAI.Api.Contracts.Auth;
using EatFitAI.Application.Auth;
using EatFitAI.Application.Repositories;
using EatFitAI.Domain.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace EatFitAI.Api.Controllers;

/// <summary>
/// Authentication controller for user registration, login, and token management.
/// </summary>
[ApiController]
[Route("api/auth")]
[AllowAnonymous]
[ApiVersion("1.0")]
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

    /// <summary>
    /// Registers a new user account.
    /// </summary>
    /// <param name="request">The registration request containing user details.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Authentication response with tokens if successful.</returns>
    /// <response code="200">User registered successfully.</response>
    /// <response code="400">Invalid request data.</response>
    /// <response code="422">Email already exists.</response>
    /// <response code="500">Internal server error.</response>
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Registration attempt for email: {Email}", request.Email);

        // Check if email already exists (for Gmail users)
        var existingUser = await _authRepository.FindByEmailAsync(request.Email, cancellationToken);
        if (existingUser is not null)
        {
            _logger.LogWarning("Email already exists: {Email}", request.Email);
            return Problem(statusCode: StatusCodes.Status422UnprocessableEntity, title: "Email da ton tai");
        }

        // Validate password
        var passwordErrors = ValidatePassword(request.MatKhau);
        if (passwordErrors.Any())
        {
            _logger.LogWarning("Password validation failed for email: {Email}, errors: {Errors}", request.Email, string.Join(", ", passwordErrors));
            return ValidationProblem(CreateValidationProblem(passwordErrors));
        }

        // Hash password
        var passwordHash = HashPassword(request.MatKhau);

        // Create user (race condition handled by database unique constraint)
        _logger.LogInformation("Creating user for email: {Email}", request.Email);
        try
        {
            var user = await _authRepository.CreateUserAsync(request.Email, passwordHash, request.HoTen, cancellationToken);
            _logger.LogInformation("User created successfully for email: {Email}, userId: {UserId}", request.Email, user?.MaNguoiDung);

            if (user is null)
            {
                _logger.LogError("User creation returned null for email: {Email}", request.Email);
                return Problem(statusCode: StatusCodes.Status500InternalServerError, title: "Loi tao tai khoan");
            }

            var tokens = await _tokenService.CreateTokenPairAsync(user, GetClientIp(), cancellationToken);
            return Ok(ToAuthResponse(user, tokens, request.HoTen));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create user for email: {Email}, error: {ErrorMessage}", request.Email, ex.Message);
            // Handle duplicate email error from database constraint (fallback)
            if (ex.Message.Contains("Email đã được sử dụng", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Email already exists: {Email}", request.Email);
                return Problem(statusCode: StatusCodes.Status422UnprocessableEntity, title: "Email da ton tai");
            }
            throw; // Re-throw other exceptions
        }
    }

    /// <summary>
    /// Authenticates a user and returns access tokens.
    /// </summary>
    /// <param name="request">The login request containing email and password.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Authentication response with tokens if successful.</returns>
    /// <response code="200">Login successful.</response>
    /// <response code="401">Invalid credentials.</response>
    /// <response code="500">Internal server error.</response>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Login attempt for email: {Email}", request.Email);

        var user = await _authRepository.FindByEmailAsync(request.Email, cancellationToken);
        if (user is null)
        {
            _logger.LogWarning("User not found for email: {Email}", request.Email);
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Sai email hoac mat khau");
        }

        _logger.LogInformation("User found: {UserId}, verifying password", user.MaNguoiDung);

        // Debug: Log the actual type and value of MatKhauHash
        _logger.LogInformation("MatKhauHash type: {Type}, value type: {ValueType}, is null: {IsNull}",
            user.MatKhauHash?.GetType()?.FullName ?? "null",
            user.MatKhauHash?.GetType()?.Name ?? "null",
            user.MatKhauHash == null);

        if (user.MatKhauHash != null)
        {
            _logger.LogInformation("MatKhauHash length: {Length}, first 10 bytes: {FirstBytes}",
                user.MatKhauHash.Length,
                BitConverter.ToString(user.MatKhauHash.Take(10).ToArray()));
        }
        else
        {
            _logger.LogError("MatKhauHash is null for user {UserId}", user.MaNguoiDung);
        }

        // Verify password
        if (user.MatKhauHash == null)
        {
            _logger.LogError("Cannot verify password: MatKhauHash is null for user {UserId}", user.MaNguoiDung);
            return Problem(statusCode: StatusCodes.Status500InternalServerError, title: "Loi he thong");
        }

        _logger.LogInformation("Stored hash length: {HashLength}, is empty: {IsEmpty}", user.MatKhauHash.Length, user.MatKhauHash.Length == 0);
        if (!VerifyPassword(request.MatKhau, user.MatKhauHash))
        {
            _logger.LogWarning("Password verification failed for user: {UserId}", user.MaNguoiDung);
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Sai email hoac mat khau");
        }

        _logger.LogInformation("Password verified, creating tokens for user: {UserId}", user.MaNguoiDung);

        var tokens = await _tokenService.CreateTokenPairAsync(user, GetClientIp(), cancellationToken);

        _logger.LogInformation("Tokens created successfully for user: {UserId}, access token length: {AccessTokenLength}, refresh token length: {RefreshTokenLength}",
            user.MaNguoiDung, tokens.AccessToken?.Length ?? 0, tokens.RefreshToken?.Length ?? 0);

        return Ok(ToAuthResponse(user, tokens));
    }

    /// <summary>
    /// Refreshes access token using refresh token.
    /// </summary>
    /// <param name="request">The refresh request containing refresh token.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>New authentication response with fresh tokens.</returns>
    /// <response code="200">Token refreshed successfully.</response>
    /// <response code="401">Invalid or expired refresh token.</response>
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
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

    /// <summary>
    /// Authenticates a user using Google OAuth ID token.
    /// </summary>
    /// <param name="request">The Google login request containing ID token.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Authentication response with tokens.</returns>
    /// <response code="200">Google login successful.</response>
    /// <response code="422">Invalid ID token.</response>
    /// <response code="500">Internal server error.</response>
    [HttpPost("google")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
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

    /// <summary>
    /// Logs out a user by revoking the refresh token.
    /// </summary>
    /// <param name="request">The logout request containing refresh token.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>No content on successful logout.</returns>
    /// <response code="204">Logout successful.</response>
    /// <response code="422">Invalid request.</response>
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
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
        var hash = BCrypt.Net.BCrypt.HashPassword(password);
        return Encoding.UTF8.GetBytes(hash);
    }

    private static bool VerifyPassword(string password, byte[] storedHash)
    {
        if (storedHash.Length == 0)
        {
            return false;
        }

        try
        {
            // Try multiple decodings because DB may store VARBINARY of UTF-8 or NVARCHAR cast to VARBINARY (UTF-16)
            var candidates = new List<string>(4)
            {
                Encoding.UTF8.GetString(storedHash),
                Encoding.ASCII.GetString(storedHash),
                Encoding.Unicode.GetString(storedHash),
                Encoding.BigEndianUnicode.GetString(storedHash)
            };

            foreach (var candidate in candidates)
            {
                if (!string.IsNullOrWhiteSpace(candidate) && candidate.StartsWith("$2", StringComparison.Ordinal))
                {
                    if (BCrypt.Net.BCrypt.Verify(password, candidate))
                    {
                        return true;
                    }
                }
            }

            // As a last resort, strip nulls from potential UTF-16 representations and try again
            var noNulls = new string(candidates[2].Where(ch => ch != '\0').ToArray());
            if (noNulls.StartsWith("$2", StringComparison.Ordinal) && BCrypt.Net.BCrypt.Verify(password, noNulls))
            {
                return true;
            }

            return false;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Password verification failed with exception: {ex.Message}");
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
