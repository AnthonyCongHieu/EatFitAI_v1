using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using EatFitAI.Api.Contracts.Auth;
using EatFitAI.Application.Auth;
using EatFitAI.Domain.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace EatFitAI.Api.Controllers;

[ApiController]
[Route("api/auth")]
[AllowAnonymous]
public class AuthController : ControllerBase
{
    private readonly UserManager<NguoiDung> _userManager;
    private readonly SignInManager<NguoiDung> _signInManager;
    private readonly ITokenService _tokenService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        UserManager<NguoiDung> userManager,
        SignInManager<NguoiDung> signInManager,
        ITokenService tokenService,
        ILogger<AuthController> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _tokenService = tokenService;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing is not null)
        {
            return Problem(statusCode: StatusCodes.Status422UnprocessableEntity, title: "Email da ton tai");
        }

        var user = new NguoiDung
        {
            Email = request.Email,
            HoTen = request.HoTen,
            GioiTinh = null,
            NgaySinh = null,
            NgayTao = DateTime.UtcNow,
            NgayCapNhat = DateTime.UtcNow
        };

        var createResult = await _userManager.CreateAsync(user, request.MatKhau);
        if (!createResult.Succeeded)
        {
            return ValidationProblem(CreateValidationProblem(createResult.Errors));
        }

        // Profile is now part of NguoiDung, no separate profile creation needed
        if (!string.IsNullOrWhiteSpace(request.HoTen))
        {
            user.HoTen = request.HoTen;
        }

        await _userManager.UpdateAsync(user);

        var tokens = await _tokenService.CreateTokenPairAsync(user, GetClientIp(), cancellationToken);
        return Ok(ToAuthResponse(user, tokens, request.HoTen));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Sai email hoac mat khau");
        }

        var signInResult = await _signInManager.CheckPasswordSignInAsync(user, request.MatKhau, false);
        if (!signInResult.Succeeded)
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

        var user = await _userManager.FindByEmailAsync(email);
        if (user is null)
        {
            user = new NguoiDung
            {
                Email = email,
                HoTen = null,
                GioiTinh = null,
                NgaySinh = null,
                NgayTao = DateTime.UtcNow,
                NgayCapNhat = DateTime.UtcNow
            };

            var randomPassword = $"Gg!{Guid.NewGuid():N}";
            var createResult = await _userManager.CreateAsync(user, randomPassword);
            if (!createResult.Succeeded)
            {
                _logger.LogError("Tao tai khoan google that bai: {Errors}", string.Join(";", createResult.Errors.Select(e => e.Description)));
                foreach (var error in createResult.Errors)
                {
                    ModelState.AddModelError(error.Code, error.Description);
                }

                return ValidationProblem(ModelState);
            }
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

    private ValidationProblemDetails CreateValidationProblem(IEnumerable<IdentityError> errors)
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
            var key = error.Code switch
            {
                "PasswordTooShort" => "password",
                "PasswordRequiresUpper" => "password",
                "PasswordRequiresLower" => "password",
                "PasswordRequiresDigit" => "password",
                "PasswordRequiresNonAlphanumeric" => "password",
                "DuplicateEmail" => "email",
                "InvalidEmail" => "email",
                _ => string.Empty
            };

            var message = error.Code switch
            {
                "PasswordTooShort" => "Mật khẩu phải có ít nhất 6 ký tự.",
                "PasswordRequiresUpper" => "Mật khẩu cần chứa ít nhất một chữ hoa.",
                "PasswordRequiresLower" => "Mật khẩu cần chứa ít nhất một chữ thường.",
                "PasswordRequiresDigit" => "Mật khẩu cần chứa ít nhất một chữ số.",
                "PasswordRequiresNonAlphanumeric" => "Mật khẩu cần chứa ký tự đặc biệt.",
                "DuplicateEmail" => "Email đã được sử dụng.",
                "InvalidEmail" => "Email không hợp lệ.",
                _ => error.Description
            };

            var targetKey = string.IsNullOrWhiteSpace(key) ? string.Empty : key;
            if (!details.Errors.ContainsKey(targetKey))
            {
                details.Errors[targetKey] = [message];
            }
            else
            {
                details.Errors[targetKey] = details.Errors[targetKey].Concat(new[] { message }).Distinct().ToArray();
            }
        }

        return details;
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

        return await _userManager.FindByIdAsync(userId.ToString());
    }

    private static AuthResponse ToAuthResponse(NguoiDung user, TokenPair tokens, string? fullNameOverride = null)
    {
        return new AuthResponse
        {
            MaNguoiDung = user.Id,
            Email = user.Email ?? string.Empty,
            HoTen = fullNameOverride ?? user.HoTen,
            MaAccessToken = tokens.AccessToken,
            ThoiGianHetHanAccessToken = tokens.AccessTokenExpiresAt,
            MaRefreshToken = tokens.RefreshToken,
            ThoiGianHetHanRefreshToken = tokens.RefreshTokenExpiresAt
        };
    }
}
