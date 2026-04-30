using EatFitAI.API.DTOs.Auth;
using EatFitAI.API.Helpers;
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
                _logger.LogWarning(ex, "Forgot password email unavailable for {Email}", request.Email);
                return StatusCode(503, ErrorResponseHelper.SafeError(
                    "smtp_unavailable",
                    "Không thể gửi email đặt lại mật khẩu lúc này.",
                    HttpContext));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during forgot password for {Email}", request.Email);
                return StatusCode(500, ErrorResponseHelper.SafeError(
                    "Đã xảy ra lỗi khi xử lý quên mật khẩu",
                    HttpContext));
            }
        }

        [AllowAnonymous]
        [HttpPost("verify-reset-code")]
        public async Task<IActionResult> VerifyResetCode([FromBody] VerifyResetCodeRequest request)
        {
            try
            {
                await _authService.VerifyResetCodeAsync(request);
                return Ok(new { message = "Mã hợp lệ" });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Mã xác minh không hợp lệ hoặc đã hết hạn", HttpContext));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during verify reset code for {Email}", request.Email);
                return StatusCode(500, ErrorResponseHelper.SafeError(
                    "Đã xảy ra lỗi khi xác minh mã đặt lại mật khẩu",
                    HttpContext));
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
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn", HttpContext));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during reset password for {Email}", request.Email);
                return StatusCode(500, ErrorResponseHelper.SafeError(
                    "Đã xảy ra lỗi khi đặt lại mật khẩu",
                    HttpContext));
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
            catch (NotSupportedException)
            {
                _logger.LogWarning("Legacy registration blocked for email: {Email}", request.Email);
                return StatusCode(StatusCodes.Status410Gone, ErrorResponseHelper.SafeError("Phương thức đăng ký này không còn được hỗ trợ", HttpContext));
            }
            catch (InvalidOperationException ex)
            {
                // Email đã tồn tại - trả về 400 thay vì 500
                _logger.LogWarning("Registration failed for email: {Email}, error: {Error}", request.Email, ex.Message);
                return BadRequest(ErrorResponseHelper.SafeError("Không thể đăng ký với thông tin đã cung cấp", HttpContext));
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning("Registration failed for email: {Email}, error: {Error}", request.Email, ex.Message);
                return BadRequest(ErrorResponseHelper.SafeError("Thông tin đăng ký không hợp lệ", HttpContext));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during registration for email: {Email}", request.Email);
                return StatusCode(500, ErrorResponseHelper.SafeError(
                    "Đã xảy ra lỗi khi đăng ký tài khoản",
                    HttpContext));
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
            catch (InvalidOperationException)
            {
                return BadRequest(ErrorResponseHelper.SafeError("Không thể đăng ký với thông tin đã cung cấp", HttpContext));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during registration with verification");
                return StatusCode(500, ErrorResponseHelper.SafeError(
                    "Đã xảy ra lỗi khi đăng ký tài khoản",
                    HttpContext));
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
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Mã xác minh không hợp lệ hoặc đã hết hạn", HttpContext));
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Verify email temporarily unavailable for {Email}", request.Email);
                return StatusCode(503, ErrorResponseHelper.SafeError(
                    "verification_unavailable",
                    "Không thể xác minh email lúc này.",
                    HttpContext));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during verify email for {Email}", request.Email);
                return StatusCode(500, ErrorResponseHelper.SafeError(
                    "Đã xảy ra lỗi khi xác minh email",
                    HttpContext));
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
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Yêu cầu không hợp lệ", HttpContext));
            }
            catch (InvalidOperationException ex)
            {
                if (ex.Message.Contains("Không gửi được email", StringComparison.OrdinalIgnoreCase))
                {
                    return StatusCode(503, ErrorResponseHelper.SafeError(
                        "smtp_unavailable",
                        "Không thể gửi lại email xác minh lúc này.",
                        HttpContext));
                }

                return BadRequest(ErrorResponseHelper.SafeError("Không thể gửi lại mã xác minh", HttpContext));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during resend verification for {Email}", request.Email);
                return StatusCode(500, ErrorResponseHelper.SafeError(
                    "Đã xảy ra lỗi khi gửi lại mã xác minh",
                    HttpContext));
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
                _logger.LogError(ex, "Unexpected error while marking onboarding completed");
                return StatusCode(500, ErrorResponseHelper.SafeError(
                    "Đã xảy ra lỗi khi cập nhật trạng thái onboarding",
                    HttpContext));
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
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Email hoặc mật khẩu không đúng", HttpContext));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during login for {Email}", request.Email);
                return StatusCode(500, ErrorResponseHelper.SafeError(
                    "Đã xảy ra lỗi khi đăng nhập",
                    HttpContext));
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
                _logger.LogError(ex, "Unexpected error during logout");
                return StatusCode(500, ErrorResponseHelper.SafeError(
                    "Đã xảy ra lỗi khi đăng xuất",
                    HttpContext));
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
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Phiên đăng nhập đã hết hạn", HttpContext));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during refresh token");
                return StatusCode(500, ErrorResponseHelper.SafeError(
                    "Đã xảy ra lỗi khi làm mới token",
                    HttpContext));
            }
        }

        [HttpGet("google")]
        public async Task<ActionResult<AuthResponse>> GoogleLogin([FromQuery] string idToken)
        {
            try
            {
                Response.Headers["X-EatFitAI-Deprecated-Endpoint"] = "Use POST /api/auth/google/signin";
                _logger.LogWarning(
                    "legacy_google_auth_hit path={Path} remoteIp={RemoteIp}",
                    HttpContext.Request.Path.Value,
                    HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

                var result = await _authService.GoogleLoginAsync(idToken);
                return Ok(result);
            }
            catch (NotSupportedException)
            {
                return StatusCode(StatusCodes.Status410Gone, ErrorResponseHelper.SafeError("Phương thức đăng nhập Google không còn được hỗ trợ", HttpContext));
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Đăng nhập Google không thành công", HttpContext));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during Google login");
                return StatusCode(500, ErrorResponseHelper.SafeError(
                    "Đã xảy ra lỗi khi đăng nhập bằng Google",
                    HttpContext));
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
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(ErrorResponseHelper.SafeError("Mật khẩu hiện tại không đúng", HttpContext));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing password");
                return StatusCode(500, ErrorResponseHelper.SafeError(
                    "Đã xảy ra lỗi khi đổi mật khẩu",
                    HttpContext));
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

