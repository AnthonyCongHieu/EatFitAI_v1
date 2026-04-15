using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using AutoMapper;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.Auth;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Data;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Security;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using AdminPasswordResetCode = EatFitAI.API.Models.PasswordResetCode;

namespace EatFitAI.API.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly EatFitAIDbContext _context;
        private readonly ApplicationDbContext _adminContext;
        private readonly IMapper _mapper;
        private readonly IConfiguration _configuration;
        private readonly IMemoryCache _memoryCache;
        private readonly IEmailService _emailService;
        private readonly IHostEnvironment _env;
        private readonly ILogger<AuthService> _logger;
        private static readonly TimeSpan ResetCodeLifetime = TimeSpan.FromMinutes(10);
        private const string PasswordHashPrefix = "PBKDF2";
        private const int PasswordHashIterations = 100_000;
        private const int PasswordSaltSize = 16;
        private const int PasswordKeySize = 32;

        public AuthService(
            IUserRepository userRepository,
            EatFitAIDbContext context,
            ApplicationDbContext adminContext,
            IMapper mapper,
            IConfiguration configuration,
            IMemoryCache memoryCache,
            IEmailService emailService,
            IHostEnvironment env,
            ILogger<AuthService> logger)
        {
            _userRepository = userRepository;
            _context = context;
            _adminContext = adminContext;
            _mapper = mapper;
            _configuration = configuration;
            _memoryCache = memoryCache;
            _emailService = emailService;
            _env = env;
            _logger = logger;
        }

        public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
        {
            _logger.LogInformation("Bắt đầu đăng ký cho email: {Email}", request.Email);

            try
            {
                // Kiểm tra email đã tồn tại chưa
                if (await _userRepository.EmailExistsAsync(request.Email))
                {
                    _logger.LogWarning("Email đã tồn tại: {Email}", request.Email);
                    throw new InvalidOperationException("Email already exists");
                }

                // Tạo user mới - legacy register: set EmailVerified = true để bypass verification
                var user = new User
                {
                    UserId = Guid.NewGuid(),
                    Email = request.Email,
                    PasswordHash = HashPassword(request.Password),
                    DisplayName = request.DisplayName,
                    CreatedAt = DateTime.UtcNow,
                    EmailVerified = true, // Legacy register: bypass email verification
                    OnboardingCompleted = false,
                    Role = PlatformRoles.User
                };

                await _userRepository.AddAsync(user);
                await _context.SaveChangesAsync();

                // Tạo JWT + refresh token
                var token = GenerateJwtToken(user);
                var expiresAt = DateTime.UtcNow.AddHours(24);
                var refreshToken = GenerateRefreshToken();
                var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(30);

                // Lưu Refresh Token vào DB
                user.RefreshToken = refreshToken;
                user.RefreshTokenExpiryTime = refreshTokenExpiresAt;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Đăng ký thành công cho user {UserId}", user.UserId);

                return new AuthResponse
                {
                    UserId = user.UserId,
                    Email = user.Email,
                    DisplayName = user.DisplayName ?? string.Empty,
                    Token = token,
                    ExpiresAt = expiresAt,
                    RefreshToken = refreshToken,
                    RefreshTokenExpiresAt = refreshTokenExpiresAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi đăng ký cho email: {Email}", request.Email);
                throw;
            }
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request)
        {
            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null)
            {
                throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng");
            }

            if (!VerifyPassword(request.Password, user.PasswordHash, out var needsRehash))
            {
                throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng");
            }

            var accessState = await GetAccessStateAsync(user.UserId);
            if (accessState != AdminAccessStates.Active)
            {
                throw new UnauthorizedAccessException("Tai khoan hien khong the dang nhap vao he thong.");
            }

            if (needsRehash)
            {
                user.PasswordHash = HashPassword(request.Password);
            }

            // Kiểm tra email đã được xác minh chưa
            if (!user.EmailVerified)
            {
                _logger.LogWarning("Login bị từ chối - Email chưa verify: {Email}", request.Email);
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

        public Task<bool> ValidateTokenAsync(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = GetJwtSigningKey();

                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ClockSkew = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                return Task.FromResult(true);
            }
            catch
            {
                return Task.FromResult(false);
            }
        }

        public Task<Guid?> GetUserIdFromTokenAsync(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var jwtToken = tokenHandler.ReadToken(token) as JwtSecurityToken;

                var userIdClaim = jwtToken?.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
                if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
                {
                    return Task.FromResult<Guid?>(userId);
                }

                return Task.FromResult<Guid?>(null);
            }
            catch
            {
                return Task.FromResult<Guid?>(null);
            }
        }

        private string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = GetJwtSigningKey();
            var issuer = _configuration["Jwt:Issuer"] ?? "EatFitAI";
            var audience = _configuration["Jwt:Audience"] ?? "EatFitAI";
            var normalizedRole = PlatformRoles.Normalize(user.Role);
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.DisplayName ?? user.Email),
                new Claim(ClaimTypes.Role, normalizedRole),
                new Claim(AdminCapabilityClaims.PlatformRole, normalizedRole),
                new Claim(AdminCapabilityClaims.AccessState, AdminAccessStates.Active),
            };

            if (PlatformRoles.IsAdminRole(normalizedRole))
            {
                claims.Add(new Claim(ClaimTypes.Role, "Admin"));
            }

            foreach (var capability in AdminCapabilities.GetForRole(normalizedRole))
            {
                claims.Add(new Claim(AdminCapabilityClaims.Capability, capability));
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Issuer = issuer,
                Audience = audience,
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
            var salt = RandomNumberGenerator.GetBytes(PasswordSaltSize);
            var hash = Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                PasswordHashIterations,
                HashAlgorithmName.SHA256,
                PasswordKeySize);

            return $"{PasswordHashPrefix}${PasswordHashIterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
        }

        private bool VerifyPassword(string password, string? hashedPassword, out bool needsRehash)
        {
            needsRehash = false;

            if (string.IsNullOrEmpty(hashedPassword))
            {
                return false;
            }

            if (hashedPassword.StartsWith($"{PasswordHashPrefix}$", StringComparison.Ordinal))
            {
                try
                {
                    var parts = hashedPassword.Split('$', StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length != 4 || !int.TryParse(parts[1], out var iterations))
                    {
                        return false;
                    }

                    var salt = Convert.FromBase64String(parts[2]);
                    var expectedHash = Convert.FromBase64String(parts[3]);
                    var computedHash = Rfc2898DeriveBytes.Pbkdf2(
                        password,
                        salt,
                        iterations,
                        HashAlgorithmName.SHA256,
                        expectedHash.Length);

                    return CryptographicOperations.FixedTimeEquals(computedHash, expectedHash);
                }
                catch (FormatException)
                {
                    return false;
                }
            }

            // Legacy SHA-256 fallback for old accounts; upgraded on successful login.
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            var legacyHash = Convert.ToBase64String(hashedBytes);
            var isLegacyMatch = string.Equals(legacyHash, hashedPassword, StringComparison.Ordinal);
            needsRehash = isLegacyMatch;
            return isLegacyMatch;
        }

        private async Task<string> GetAccessStateAsync(Guid userId)
        {
            return await _adminContext.UserAccessControls
                .AsNoTracking()
                .Where(item => item.UserId == userId)
                .Select(item => item.AccessState)
                .FirstOrDefaultAsync()
                ?? AdminAccessStates.Active;
        }

        private static bool IsPlaceholderSecret(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return true;
            }

            return string.Equals(value, "default-secret-key", StringComparison.OrdinalIgnoreCase)
                || string.Equals(value, "REPLACE_WITH_USER_SECRET", StringComparison.OrdinalIgnoreCase)
                || string.Equals(value, "SET_IN_USER_SECRETS", StringComparison.OrdinalIgnoreCase)
                || string.Equals(value, "SET_IN_ENV_OR_SECRET_STORE", StringComparison.OrdinalIgnoreCase)
                || string.Equals(value, "YourSuperSecretKeyHereThatIsAtLeast32CharactersLongForProductionUse", StringComparison.OrdinalIgnoreCase)
                || string.Equals(value, "YourSuperSecretKeyHereThatIsAtLeast32CharactersLongForDevelopmentUse", StringComparison.OrdinalIgnoreCase);
        }

        private byte[] GetJwtSigningKey()
        {
            var key = _configuration["Jwt:Key"];
            if (IsPlaceholderSecret(key))
            {
                throw new InvalidOperationException("Jwt:Key is missing or insecure.");
            }

            return Encoding.ASCII.GetBytes(key!);
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
                _logger.LogInformation("User {UserId} đã logout, refresh token đã revoke", user.UserId);
            }
        }

        public async Task<AuthResponse> RefreshTokenAsync(string refreshToken)
        {
            // Validate refresh token format
            if (string.IsNullOrWhiteSpace(refreshToken))
            {
                throw new UnauthorizedAccessException("Refresh token không hợp lệ");
            }

            // Find user by refresh token
            var user = await _context.Users.FirstOrDefaultAsync(u => u.RefreshToken == refreshToken);

            if (user == null)
            {
                throw new UnauthorizedAccessException("Refresh token không hợp lệ hoặc không tìm thấy người dùng");
            }

            if (user.RefreshTokenExpiryTime == null || user.RefreshTokenExpiryTime < DateTime.UtcNow)
            {
                // Token expired
                throw new UnauthorizedAccessException("Refresh token đã hết hạn. Vui lòng đăng nhập lại.");
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

            _logger.LogInformation("Token refreshed cho user {UserId}", user.UserId);

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

        public Task<AuthResponse> GoogleLoginAsync(string idToken)
        {
            // In a real implementation, you would validate the Google ID token
            // and create/login the user. For now, we'll throw an exception
            // as this requires Google OAuth integration
            return Task.FromException<AuthResponse>(new NotImplementedException("Tính năng đăng nhập Google cần tích hợp OAuth"));
        }

        public async Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request)
        {
            _logger.LogInformation("ForgotPassword cho email: {Email}", request.Email);
            var user = await _userRepository.GetByEmailAsync(request.Email);
            
            if (user == null)
            {
                _logger.LogDebug("ForgotPassword - Email không tồn tại: {Email}", request.Email);
                return new ForgotPasswordResponse
                {
                    Success = true,
                    Message = "Nếu email tồn tại, mã đặt lại đã được tạo.",
                    ExpiresAt = DateTime.UtcNow.Add(ResetCodeLifetime),
                    ResetCode = string.Empty
                };
            }

            _logger.LogDebug("ForgotPassword - Tìm thấy user {UserId}", user.UserId);

            var code = GenerateNumericCode(6);
            var expiresAt = DateTime.UtcNow.Add(ResetCodeLifetime);
            var codeHash = HashResetCode(code);

            _logger.LogInformation("Đã tạo reset code cho user {UserId}, hết hạn {ExpiresAt:O}", user.UserId, expiresAt);
            var includeCodeInResponse = _env.IsDevelopment(); // hỗ trợ demo/dev, prod sẽ không trả mã

            try
            {
                await _emailService.SendResetCodeAsync(user.Email, code, expiresAt);
                await UpsertPasswordResetCodeAsync(user.UserId, codeHash, expiresAt);
                _logger.LogInformation("Đã gửi email reset code cho user {UserId}", user.UserId);
            }
            catch (Exception ex)
            {
                if (!includeCodeInResponse)
                {
                    _logger.LogError(ex, "Không gửi được email reset code cho user {UserId}", user.UserId);
                    throw new InvalidOperationException(
                        "Không gửi được email đặt lại mật khẩu. Vui lòng thử lại sau hoặc kiểm tra cấu hình SMTP.");
                }

                _logger.LogWarning(
                    ex,
                    "Dev mode: email reset thất bại cho user {UserId}, trả mã qua response.",
                    user.UserId);
                await UpsertPasswordResetCodeAsync(user.UserId, codeHash, expiresAt);
            }

            return new ForgotPasswordResponse
            {
                Success = true,
                Message = includeCodeInResponse
                    ? "Đã tạo mã đặt lại (chế độ dev)."
                    : "Mã đặt lại đã được gửi tới email của bạn.",
                ExpiresAt = expiresAt,
                ResetCode = includeCodeInResponse ? code : string.Empty
            };
        }

        public async Task VerifyResetCodeAsync(VerifyResetCodeRequest request)
        {
            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null)
            {
                throw new UnauthorizedAccessException("Mã đặt lại hoặc email không hợp lệ.");
            }

            await GetValidPasswordResetCodeAsync(user, request.ResetCode);
        }

        public async Task ResetPasswordAsync(ResetPasswordRequest request)
        {
            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null)
            {
                throw new UnauthorizedAccessException("Mã đặt lại hoặc email không hợp lệ.");
            }

            var resetCode = await GetValidPasswordResetCodeAsync(user, request.ResetCode);

            user.PasswordHash = HashPassword(request.NewPassword);
            // Nếu user reset password thành công nghĩa là họ đã xác minh quyền sở hữu email
            user.EmailVerified = true;
            await _context.SaveChangesAsync();

            resetCode.ConsumedAt = DateTime.UtcNow;
            resetCode.UpdatedAt = DateTime.UtcNow;
            await _adminContext.SaveChangesAsync();

            _logger.LogInformation("Reset password thành công cho user {UserId}", user.UserId);
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

        private async Task<AdminPasswordResetCode> GetValidPasswordResetCodeAsync(User user, string resetCode)
        {
            var storedCode = await _adminContext.PasswordResetCodes
                .FirstOrDefaultAsync(item => item.UserId == user.UserId);

            if (storedCode == null || storedCode.ConsumedAt.HasValue)
            {
                throw new UnauthorizedAccessException("Mã đặt lại đã hết hạn hoặc không tồn tại.");
            }

            if (storedCode.ExpiresAt < DateTime.UtcNow)
            {
                storedCode.ConsumedAt = DateTime.UtcNow;
                storedCode.UpdatedAt = DateTime.UtcNow;
                await _adminContext.SaveChangesAsync();
                throw new UnauthorizedAccessException("Mã đặt lại đã hết hạn hoặc không tồn tại.");
            }

            var hashedInput = HashResetCode(resetCode);
            if (!string.Equals(hashedInput, storedCode.CodeHash, StringComparison.Ordinal))
            {
                throw new UnauthorizedAccessException("Mã đặt lại hoặc email không hợp lệ.");
            }

            return storedCode;
        }

        private async Task UpsertPasswordResetCodeAsync(Guid userId, string codeHash, DateTime expiresAt)
        {
            var now = DateTime.UtcNow;
            var storedCode = await _adminContext.PasswordResetCodes
                .FirstOrDefaultAsync(item => item.UserId == userId);

            if (storedCode == null)
            {
                await _adminContext.PasswordResetCodes.AddAsync(new AdminPasswordResetCode
                {
                    UserId = userId,
                    CodeHash = codeHash,
                    ExpiresAt = expiresAt,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }
            else
            {
                storedCode.CodeHash = codeHash;
                storedCode.ExpiresAt = expiresAt;
                storedCode.ConsumedAt = null;
                storedCode.CreatedAt = now;
                storedCode.UpdatedAt = now;
            }

            await _adminContext.SaveChangesAsync();
        }

        // ========= EMAIL VERIFICATION METHODS =========

        private static readonly TimeSpan VerificationCodeLifetime = TimeSpan.FromMinutes(15);
        private const string VerifyCacheKeyPrefix = "email_verify_";

        /// <summary>
        /// Đăng ký với xác minh email - không cấp token ngay, gửi mã 6 số
        /// </summary>
        public async Task<RegisterResponse> RegisterWithVerificationAsync(RegisterRequest request)
        {
            _logger.LogInformation("Đăng ký với email verification cho: {Email}", request.Email);
            var includeCodeInResponse = _env.IsDevelopment();

            // Check if email already exists
            var existingUser = await _userRepository.GetByEmailAsync(request.Email);
            if (existingUser != null)
            {
                // If email exists but NOT verified, allow re-registration by resetting verification code
                if (!existingUser.EmailVerified)
                {
                    _logger.LogInformation("Email tồn tại nhưng chưa verify, gửi lại mã: {Email}", request.Email);
                    
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
                        _logger.LogInformation("Đã gửi lại mã xác minh cho user {UserId}", existingUser.UserId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Không gửi được email xác minh cho user {UserId}", existingUser.UserId);
                        if (!includeCodeInResponse)
                        {
                            throw new InvalidOperationException("Không gửi được email. Vui lòng thử lại sau.");
                        }
                    }

                    return new RegisterResponse
                    {
                        Success = true,
                        Message = includeCodeInResponse
                            ? "Đã gửi lại mã xác minh (dev mode)" 
                            : "Đã gửi lại mã xác minh. Kiểm tra email của bạn.",
                        Email = existingUser.Email,
                        VerificationCodeExpiresAt = existingUser.VerificationCodeExpiry.Value,
                        VerificationCode = includeCodeInResponse ? newVerificationCode : null
                    };
                }
                
                // Email exists and already verified
                _logger.LogWarning("Email đã được đăng ký và verify: {Email}", request.Email);
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

            _logger.LogInformation("Tạo user mới {UserId}, đang gửi mã xác minh", user.UserId);

            // Gửi email xác minh
            try
            {
                await _emailService.SendVerificationCodeAsync(user.Email, verificationCode, user.VerificationCodeExpiry.Value);
                _logger.LogInformation("Đã gửi mã xác minh cho user {UserId}", user.UserId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Không gửi được email xác minh cho user {UserId}", user.UserId);
                if (!includeCodeInResponse)
                {
                    throw new InvalidOperationException("Không gửi được email. Vui lòng thử lại sau.");
                }
            }

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
            _logger.LogInformation("Xác minh email cho: {Email}", request.Email);

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

            _logger.LogInformation("Email đã xác minh thành công cho: {Email}", request.Email);

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
            _logger.LogInformation("Gửi lại mã xác minh cho: {Email}", request.Email);

            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null)
            {
                throw new UnauthorizedAccessException("Email không tồn tại");
            }

            if (user.EmailVerified)
            {
                throw new InvalidOperationException("Email đã được xác minh trước đó");
            }

            var verificationCode = GenerateNumericCode(6);
            var verificationCodeExpiry = DateTime.UtcNow.Add(VerificationCodeLifetime);
            var includeCodeInResponse = _env.IsDevelopment();
            var emailDelivered = false;

            try
            {
                await _emailService.SendVerificationCodeAsync(user.Email, verificationCode, verificationCodeExpiry);
                emailDelivered = true;
                _logger.LogInformation("Đã gửi lại mã xác minh cho user {UserId}", user.UserId);
            }
            catch (Exception ex)
            {
                if (!includeCodeInResponse)
                {
                    _logger.LogError(ex, "Không gửi lại được email xác minh cho user {UserId}", user.UserId);
                    throw new InvalidOperationException("Không gửi được email. Vui lòng thử lại sau.");
                }

                _logger.LogWarning(
                    ex,
                    "Dev mode: trả mã xác minh trong response cho {Email} do email service thất bại",
                    user.Email);
            }

            if (!emailDelivered && !includeCodeInResponse)
            {
                throw new InvalidOperationException("Không gửi được email. Vui lòng thử lại sau.");
            }

            user.VerificationCode = HashResetCode(verificationCode);
            user.VerificationCodeExpiry = verificationCodeExpiry;
            await _context.SaveChangesAsync();

            return new RegisterResponse
            {
                Success = true,
                Message = includeCodeInResponse 
                    ? "Đã gửi lại mã xác minh (dev mode)" 
                    : "Đã gửi lại mã xác minh. Kiểm tra email của bạn.",
                Email = user.Email,
                VerificationCodeExpiresAt = verificationCodeExpiry,
                VerificationCode = includeCodeInResponse ? verificationCode : null
            };
        }

        /// <summary>
        /// Đánh dấu user đã hoàn thành onboarding
        /// </summary>
        public async Task MarkOnboardingCompletedAsync(Guid userId)
        {
            _logger.LogInformation("Đánh dấu onboarding hoàn thành cho user: {UserId}", userId);

            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
            {
                throw new UnauthorizedAccessException("Người dùng không tồn tại");
            }

            user.OnboardingCompleted = true;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Onboarding hoàn thành cho user: {UserId}", userId);
        }

        /// <summary>
        /// Đổi mật khẩu cho user đã đăng nhập
        /// </summary>
        public async Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword)
        {
            _logger.LogInformation("Đổi mật khẩu cho user: {UserId}", userId);

            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
            {
                throw new UnauthorizedAccessException("Người dùng không tồn tại");
            }

            // Verify current password
            if (!VerifyPassword(currentPassword, user.PasswordHash, out _))
            {
                throw new UnauthorizedAccessException("Mật khẩu hiện tại không đúng");
            }

            // Update password
            user.PasswordHash = HashPassword(newPassword);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Đổi mật khẩu thành công cho user: {UserId}", userId);
        }
    }
}


