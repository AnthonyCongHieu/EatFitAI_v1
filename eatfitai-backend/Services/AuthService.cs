using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using AutoMapper;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.Auth;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Hosting;

namespace EatFitAI.API.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly EatFitAIDbContext _context;
        private readonly IMapper _mapper;
        private readonly IConfiguration _configuration;
        private readonly IMemoryCache _memoryCache;
        private readonly IEmailService _emailService;
        private readonly IHostEnvironment _env;
        private static readonly TimeSpan ResetCodeLifetime = TimeSpan.FromMinutes(10);
        private const string ResetCacheKeyPrefix = "pwdreset_";

        public AuthService(
            IUserRepository userRepository,
            EatFitAIDbContext context,
            IMapper mapper,
            IConfiguration configuration,
            IMemoryCache memoryCache,
            IEmailService emailService,
            IHostEnvironment env)
        {
            _userRepository = userRepository;
            _context = context;
            _mapper = mapper;
            _configuration = configuration;
            _memoryCache = memoryCache;
            _emailService = emailService;
            _env = env;
        }

        public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
        {
            Console.WriteLine($"[AuthService] Starting registration for email: {request.Email}");

            try
            {
                // Check if email already exists
                Console.WriteLine($"[AuthService] Checking if email exists: {request.Email}");
                if (await _userRepository.EmailExistsAsync(request.Email))
                {
                    Console.WriteLine($"[AuthService] Email already exists: {request.Email}");
                    throw new InvalidOperationException("Email already exists");
                }
                Console.WriteLine($"[AuthService] Email check passed for: {request.Email}");

                // Create new user
                var user = new User
                {
                    UserId = Guid.NewGuid(),
                    Email = request.Email,
                    PasswordHash = HashPassword(request.Password),
                    DisplayName = request.DisplayName,
                    CreatedAt = DateTime.UtcNow
                };

                Console.WriteLine($"[AuthService] Creating user with ID: {user.UserId}");
                await _userRepository.AddAsync(user);
                Console.WriteLine($"[AuthService] User added to repository");

                Console.WriteLine($"[AuthService] Saving changes to database");
                await _context.SaveChangesAsync();
                Console.WriteLine($"[AuthService] User saved to database");

                // Generate JWT token
                Console.WriteLine($"[AuthService] Generating JWT token");
                var token = GenerateJwtToken(user);
                var expiresAt = DateTime.UtcNow.AddHours(24); // 24 hours
                Console.WriteLine($"[AuthService] JWT token generated: {token?.Substring(0, Math.Min(20, token.Length))}...");

                // Generate refresh token
                var refreshToken = GenerateRefreshToken();
                var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(30); // 30 days
                
                // Save Refresh Token to DB
                user.RefreshToken = refreshToken;
                user.RefreshTokenExpiryTime = refreshTokenExpiresAt;
                await _context.SaveChangesAsync();
                
                Console.WriteLine($"[AuthService] Refresh token generated and saved: {refreshToken?.Substring(0, Math.Min(20, refreshToken.Length))}...");

                var response = new AuthResponse
                {
                    UserId = user.UserId,
                    Email = user.Email,
                    DisplayName = user.DisplayName ?? string.Empty,
                    Token = token,
                    ExpiresAt = expiresAt,
                    RefreshToken = refreshToken,
                    RefreshTokenExpiresAt = refreshTokenExpiresAt
                };

                Console.WriteLine($"[AuthService] AuthResponse created: UserId={response.UserId}, Email={response.Email}, DisplayName={response.DisplayName}, Token present={!string.IsNullOrEmpty(response.Token)}, ExpiresAt={response.ExpiresAt}, RefreshToken present={!string.IsNullOrEmpty(response.RefreshToken)}, RefreshTokenExpiresAt={response.RefreshTokenExpiresAt}");

                Console.WriteLine($"[AuthService] Registration completed successfully for email: {request.Email}");
                return response;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AuthService] Error during registration for email: {request.Email}, Exception: {ex.Message}, StackTrace: {ex.StackTrace}");
                throw;
            }
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request)
        {
            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null || !VerifyPassword(request.Password, user.PasswordHash))
            {
                throw new UnauthorizedAccessException("Invalid email or password");
            }

            // Bug #7 fix: Kiểm tra email đã được xác minh chưa
            // Nếu user đăng ký qua RegisterWithVerificationAsync thì cần verify email trước
            if (!user.EmailVerified)
            {
                Console.WriteLine($"[AuthService] Login denied - Email not verified: {request.Email}");
                throw new UnauthorizedAccessException("Email chưa được xác minh. Vui lòng kiểm tra email và nhập mã xác minh.");
            }

            // Generate JWT token
            var token = GenerateJwtToken(user);
            var expiresAt = DateTime.UtcNow.AddHours(24); // 24 hours

            // Generate refresh token
            var refreshToken = GenerateRefreshToken();
            var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(30); // 30 days

            // Save Refresh Token to DB
            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiryTime = refreshTokenExpiresAt;
            await _context.SaveChangesAsync();

            return new AuthResponse
            {
                UserId = user.UserId,
                Email = user.Email,
                DisplayName = user.DisplayName ?? string.Empty,
                Token = token,
                ExpiresAt = expiresAt,
                RefreshToken = refreshToken,
                RefreshTokenExpiresAt = refreshTokenExpiresAt,
                NeedsOnboarding = !user.OnboardingCompleted
            };
        }

        public async Task<bool> ValidateTokenAsync(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? "default-secret-key");

                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ClockSkew = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<Guid?> GetUserIdFromTokenAsync(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var jwtToken = tokenHandler.ReadToken(token) as JwtSecurityToken;

                var userIdClaim = jwtToken?.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
                if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
                {
                    return userId;
                }

                return null;
            }
            catch
            {
                return null;
            }
        }

        private string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? "default-secret-key");

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

        private string GenerateRefreshToken()
        {
            var randomBytes = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            return Convert.ToBase64String(randomBytes);
        }

        private string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(hashedBytes);
        }

        private bool VerifyPassword(string password, string? hashedPassword)
        {
            if (string.IsNullOrEmpty(hashedPassword))
                return false;

            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            var hashedInput = Convert.ToBase64String(hashedBytes);

            return hashedInput == hashedPassword;
        }

        public async Task LogoutAsync(string refreshToken)
        {
            if (string.IsNullOrEmpty(refreshToken)) return;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.RefreshToken == refreshToken);
            if (user != null)
            {
                // Revoke token
                user.RefreshToken = null;
                user.RefreshTokenExpiryTime = null;
                await _context.SaveChangesAsync();
                Console.WriteLine($"[AuthService] User {user.UserId} logged out, refresh token revoked.");
            }
        }

        public async Task<AuthResponse> RefreshTokenAsync(string refreshToken)
        {
            // Validate refresh token format
            if (string.IsNullOrWhiteSpace(refreshToken))
            {
                throw new UnauthorizedAccessException("Invalid refresh token");
            }

            // Find user by refresh token
            var user = await _context.Users.FirstOrDefaultAsync(u => u.RefreshToken == refreshToken);

            if (user == null)
            {
                throw new UnauthorizedAccessException("Invalid refresh token or user not found");
            }

            if (user.RefreshTokenExpiryTime == null || user.RefreshTokenExpiryTime < DateTime.UtcNow)
            {
                // Token expired
                throw new UnauthorizedAccessException("Refresh token has expired. Please login again.");
            }

            // Generate NEW tokens (Rotation)
            var newToken = GenerateJwtToken(user);
            var newExpiresAt = DateTime.UtcNow.AddHours(24);
            
            var newRefreshToken = GenerateRefreshToken();
            var newRefreshTokenExpiresAt = DateTime.UtcNow.AddDays(30);

            // Update DB with new refresh token (invalidate old one)
            user.RefreshToken = newRefreshToken;
            user.RefreshTokenExpiryTime = newRefreshTokenExpiresAt;
            await _context.SaveChangesAsync();

            Console.WriteLine($"[AuthService] Token refreshed for user {user.UserId}");

            return new AuthResponse
            {
                UserId = user.UserId,
                Email = user.Email,
                DisplayName = user.DisplayName ?? string.Empty,
                Token = newToken,
                ExpiresAt = newExpiresAt,
                RefreshToken = newRefreshToken,
                RefreshTokenExpiresAt = newRefreshTokenExpiresAt
            };
        }

        public async Task<AuthResponse> GoogleLoginAsync(string idToken)
        {
            // In a real implementation, you would validate the Google ID token
            // and create/login the user. For now, we'll throw an exception
            // as this requires Google OAuth integration
            throw new NotImplementedException("Google login functionality requires OAuth integration");
        }

        public async Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request)
        {
            Console.WriteLine($"[AuthService] ForgotPassword called for email: {request.Email}");
            var user = await _userRepository.GetByEmailAsync(request.Email);
            
            if (user == null)
            {
                Console.WriteLine($"[AuthService] Email NOT found in database: {request.Email}");
                return new ForgotPasswordResponse
                {
                    Success = true,
                    Message = "If the email exists, a reset code has been generated.",
                    ExpiresAt = DateTime.UtcNow.Add(ResetCodeLifetime),
                    ResetCode = string.Empty
                };
            }

            Console.WriteLine($"[AuthService] Email found in database: {user.Email} (UserId: {user.UserId})");

            var code = GenerateNumericCode(6);
            var cacheEntry = new ResetCacheEntry
            {
                UserId = user.UserId,
                CodeHash = HashResetCode(code),
                ExpiresAt = DateTime.UtcNow.Add(ResetCodeLifetime)
            };

            _memoryCache.Set($"{ResetCacheKeyPrefix}{user.Email}", cacheEntry, cacheEntry.ExpiresAt);

            Console.WriteLine($"[AuthService] Generated reset code for {user.Email} (expires {cacheEntry.ExpiresAt:O})");

            try
            {
                await _emailService.SendResetCodeAsync(user.Email, code, cacheEntry.ExpiresAt);
                Console.WriteLine($"[AuthService] Reset code emailed to {user.Email}.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AuthService] Failed to send reset code email: {ex.Message}");
                throw new InvalidOperationException("Không gửi được email reset. Vui lòng thử lại hoặc kiểm tra cấu hình SMTP.");
            }

            var includeCodeInResponse = _env.IsDevelopment(); // hỗ trợ demo/dev, prod sẽ không trả mã

            return new ForgotPasswordResponse
            {
                Success = true,
                Message = includeCodeInResponse
                    ? "Reset code generated (dev mode)."
                    : "Reset code sent to your email.",
                ExpiresAt = cacheEntry.ExpiresAt,
                ResetCode = includeCodeInResponse ? code : string.Empty
            };
        }

        public async Task ResetPasswordAsync(ResetPasswordRequest request)
        {
            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null)
            {
                throw new UnauthorizedAccessException("Invalid reset code or email.");
            }

            if (!_memoryCache.TryGetValue($"{ResetCacheKeyPrefix}{user.Email}", out ResetCacheEntry? cached) || cached == null)
            {
                throw new UnauthorizedAccessException("Reset code expired or not found.");
            }

            if (cached.ExpiresAt < DateTime.UtcNow)
            {
                _memoryCache.Remove($"{ResetCacheKeyPrefix}{user.Email}");
                throw new UnauthorizedAccessException("Reset code expired or not found.");
            }

            var hashedInput = HashResetCode(request.ResetCode);
            if (!string.Equals(hashedInput, cached.CodeHash, StringComparison.Ordinal))
            {
                throw new UnauthorizedAccessException("Invalid reset code or email.");
            }

            user.PasswordHash = HashPassword(request.NewPassword);
            // Nếu user reset password thành công nghĩa là họ đã xác minh quyền sở hữu email
            user.EmailVerified = true;
            await _context.SaveChangesAsync();
            _memoryCache.Remove($"{ResetCacheKeyPrefix}{user.Email}");
            Console.WriteLine($"[AuthService] Password reset successful for {user.Email}, EmailVerified set to true");
        }

        private string GenerateNumericCode(int length)
        {
            var buffer = new byte[length];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(buffer);

            var digits = new char[length];
            for (int i = 0; i < length; i++)
            {
                digits[i] = (char)('0' + buffer[i] % 10);
            }

            return new string(digits);
        }

        private string HashResetCode(string code)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(code));
            return Convert.ToBase64String(hashedBytes);
        }

        private class ResetCacheEntry
        {
            public Guid UserId { get; set; }
            public string CodeHash { get; set; } = string.Empty;
            public DateTime ExpiresAt { get; set; }
        }

        // ========= EMAIL VERIFICATION METHODS =========

        private static readonly TimeSpan VerificationCodeLifetime = TimeSpan.FromMinutes(15);
        private const string VerifyCacheKeyPrefix = "email_verify_";

        /// <summary>
        /// Đăng ký với xác minh email - không cấp token ngay, gửi mã 6 số
        /// </summary>
        public async Task<RegisterResponse> RegisterWithVerificationAsync(RegisterRequest request)
        {
            Console.WriteLine($"[AuthService] Starting registration with verification for email: {request.Email}");

            // Check if email already exists
            var existingUser = await _userRepository.GetByEmailAsync(request.Email);
            if (existingUser != null)
            {
                // If email exists but NOT verified, allow re-registration by resetting verification code
                if (!existingUser.EmailVerified)
                {
                    Console.WriteLine($"[AuthService] Email exists but unverified, resetting verification code: {request.Email}");
                    
                    // Update password and display name if provided
                    existingUser.PasswordHash = HashPassword(request.Password);
                    if (!string.IsNullOrEmpty(request.DisplayName))
                    {
                        existingUser.DisplayName = request.DisplayName;
                    }
                    
                    // Generate new verification code
                    var newVerificationCode = GenerateNumericCode(6);
                    existingUser.VerificationCode = HashResetCode(newVerificationCode);
                    existingUser.VerificationCodeExpiry = DateTime.UtcNow.Add(VerificationCodeLifetime);
                    
                    await _context.SaveChangesAsync();
                    
                    // Send email
                    try
                    {
                        await _emailService.SendVerificationCodeAsync(existingUser.Email, newVerificationCode, existingUser.VerificationCodeExpiry.Value);
                        Console.WriteLine($"[AuthService] Verification code re-sent to {existingUser.Email}");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[AuthService] Failed to send verification email: {ex.Message}");
                    }
                    
                    var includeCodeInDevResponse = _env.IsDevelopment();
                    return new RegisterResponse
                    {
                        Success = true,
                        Message = includeCodeInDevResponse 
                            ? "Đã gửi lại mã xác minh (dev mode)" 
                            : "Đã gửi lại mã xác minh. Kiểm tra email của bạn.",
                        Email = existingUser.Email,
                        VerificationCodeExpiresAt = existingUser.VerificationCodeExpiry.Value,
                        VerificationCode = includeCodeInDevResponse ? newVerificationCode : null
                    };
                }
                
                // Email exists and already verified
                Console.WriteLine($"[AuthService] Email already exists and verified: {request.Email}");
                throw new InvalidOperationException("Email đã được đăng ký");
            }
            // Tạo user mới nhưng chưa verified
            var user = new User
            {
                UserId = Guid.NewGuid(),
                Email = request.Email,
                PasswordHash = HashPassword(request.Password),
                DisplayName = request.DisplayName,
                CreatedAt = DateTime.UtcNow,
                EmailVerified = false,
                OnboardingCompleted = false
            };

            // Tạo mã xác minh 6 số
            var verificationCode = GenerateNumericCode(6);
            user.VerificationCode = HashResetCode(verificationCode);
            user.VerificationCodeExpiry = DateTime.UtcNow.Add(VerificationCodeLifetime);

            await _userRepository.AddAsync(user);
            await _context.SaveChangesAsync();

            Console.WriteLine($"[AuthService] User created with ID: {user.UserId}, sending verification code");

            // Gửi email xác minh
            try
            {
                await _emailService.SendVerificationCodeAsync(user.Email, verificationCode, user.VerificationCodeExpiry.Value);
                Console.WriteLine($"[AuthService] Verification code emailed to {user.Email}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AuthService] Failed to send verification email: {ex.Message}");
                // Vẫn return success, user có thể request gửi lại
            }

            var includeCodeInResponse = _env.IsDevelopment();

            return new RegisterResponse
            {
                Success = true,
                Message = includeCodeInResponse 
                    ? "Đăng ký thành công! Mã xác minh (dev mode)" 
                    : "Đăng ký thành công! Kiểm tra email để lấy mã xác minh.",
                Email = user.Email,
                VerificationCodeExpiresAt = user.VerificationCodeExpiry.Value,
                VerificationCode = includeCodeInResponse ? verificationCode : null
            };
        }

        /// <summary>
        /// Xác minh email bằng mã 6 số - nếu đúng thì cấp token
        /// </summary>
        public async Task<AuthResponse> VerifyEmailAsync(VerifyEmailRequest request)
        {
            Console.WriteLine($"[AuthService] Verifying email for: {request.Email}");

            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null)
            {
                throw new UnauthorizedAccessException("Email không tồn tại");
            }

            if (user.EmailVerified)
            {
                throw new InvalidOperationException("Email đã được xác minh trước đó");
            }

            if (user.VerificationCodeExpiry == null || user.VerificationCodeExpiry < DateTime.UtcNow)
            {
                throw new UnauthorizedAccessException("Mã xác minh đã hết hạn. Vui lòng yêu cầu gửi lại.");
            }

            var hashedInput = HashResetCode(request.VerificationCode);
            if (!string.Equals(hashedInput, user.VerificationCode, StringComparison.Ordinal))
            {
                throw new UnauthorizedAccessException("Mã xác minh không đúng");
            }

            // Mark email as verified
            user.EmailVerified = true;
            user.VerificationCode = null;
            user.VerificationCodeExpiry = null;
            await _context.SaveChangesAsync();

            Console.WriteLine($"[AuthService] Email verified successfully for: {request.Email}");

            // Generate JWT token
            var token = GenerateJwtToken(user);
            var expiresAt = DateTime.UtcNow.AddHours(24);
            var refreshToken = GenerateRefreshToken();
            var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(30);

            // Save Refresh Token
            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiryTime = refreshTokenExpiresAt;
            await _context.SaveChangesAsync();

            return new AuthResponse
            {
                UserId = user.UserId,
                Email = user.Email,
                DisplayName = user.DisplayName ?? string.Empty,
                Token = token,
                ExpiresAt = expiresAt,
                RefreshToken = refreshToken,
                RefreshTokenExpiresAt = refreshTokenExpiresAt,
                NeedsOnboarding = !user.OnboardingCompleted
            };
        }

        /// <summary>
        /// Gửi lại mã xác minh email
        /// </summary>
        public async Task<RegisterResponse> ResendVerificationAsync(ResendVerificationRequest request)
        {
            Console.WriteLine($"[AuthService] Resending verification code for: {request.Email}");

            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null)
            {
                throw new UnauthorizedAccessException("Email không tồn tại");
            }

            if (user.EmailVerified)
            {
                throw new InvalidOperationException("Email đã được xác minh trước đó");
            }

            // Tạo mã mới
            var verificationCode = GenerateNumericCode(6);
            user.VerificationCode = HashResetCode(verificationCode);
            user.VerificationCodeExpiry = DateTime.UtcNow.Add(VerificationCodeLifetime);
            await _context.SaveChangesAsync();

            // Gửi email
            try
            {
                await _emailService.SendVerificationCodeAsync(user.Email, verificationCode, user.VerificationCodeExpiry.Value);
                Console.WriteLine($"[AuthService] Verification code re-sent to {user.Email}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AuthService] Failed to resend verification email: {ex.Message}");
                throw new InvalidOperationException("Không gửi được email. Vui lòng thử lại sau.");
            }

            var includeCodeInResponse = _env.IsDevelopment();

            return new RegisterResponse
            {
                Success = true,
                Message = includeCodeInResponse 
                    ? "Đã gửi lại mã xác minh (dev mode)" 
                    : "Đã gửi lại mã xác minh. Kiểm tra email của bạn.",
                Email = user.Email,
                VerificationCodeExpiresAt = user.VerificationCodeExpiry.Value,
                VerificationCode = includeCodeInResponse ? verificationCode : null
            };
        }

        /// <summary>
        /// Đánh dấu user đã hoàn thành onboarding
        /// </summary>
        public async Task MarkOnboardingCompletedAsync(Guid userId)
        {
            Console.WriteLine($"[AuthService] Marking onboarding completed for user: {userId}");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
            {
                throw new UnauthorizedAccessException("User không tồn tại");
            }

            user.OnboardingCompleted = true;
            await _context.SaveChangesAsync();

            Console.WriteLine($"[AuthService] Onboarding completed for user: {userId}");
        }

        /// <summary>
        /// Đổi mật khẩu cho user đã đăng nhập
        /// </summary>
        public async Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword)
        {
            Console.WriteLine($"[AuthService] Changing password for user: {userId}");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
            {
                throw new UnauthorizedAccessException("User không tồn tại");
            }

            // Verify current password
            if (!VerifyPassword(currentPassword, user.PasswordHash))
            {
                throw new UnauthorizedAccessException("Mật khẩu hiện tại không đúng");
            }

            // Update password
            user.PasswordHash = HashPassword(newPassword);
            await _context.SaveChangesAsync();

            Console.WriteLine($"[AuthService] Password changed successfully for user: {userId}");
        }
    }
}

