using EatFitAI.API.DTOs.Auth;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("register")]
        public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
        {
            try
            {
                Console.WriteLine($"[AuthController] Registration attempt for email: {request.Email}");
                var result = await _authService.RegisterAsync(request);
                Console.WriteLine($"[AuthController] Registration successful for email: {request.Email}");
                Console.WriteLine($"[AuthController] Full AuthResponse: UserId={result.UserId}, Email={result.Email}, DisplayName={result.DisplayName}, Token={result.Token?.Substring(0, Math.Min(20, result.Token.Length))}..., ExpiresAt={result.ExpiresAt}, RefreshToken={result.RefreshToken?.Substring(0, Math.Min(20, result.RefreshToken.Length))}..., RefreshTokenExpiresAt={result.RefreshTokenExpiresAt}");
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                Console.WriteLine($"[AuthController] Registration failed for email: {request.Email}, error: {ex.Message}");
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AuthController] Unexpected error during registration for email: {request.Email}, error: {ex.Message}");
                throw;
            }
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
        {
            try
            {
                var result = await _authService.LoginAsync(request);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromBody] LogoutRequest request)
        {
            try
            {
                await _authService.LogoutAsync(request.MaRefreshToken);
                return Ok(new { message = "Logged out successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred during logout", error = ex.Message });
            }
        }

        [HttpPost("refresh")]
        public async Task<ActionResult<AuthResponse>> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            try
            {
                var result = await _authService.RefreshTokenAsync(request.RefreshToken);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred during token refresh", error = ex.Message });
            }
        }

        [HttpGet("google")]
        public async Task<ActionResult<AuthResponse>> GoogleLogin([FromQuery] string idToken)
        {
            try
            {
                var result = await _authService.GoogleLoginAsync(idToken);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred during Google login", error = ex.Message });
            }
        }
    }

    public class LogoutRequest
    {
        public string MaRefreshToken { get; set; } = string.Empty;
    }

    public class RefreshTokenRequest
    {
        public string RefreshToken { get; set; } = string.Empty;
    }
}