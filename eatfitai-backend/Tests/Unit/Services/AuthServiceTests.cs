using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using AutoMapper;
using EatFitAI.API.Data;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.Auth;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Moq;
using Xunit;
using AdminPasswordResetCode = EatFitAI.API.Models.PasswordResetCode;

namespace EatFitAI.API.Tests.Unit.Services
{
    public class AuthServiceTests : IDisposable
    {
        private const string TestJwtKey = "test-secret-key-for-unit-tests-12345";
        private const string PreviousJwtKey = "previous-secret-key-for-unit-tests-67890";

        private readonly Mock<IUserRepository> _userRepositoryMock;
        private readonly EatFitAIDbContext _context;
        private readonly ApplicationDbContext _adminContext;
        private readonly Mock<IMapper> _mapperMock;
        private readonly Mock<IConfiguration> _configurationMock;
        private readonly IMemoryCache _memoryCache;
        private readonly Mock<IEmailService> _emailServiceMock;
        private readonly Mock<IHostEnvironment> _envMock;
        private readonly Mock<ILogger<AuthService>> _loggerMock;
        private readonly AuthService _authService;

        public AuthServiceTests()
        {
            _userRepositoryMock = new Mock<IUserRepository>();
            _mapperMock = new Mock<IMapper>();
            _configurationMock = new Mock<IConfiguration>();
            _memoryCache = new MemoryCache(new MemoryCacheOptions());
            _emailServiceMock = new Mock<IEmailService>();
            _envMock = new Mock<IHostEnvironment>();
            _loggerMock = new Mock<ILogger<AuthService>>();

            _envMock.SetupGet(e => e.EnvironmentName).Returns(Environments.Development);
            _configurationMock.Setup(c => c["Jwt:Key"]).Returns(TestJwtKey);
            _configurationMock.Setup(c => c["Jwt:PreviousKeys"]).Returns(PreviousJwtKey);
            _configurationMock.Setup(c => c["Jwt:Issuer"]).Returns("EatFitAI");
            _configurationMock.Setup(c => c["Jwt:Audience"]).Returns("EatFitAI");
            SetupConfigurationValue("Auth:AllowAuthCodesInResponse", "false");

            var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            _context = new EatFitAIDbContext(options);

            var adminOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            _adminContext = new ApplicationDbContext(adminOptions);

            _authService = new AuthService(
                _userRepositoryMock.Object,
                _context,
                _adminContext,
                _mapperMock.Object,
                _configurationMock.Object,
                _memoryCache,
                _emailServiceMock.Object,
                _envMock.Object,
                _loggerMock.Object);
        }

        public void Dispose()
        {
            _context.Dispose();
            _adminContext.Dispose();
            _memoryCache.Dispose();
        }

        [Fact]
        public async Task RegisterAsync_ValidUser_ReturnsSuccess()
        {
            var request = new RegisterRequest
            {
                Email = "test@example.com",
                Password = "password123",
                DisplayName = "Test User"
            };

            _userRepositoryMock.Setup(r => r.EmailExistsAsync(request.Email)).ReturnsAsync(false);
            _userRepositoryMock.Setup(r => r.AddAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

            var result = await _authService.RegisterAsync(request);

            Assert.NotNull(result);
            Assert.Equal(request.Email, result.Email);
            Assert.Equal(request.DisplayName, result.DisplayName);
            Assert.False(string.IsNullOrWhiteSpace(result.Token));
            Assert.False(string.IsNullOrWhiteSpace(result.RefreshToken));
        }

        [Fact]
        public async Task RegisterAsync_ExistingEmail_ThrowsException()
        {
            var request = new RegisterRequest
            {
                Email = "existing@example.com",
                Password = "password123",
                DisplayName = "Existing User"
            };

            _userRepositoryMock.Setup(r => r.EmailExistsAsync(request.Email)).ReturnsAsync(true);

            await Assert.ThrowsAsync<InvalidOperationException>(() => _authService.RegisterAsync(request));
        }

        [Fact]
        public async Task RegisterAsync_NonDevelopment_ThrowsNotSupportedException()
        {
            var request = new RegisterRequest
            {
                Email = "legacy-production@example.com",
                Password = "password123",
                DisplayName = "Legacy Production"
            };

            _envMock.SetupGet(e => e.EnvironmentName).Returns(Environments.Production);

            await Assert.ThrowsAsync<NotSupportedException>(() => _authService.RegisterAsync(request));
        }

        [Fact]
        public async Task RegisterWithVerificationAsync_EmailSendFailsInProduction_ThrowsInvalidOperationException()
        {
            var request = new RegisterRequest
            {
                Email = "verify-production@example.com",
                Password = "password123",
                DisplayName = "Verify Production"
            };

            _envMock.SetupGet(e => e.EnvironmentName).Returns(Environments.Production);
            _userRepositoryMock.Setup(r => r.GetByEmailAsync(request.Email)).ReturnsAsync((User?)null);
            _userRepositoryMock.Setup(r => r.AddAsync(It.IsAny<User>())).Returns(Task.CompletedTask);
            _emailServiceMock
                .Setup(s => s.SendVerificationCodeAsync(request.Email, It.IsAny<string>(), It.IsAny<DateTime>()))
                .ThrowsAsync(new TimeoutException("SMTP verification send timed out."));

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _authService.RegisterWithVerificationAsync(request));

            Assert.Equal("Không gửi được email. Vui lòng thử lại sau.", ex.Message);
        }

        [Fact]
        public async Task RegisterWithVerificationAsync_EmailSendFailsInDevelopment_ReturnsVerificationCode()
        {
            var request = new RegisterRequest
            {
                Email = "verify-development@example.com",
                Password = "password123",
                DisplayName = "Verify Development"
            };

            _envMock.SetupGet(e => e.EnvironmentName).Returns(Environments.Development);
            _userRepositoryMock.Setup(r => r.GetByEmailAsync(request.Email)).ReturnsAsync((User?)null);
            _userRepositoryMock.Setup(r => r.AddAsync(It.IsAny<User>())).Returns(Task.CompletedTask);
            _emailServiceMock
                .Setup(s => s.SendVerificationCodeAsync(request.Email, It.IsAny<string>(), It.IsAny<DateTime>()))
                .ThrowsAsync(new TimeoutException("SMTP verification send timed out."));

            var result = await _authService.RegisterWithVerificationAsync(request);

            Assert.True(result.Success);
            Assert.Equal(request.Email, result.Email);
            Assert.False(string.IsNullOrWhiteSpace(result.VerificationCode));
        }

        [Fact]
        public async Task RegisterWithVerificationAsync_EmailSendFailsInProductionWithSmokeCodeFlag_ReturnsVerificationCode()
        {
            var request = new RegisterRequest
            {
                Email = "verify-smoke@example.com",
                Password = "password123",
                DisplayName = "Verify Smoke"
            };

            _envMock.SetupGet(e => e.EnvironmentName).Returns(Environments.Production);
            SetupConfigurationValue("Auth:AllowAuthCodesInResponse", "true");
            _userRepositoryMock.Setup(r => r.GetByEmailAsync(request.Email)).ReturnsAsync((User?)null);
            _userRepositoryMock.Setup(r => r.AddAsync(It.IsAny<User>())).Returns(Task.CompletedTask);
            _emailServiceMock
                .Setup(s => s.SendVerificationCodeAsync(request.Email, It.IsAny<string>(), It.IsAny<DateTime>()))
                .ThrowsAsync(new TimeoutException("SMTP verification send timed out."));

            var result = await _authService.RegisterWithVerificationAsync(request);

            Assert.True(result.Success);
            Assert.Equal(request.Email, result.Email);
            Assert.Matches("^\\d{6}$", result.VerificationCode);
        }

        [Fact]
        public async Task LoginAsync_ValidCredentials_ReturnsSuccess()
        {
            var request = new LoginRequest
            {
                Email = "test@example.com",
                Password = "password123"
            };

            var user = new User
            {
                UserId = Guid.NewGuid(),
                Email = request.Email,
                PasswordHash = HashLegacyPassword(request.Password),
                DisplayName = "Test User",
                CreatedAt = DateTime.UtcNow,
                EmailVerified = true,
                OnboardingCompleted = false
            };

            _userRepositoryMock.Setup(r => r.GetByEmailAsync(request.Email)).ReturnsAsync(user);

            var result = await _authService.LoginAsync(request);

            Assert.NotNull(result);
            Assert.Equal(request.Email, result.Email);
            Assert.Equal(user.DisplayName, result.DisplayName);
            Assert.False(string.IsNullOrWhiteSpace(result.Token));
            Assert.True(result.NeedsOnboarding);
        }

        [Fact]
        public async Task LoginAsync_InvalidEmail_ThrowsException()
        {
            var request = new LoginRequest
            {
                Email = "invalid@example.com",
                Password = "password123"
            };

            _userRepositoryMock.Setup(r => r.GetByEmailAsync(request.Email)).ReturnsAsync((User?)null);

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _authService.LoginAsync(request));
        }

        [Fact]
        public async Task LoginAsync_InvalidPassword_ThrowsException()
        {
            var request = new LoginRequest
            {
                Email = "test@example.com",
                Password = "wrongpassword"
            };

            var user = new User
            {
                UserId = Guid.NewGuid(),
                Email = request.Email,
                PasswordHash = HashLegacyPassword("password123"),
                DisplayName = "Test User",
                CreatedAt = DateTime.UtcNow,
                EmailVerified = true
            };

            _userRepositoryMock.Setup(r => r.GetByEmailAsync(request.Email)).ReturnsAsync(user);

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _authService.LoginAsync(request));
        }

        [Fact]
        public async Task LoginAsync_SuspendedUser_ThrowsUnauthorizedAccessException()
        {
            var request = new LoginRequest
            {
                Email = "suspended@example.com",
                Password = "password123"
            };

            var user = new User
            {
                UserId = Guid.NewGuid(),
                Email = request.Email,
                PasswordHash = HashLegacyPassword(request.Password),
                DisplayName = "Suspended User",
                CreatedAt = DateTime.UtcNow,
                EmailVerified = true
            };

            _userRepositoryMock.Setup(r => r.GetByEmailAsync(request.Email)).ReturnsAsync(user);
            _adminContext.UserAccessControls.Add(new EatFitAI.API.Models.UserAccessControl
            {
                UserId = user.UserId,
                AccessState = EatFitAI.API.Security.AdminAccessStates.Suspended,
                UpdatedAt = DateTime.UtcNow,
            });
            await _adminContext.SaveChangesAsync();

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _authService.LoginAsync(request));
        }

        [Fact]
        public async Task ValidateTokenAsync_ValidToken_ReturnsTrue()
        {
            var user = new User
            {
                UserId = Guid.NewGuid(),
                Email = "test@example.com",
                DisplayName = "Test User",
                CreatedAt = DateTime.UtcNow
            };

            var method = typeof(AuthService).GetMethod(
                "GenerateJwtToken",
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            var token = method?.Invoke(_authService, new object[] { user }) as string;

            var isValid = await _authService.ValidateTokenAsync(token!);

            Assert.True(isValid);
        }

        [Fact]
        public async Task ValidateTokenAsync_InvalidToken_ReturnsFalse()
        {
            var isValid = await _authService.ValidateTokenAsync("invalid.jwt.token");

            Assert.False(isValid);
        }

        [Fact]
        public async Task ValidateTokenAsync_TokenSignedByPreviousKey_ReturnsTrue()
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var descriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
                    new Claim(ClaimTypes.Email, "previous-key@example.com"),
                }),
                Issuer = "EatFitAI",
                Audience = "EatFitAI",
                Expires = DateTime.UtcNow.AddMinutes(15),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(Encoding.UTF8.GetBytes(PreviousJwtKey)),
                    SecurityAlgorithms.HmacSha256Signature),
            };

            var token = tokenHandler.WriteToken(tokenHandler.CreateToken(descriptor));
            var isValid = await _authService.ValidateTokenAsync(token);

            Assert.True(isValid);
        }

        [Fact]
        public async Task ForgotPasswordAsync_EmailSendFailsInProduction_DoesNotPersistResetCode()
        {
            var request = new ForgotPasswordRequest { Email = "reset@example.com" };
            var user = new User
            {
                UserId = Guid.NewGuid(),
                Email = request.Email,
                PasswordHash = HashLegacyPassword("password123"),
                EmailVerified = true,
                CreatedAt = DateTime.UtcNow
            };

            _envMock.SetupGet(e => e.EnvironmentName).Returns(Environments.Production);
            _userRepositoryMock.Setup(r => r.GetByEmailAsync(request.Email)).ReturnsAsync(user);
            _emailServiceMock
                .Setup(s => s.SendResetCodeAsync(request.Email, It.IsAny<string>(), It.IsAny<DateTime>()))
                .ThrowsAsync(new TimeoutException("SMTP reset send timed out."));

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _authService.ForgotPasswordAsync(request));

            Assert.Equal(
                "Không gửi được email đặt lại mật khẩu. Vui lòng thử lại sau hoặc kiểm tra cấu hình SMTP.",
                ex.Message);
        }

        [Fact]
        public async Task ForgotPasswordAsync_EmailSendFailsInProductionWithSmokeCodeFlag_ReturnsResetCode()
        {
            var request = new ForgotPasswordRequest { Email = "reset-smoke@example.com" };
            var user = new User
            {
                UserId = Guid.NewGuid(),
                Email = request.Email,
                PasswordHash = HashLegacyPassword("password123"),
                EmailVerified = true,
                CreatedAt = DateTime.UtcNow
            };

            _envMock.SetupGet(e => e.EnvironmentName).Returns(Environments.Production);
            SetupConfigurationValue("Auth:AllowAuthCodesInResponse", "true");
            _userRepositoryMock.Setup(r => r.GetByEmailAsync(request.Email)).ReturnsAsync(user);
            _emailServiceMock
                .Setup(s => s.SendResetCodeAsync(request.Email, It.IsAny<string>(), It.IsAny<DateTime>()))
                .ThrowsAsync(new TimeoutException("SMTP reset send timed out."));

            var result = await _authService.ForgotPasswordAsync(request);

            Assert.True(result.Success);
            Assert.Matches("^\\d{6}$", result.ResetCode);

            var storedCode = await _adminContext.PasswordResetCodes.SingleAsync(item => item.UserId == user.UserId);
            Assert.Null(storedCode.ConsumedAt);
        }

        [Fact]
        public async Task VerifyResetCodeAsync_ValidCode_DoesNotThrow()
        {
            var user = await AddTrackedUserAsync("verify-reset@example.com");
            await SeedPasswordResetCodeAsync(user.UserId, "123456");

            await _authService.VerifyResetCodeAsync(new VerifyResetCodeRequest
            {
                Email = user.Email,
                ResetCode = "123456",
            });
        }

        [Fact]
        public async Task VerifyResetCodeAsync_InvalidCode_ThrowsUnauthorizedAccessException()
        {
            var user = await AddTrackedUserAsync("invalid-reset@example.com");
            await SeedPasswordResetCodeAsync(user.UserId, "123456");

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                _authService.VerifyResetCodeAsync(new VerifyResetCodeRequest
                {
                    Email = user.Email,
                    ResetCode = "654321",
                }));
        }

        [Fact]
        public async Task VerifyResetCodeAsync_ExpiredCode_ThrowsUnauthorizedAccessException_AndMarksConsumed()
        {
            var user = await AddTrackedUserAsync("expired-reset@example.com");
            await SeedPasswordResetCodeAsync(user.UserId, "123456", DateTime.UtcNow.AddMinutes(-1));

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                _authService.VerifyResetCodeAsync(new VerifyResetCodeRequest
                {
                    Email = user.Email,
                    ResetCode = "123456",
                }));

            var storedCode = await _adminContext.PasswordResetCodes.SingleAsync(item => item.UserId == user.UserId);
            Assert.NotNull(storedCode.ConsumedAt);
        }

        [Fact]
        public async Task VerifyResetCodeAsync_ConsumedCode_ThrowsUnauthorizedAccessException()
        {
            var user = await AddTrackedUserAsync("consumed-reset@example.com");
            await SeedPasswordResetCodeAsync(
                user.UserId,
                "123456",
                consumedAt: DateTime.UtcNow.AddMinutes(-1));

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                _authService.VerifyResetCodeAsync(new VerifyResetCodeRequest
                {
                    Email = user.Email,
                    ResetCode = "123456",
                }));
        }

        [Fact]
        public async Task RefreshTokenAsync_SuspendedUser_ThrowsUnauthorizedAccessException_AndRevokesToken()
        {
            var user = await AddTrackedUserAsync("refresh-suspended@example.com");
            user.RefreshToken = "refresh-token-value";
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(30);
            await _context.SaveChangesAsync();
            await SetAccessStateAsync(user.UserId, EatFitAI.API.Security.AdminAccessStates.Suspended);

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                _authService.RefreshTokenAsync(user.RefreshToken!));

            var updatedUser = await _context.Users.SingleAsync(item => item.UserId == user.UserId);
            Assert.Null(updatedUser.RefreshToken);
            Assert.Null(updatedUser.RefreshTokenExpiryTime);
        }

        [Fact]
        public async Task ResetPasswordAsync_ValidCode_UpdatesPasswordAndConsumesCode()
        {
            var user = await AddTrackedUserAsync("reset-success@example.com", "OldPass123");
            await SeedPasswordResetCodeAsync(user.UserId, "123456");
            user.RefreshToken = "refresh-before-reset";
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(30);
            await _context.SaveChangesAsync();
            var oldPasswordHash = user.PasswordHash;

            await _authService.ResetPasswordAsync(new ResetPasswordRequest
            {
                Email = user.Email,
                ResetCode = "123456",
                NewPassword = "NewPass123",
            });

            var updatedUser = await _context.Users.SingleAsync(item => item.UserId == user.UserId);
            var storedCode = await _adminContext.PasswordResetCodes.SingleAsync(item => item.UserId == user.UserId);

            Assert.NotEqual(oldPasswordHash, updatedUser.PasswordHash);
            Assert.True(updatedUser.EmailVerified);
            Assert.NotNull(storedCode.ConsumedAt);
            Assert.Null(updatedUser.RefreshToken);
            Assert.Null(updatedUser.RefreshTokenExpiryTime);

            var loginResult = await _authService.LoginAsync(new LoginRequest
            {
                Email = user.Email,
                Password = "NewPass123",
            });
            Assert.Equal(user.Email, loginResult.Email);
        }

        [Fact]
        public async Task ChangePasswordAsync_ValidPassword_RevokesRefreshToken()
        {
            var user = await AddTrackedUserAsync("change-password@example.com", "OldPass123");
            user.RefreshToken = "refresh-before-change";
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(30);
            await _context.SaveChangesAsync();

            await _authService.ChangePasswordAsync(user.UserId, "OldPass123", "NewPass123");

            var updatedUser = await _context.Users.SingleAsync(item => item.UserId == user.UserId);
            Assert.Null(updatedUser.RefreshToken);
            Assert.Null(updatedUser.RefreshTokenExpiryTime);
        }

        [Fact]
        public async Task ForgotPasswordAsync_ResetCodeSurvivesServiceRecreation()
        {
            var user = await AddTrackedUserAsync("recreate-reset@example.com");
            _emailServiceMock
                .Setup(s => s.SendResetCodeAsync(user.Email, It.IsAny<string>(), It.IsAny<DateTime>()))
                .Returns(Task.CompletedTask);

            var forgotResult = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest
            {
                Email = user.Email,
            });

            var recreatedService = new AuthService(
                _userRepositoryMock.Object,
                _context,
                _adminContext,
                _mapperMock.Object,
                _configurationMock.Object,
                new MemoryCache(new MemoryCacheOptions()),
                _emailServiceMock.Object,
                _envMock.Object,
                _loggerMock.Object);

            await recreatedService.VerifyResetCodeAsync(new VerifyResetCodeRequest
            {
                Email = user.Email,
                ResetCode = forgotResult.ResetCode,
            });
        }

        [Fact]
        public async Task ResendVerificationAsync_EmailSendFailsInProduction_DoesNotRotateVerificationCode()
        {
            var existingCode = Convert.ToBase64String(Encoding.UTF8.GetBytes("existing-code"));
            var existingExpiry = DateTime.UtcNow.AddMinutes(5);
            var user = new User
            {
                UserId = Guid.NewGuid(),
                Email = "resend@example.com",
                PasswordHash = HashLegacyPassword("password123"),
                CreatedAt = DateTime.UtcNow,
                EmailVerified = false,
                VerificationCode = existingCode,
                VerificationCodeExpiry = existingExpiry
            };

            _envMock.SetupGet(e => e.EnvironmentName).Returns(Environments.Production);
            _userRepositoryMock.Setup(r => r.GetByEmailAsync(user.Email)).ReturnsAsync(user);
            _emailServiceMock
                .Setup(s => s.SendVerificationCodeAsync(user.Email, It.IsAny<string>(), It.IsAny<DateTime>()))
                .ThrowsAsync(new TimeoutException("SMTP verification send timed out."));

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _authService.ResendVerificationAsync(new ResendVerificationRequest { Email = user.Email }));

            Assert.Equal("Không gửi được email. Vui lòng thử lại sau.", ex.Message);
            Assert.Equal(existingCode, user.VerificationCode);
            Assert.Equal(existingExpiry, user.VerificationCodeExpiry);
        }

        private static string HashLegacyPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(hashedBytes);
        }

        private void SetupConfigurationValue(string key, string? value)
        {
            var section = new Mock<IConfigurationSection>();
            section.SetupGet(s => s.Value).Returns(value);
            _configurationMock.Setup(c => c.GetSection(key)).Returns(section.Object);
        }

        private async Task<User> AddTrackedUserAsync(string email, string password = "password123")
        {
            var user = new User
            {
                UserId = Guid.NewGuid(),
                Email = email,
                PasswordHash = HashLegacyPassword(password),
                DisplayName = "Tracked User",
                CreatedAt = DateTime.UtcNow,
                EmailVerified = true,
                OnboardingCompleted = false,
            };

            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();
            _userRepositoryMock.Setup(r => r.GetByEmailAsync(email)).ReturnsAsync(user);

            return user;
        }

        private async Task SeedPasswordResetCodeAsync(
            Guid userId,
            string resetCode,
            DateTime? expiresAt = null,
            DateTime? consumedAt = null)
        {
            _adminContext.PasswordResetCodes.Add(new AdminPasswordResetCode
            {
                UserId = userId,
                CodeHash = HashResetCode(resetCode),
                ExpiresAt = expiresAt ?? DateTime.UtcNow.AddMinutes(10),
                ConsumedAt = consumedAt,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });

            await _adminContext.SaveChangesAsync();
        }

        private async Task SetAccessStateAsync(Guid userId, string accessState)
        {
            var control = await _adminContext.UserAccessControls.SingleOrDefaultAsync(item => item.UserId == userId);
            if (control == null)
            {
                control = new EatFitAI.API.Models.UserAccessControl
                {
                    UserId = userId,
                    AccessState = accessState,
                    UpdatedAt = DateTime.UtcNow,
                };
                _adminContext.UserAccessControls.Add(control);
            }
            else
            {
                control.AccessState = accessState;
                control.UpdatedAt = DateTime.UtcNow;
            }

            await _adminContext.SaveChangesAsync();
        }

        private static string HashResetCode(string code)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(code));
            return Convert.ToBase64String(hashedBytes);
        }
    }
}
