/**
 * Google Authentication Controller
 * Handles Google Sign-in from mobile app
 * Verifies Google ID Token and creates/updates user
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Google.Apis.Auth;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/auth/google")]
    public class GoogleAuthController : ControllerBase
    {
        private readonly EatFitAIDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<GoogleAuthController> _logger;

        public GoogleAuthController(
            EatFitAIDbContext context,
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
        public class GoogleAuthResponse
        {
            public bool Success { get; set; }
            public string? AccessToken { get; set; }
            public string? RefreshToken { get; set; }
            public GoogleUserDto? User { get; set; }
            public string? Error { get; set; }
            public bool IsNewUser { get; set; }
            public DateTime? ExpiresAt { get; set; }
        }

        public class GoogleUserDto
        {
            public Guid UserId { get; set; }
            public string Email { get; set; } = string.Empty;
            public string? DisplayName { get; set; }
            public string? AvatarUrl { get; set; }
            public bool NeedsOnboarding { get; set; }
        }

        /// <summary>
        /// Sign in with Google ID Token
        /// POST /api/auth/google/signin
        /// </summary>
        [HttpPost("signin")]
        [AllowAnonymous]
        public async Task<ActionResult<GoogleAuthResponse>> SignInWithGoogle([FromBody] GoogleSignInRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.IdToken))
                {
                    return BadRequest(new GoogleAuthResponse
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
                    return Unauthorized(new GoogleAuthResponse
                    {
                        Success = false,
                        Error = "Token Google không hợp lệ"
                    });
                }

                // Check if email is verified
                if (!payload.EmailVerified)
                {
                    return BadRequest(new GoogleAuthResponse
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
                        UserId = Guid.NewGuid(),
                        Email = payload.Email,
                        DisplayName = payload.Name ?? payload.Email.Split('@')[0],
                        EmailVerified = true, // Google already verified
                        CreatedAt = DateTime.UtcNow,
                        OnboardingCompleted = false,
                        // No password for Google users
                        PasswordHash = null,
                    };

                    _context.Users.Add(user);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("New user created via Google: {Email}", user.Email);
                }
                else
                {
                    // Update existing user - mark email as verified
                    if (!user.EmailVerified)
                    {
                        user.EmailVerified = true;
                    }

                    // Update name if not set
                    if (string.IsNullOrEmpty(user.DisplayName) && !string.IsNullOrEmpty(payload.Name))
                    {
                        user.DisplayName = payload.Name;
                    }

                    await _context.SaveChangesAsync();
                    _logger.LogInformation("User signed in via Google: {Email}", user.Email);
                }

                // Generate JWT tokens
                var accessToken = GenerateJwtToken(user);
                var refreshToken = GenerateRefreshToken();
                var expiresAt = DateTime.UtcNow.AddHours(24);

                // Save refresh token
                user.RefreshToken = refreshToken;
                user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(30);
                await _context.SaveChangesAsync();

                // Check if user needs onboarding
                bool needsOnboarding = !user.OnboardingCompleted;

                return Ok(new GoogleAuthResponse
                {
                    Success = true,
                    AccessToken = accessToken,
                    RefreshToken = refreshToken,
                    IsNewUser = isNewUser,
                    ExpiresAt = expiresAt,
                    User = new GoogleUserDto
                    {
                        UserId = user.UserId,
                        Email = user.Email,
                        DisplayName = user.DisplayName,
                        AvatarUrl = null, // TODO: Add AvatarUrl field to User model
                        NeedsOnboarding = needsOnboarding,
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during Google sign-in");
                return StatusCode(500, new GoogleAuthResponse
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
        public async Task<ActionResult<GoogleAuthResponse>> LinkGoogleAccount([FromBody] GoogleSignInRequest request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdClaim, out var userId))
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
                    return NotFound(new GoogleAuthResponse { Success = false, Error = "User not found" });
                }

                // Check if Google email matches user email
                if (user.Email != payload.Email)
                {
                    return BadRequest(new GoogleAuthResponse
                    {
                        Success = false,
                        Error = "Email Google không khớp với email tài khoản"
                    });
                }

                // Mark email as verified
                user.EmailVerified = true;
                await _context.SaveChangesAsync();

                return Ok(new GoogleAuthResponse
                {
                    Success = true,
                    User = new GoogleUserDto
                    {
                        UserId = user.UserId,
                        Email = user.Email,
                        DisplayName = user.DisplayName,
                        AvatarUrl = null,
                    }
                });
            }
            catch (InvalidJwtException)
            {
                return Unauthorized(new GoogleAuthResponse { Success = false, Error = "Token không hợp lệ" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error linking Google account");
                return StatusCode(500, new GoogleAuthResponse { Success = false, Error = "Lỗi server" });
            }
        }

        #region Private Helpers

        // Copy từ AuthService để tránh circular dependency
        private string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = GetJwtSigningKey();

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Name, user.DisplayName ?? user.Email)
                }),
                Expires = DateTime.UtcNow.AddHours(24),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        private byte[] GetJwtSigningKey()
        {
            var key = _configuration["Jwt:Key"];
            if (string.IsNullOrWhiteSpace(key) ||
                string.Equals(key, "default-secret-key", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Jwt:Key is missing or insecure.");
            }

            return Encoding.ASCII.GetBytes(key);
        }

        private string GenerateRefreshToken()
        {
            var randomBytes = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            return Convert.ToBase64String(randomBytes);
        }

        #endregion
    }
}
