using EatFitAI.API.DTOs.Auth;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IAuthService authService, ILogger<AuthController> logger)
        {
            _authService = authService;
            _logger = logger;
        }

        [AllowAnonymous]
        [HttpPost("forgot-password")]
        public async Task<ActionResult<ForgotPasswordResponse>> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var result = await _authService.ForgotPasswordAsync(request);
            return Ok(result);
        }

        [AllowAnonymous]
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            try
            {
                await _authService.ResetPasswordAsync(request);
                return Ok(new { message = "Password reset successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }

        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
        {
            try
            {
                var result = await _authService.RegisterAsync(request);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning("Registration failed for email: {Email}, error: {Error}", request.Email, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during registration for email: {Email}", request.Email);
                throw;
            }
        }

        /// <summary>
        /// Đăng ký với xác minh email - gửi mã 6 số qua email
        /// </summary>
        [AllowAnonymous]
        [HttpPost("register-with-verification")]
        public async Task<ActionResult<RegisterResponse>> RegisterWithVerification([FromBody] RegisterRequest request)
        {
            try
            {
                var result = await _authService.RegisterWithVerificationAsync(request);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during registration with verification");
                throw;
            }
            }
        }

        /// <summary>
        /// Xác minh email bằng mã 6 số - trả về JWT token nếu đúng
        /// </summary>
        [AllowAnonymous]
        [HttpPost("verify-email")]
        public async Task<ActionResult<AuthResponse>> VerifyEmail([FromBody] VerifyEmailRequest request)
        {
            try
            {
                var result = await _authService.VerifyEmailAsync(request);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Gửi lại mã xác minh email
        /// </summary>
        [AllowAnonymous]
        [HttpPost("resend-verification")]
        public async Task<ActionResult<RegisterResponse>> ResendVerification([FromBody] ResendVerificationRequest request)
        {
            try
            {
                var result = await _authService.ResendVerificationAsync(request);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Đánh dấu user đã hoàn thành onboarding
        /// </summary>
        [Authorize]
        [HttpPost("mark-onboarding-completed")]
        public async Task<IActionResult> MarkOnboardingCompleted()
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
                {
                    return Unauthorized(new { message = "Invalid user" });
                }

                await _authService.MarkOnboardingCompletedAsync(userGuid);
                return Ok(new { message = "Onboarding completed" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
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

        [AllowAnonymous]
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
