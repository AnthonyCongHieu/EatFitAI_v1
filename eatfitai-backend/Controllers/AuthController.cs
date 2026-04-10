using EatFitAI.API.DTOs.Auth;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    [EnableRateLimiting("AuthPolicy")]
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
            try
            {
                var result = await _authService.ForgotPasswordAsync(request);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(503, new { code = "smtp_unavailable", message = ex.Message });
            }
        }

        [AllowAnonymous]
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            try
            {
                await _authService.ResetPasswordAsync(request);
                return Ok(new { message = "Đặt lại mật khẩu thành công" });
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
            catch (InvalidOperationException ex)
            {
                // Email đã tồn tại - trả về 400 thay vì 500
                _logger.LogWarning("Registration failed for email: {Email}, error: {Error}", request.Email, ex.Message);
                return BadRequest(new { message = ex.Message });
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
                _logger.LogError(ex, "Error during registration with verification");
                throw;
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
                return StatusCode(503, new { message = ex.Message });
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
                if (ex.Message.Contains("Không gửi được email", StringComparison.OrdinalIgnoreCase))
                {
                    return StatusCode(503, new { code = "smtp_unavailable", message = ex.Message });
                }

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
                    return Unauthorized(new { message = "Người dùng không hợp lệ" });
                }

                await _authService.MarkOnboardingCompletedAsync(userGuid);
                return Ok(new { message = "Đã hoàn tất onboarding" });
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
                return Ok(new { message = "Đăng xuất thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi khi đăng xuất", error = ex.Message });
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
                return StatusCode(500, new { message = "Đã xảy ra lỗi khi làm mới token", error = ex.Message });
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
                return StatusCode(500, new { message = "Đã xảy ra lỗi khi đăng nhập bằng Google", error = ex.Message });
            }
        }

        /// <summary>
        /// Đổi mật khẩu cho user đã đăng nhập
        /// </summary>
        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
                {
                    return Unauthorized(new { message = "Người dùng không hợp lệ" });
                }

                await _authService.ChangePasswordAsync(userGuid, request.CurrentPassword, request.NewPassword);
                return Ok(new { message = "Đổi mật khẩu thành công" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing password");
                return StatusCode(500, new { message = "Đã xảy ra lỗi khi đổi mật khẩu" });
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

