/**
 * Google Authentication Controller
 * Handles Google Sign-in from mobile app
 * Verifies Google ID Token and creates/updates user
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Google.Apis.Auth;
using EatFitAI.Data;
using EatFitAI.Models;
using EatFitAI.Utils;
using System.Security.Claims;

namespace EatFitAI.Controllers
{
    [ApiController]
    [Route("api/auth/google")]
    public class GoogleAuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<GoogleAuthController> _logger;

        public GoogleAuthController(
            ApplicationDbContext context,
            IConfiguration configuration,
            ILogger<GoogleAuthController> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Google Sign-in request
        /// </summary>
        public class GoogleSignInRequest
        {
            public string IdToken { get; set; } = string.Empty;
        }

        /// <summary>
        /// Auth response with JWT tokens
        /// </summary>
        public class AuthResponse
        {
            public bool Success { get; set; }
            public string? AccessToken { get; set; }
            public string? RefreshToken { get; set; }
            public UserDto? User { get; set; }
            public string? Error { get; set; }
            public bool IsNewUser { get; set; }
        }

        public class UserDto
        {
            public int UserId { get; set; }
            public string Email { get; set; } = string.Empty;
            public string? FullName { get; set; }
            public string? AvatarUrl { get; set; }
            public bool NeedsOnboarding { get; set; }
        }

        /// <summary>
        /// Sign in with Google ID Token
        /// POST /api/auth/google/signin
        /// </summary>
        [HttpPost("signin")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResponse>> SignInWithGoogle([FromBody] GoogleSignInRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.IdToken))
                {
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Error = "ID Token không được để trống"
                    });
                }

                // Verify Google ID Token
                GoogleJsonWebSignature.Payload payload;
                try
                {
                    var settings = new GoogleJsonWebSignature.ValidationSettings
                    {
                        Audience = new List<string>
                        {
                            _configuration["Google:WebClientId"] ?? "",
                            _configuration["Google:AndroidClientId"] ?? "",
                            _configuration["Google:IosClientId"] ?? "",
                        }.Where(x => !string.IsNullOrEmpty(x)).ToList()
                    };

                    payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken, settings);
                }
                catch (InvalidJwtException ex)
                {
                    _logger.LogWarning("Invalid Google token: {Message}", ex.Message);
                    return Unauthorized(new AuthResponse
                    {
                        Success = false,
                        Error = "Token Google không hợp lệ"
                    });
                }

                // Check if email is verified
                if (!payload.EmailVerified)
                {
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Error = "Email chưa được xác thực với Google"
                    });
                }

                // Find or create user
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email == payload.Email);

                bool isNewUser = false;

                if (user == null)
                {
                    // Create new user
                    isNewUser = true;
                    user = new User
                    {
                        Email = payload.Email,
                        FullName = payload.Name ?? payload.Email.Split('@')[0],
                        AvatarUrl = payload.Picture,
                        IsEmailVerified = true, // Google already verified
                        AuthProvider = "google",
                        GoogleId = payload.Subject,
                        CreatedAt = DateTime.UtcNow,
                        // No password for Google users
                        Password = null,
                    };

                    _context.Users.Add(user);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("New user created via Google: {Email}", user.Email);
                }
                else
                {
                    // Update existing user
                    if (user.AuthProvider != "google")
                    {
                        // Link Google account to existing email/password account
                        user.GoogleId = payload.Subject;
                        user.AuthProvider = "google"; // or "both" if you want to support both
                    }

                    // Update avatar if changed
                    if (!string.IsNullOrEmpty(payload.Picture) && user.AvatarUrl != payload.Picture)
                    {
                        user.AvatarUrl = payload.Picture;
                    }

                    // Update name if not set
                    if (string.IsNullOrEmpty(user.FullName) && !string.IsNullOrEmpty(payload.Name))
                    {
                        user.FullName = payload.Name;
                    }

                    await _context.SaveChangesAsync();
                    _logger.LogInformation("User signed in via Google: {Email}", user.Email);
                }

                // Generate JWT tokens
                var accessToken = JwtHelper.GenerateToken(
                    user.UserId,
                    user.Email,
                    _configuration["Jwt:Key"]!,
                    _configuration["Jwt:Issuer"]!,
                    _configuration["Jwt:Audience"]!
                );

                var refreshToken = JwtHelper.GenerateRefreshToken();

                // Save refresh token
                user.RefreshToken = refreshToken;
                user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(30);
                await _context.SaveChangesAsync();

                // Check if user needs onboarding
                bool needsOnboarding = !user.HeightCm.HasValue || !user.WeightKg.HasValue;

                return Ok(new AuthResponse
                {
                    Success = true,
                    AccessToken = accessToken,
                    RefreshToken = refreshToken,
                    IsNewUser = isNewUser,
                    User = new UserDto
                    {
                        UserId = user.UserId,
                        Email = user.Email,
                        FullName = user.FullName,
                        AvatarUrl = user.AvatarUrl,
                        NeedsOnboarding = needsOnboarding,
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during Google sign-in");
                return StatusCode(500, new AuthResponse
                {
                    Success = false,
                    Error = "Lỗi server khi đăng nhập"
                });
            }
        }

        /// <summary>
        /// Link Google account to existing user
        /// POST /api/auth/google/link
        /// </summary>
        [HttpPost("link")]
        [Authorize]
        public async Task<ActionResult<AuthResponse>> LinkGoogleAccount([FromBody] GoogleSignInRequest request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized();
            }

            try
            {
                // Verify Google token
                var payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken);

                // Get current user
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound(new AuthResponse { Success = false, Error = "User not found" });
                }

                // Check if Google account is already linked to another user
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.GoogleId == payload.Subject && u.UserId != userId);

                if (existingUser != null)
                {
                    return BadRequest(new AuthResponse
                    {
                        Success = false,
                        Error = "Tài khoản Google này đã được liên kết với tài khoản khác"
                    });
                }

                // Link Google account
                user.GoogleId = payload.Subject;
                if (string.IsNullOrEmpty(user.AvatarUrl))
                {
                    user.AvatarUrl = payload.Picture;
                }

                await _context.SaveChangesAsync();

                return Ok(new AuthResponse
                {
                    Success = true,
                    User = new UserDto
                    {
                        UserId = user.UserId,
                        Email = user.Email,
                        FullName = user.FullName,
                        AvatarUrl = user.AvatarUrl,
                    }
                });
            }
            catch (InvalidJwtException)
            {
                return Unauthorized(new AuthResponse { Success = false, Error = "Token không hợp lệ" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error linking Google account");
                return StatusCode(500, new AuthResponse { Success = false, Error = "Lỗi server" });
            }
        }
    }
}
