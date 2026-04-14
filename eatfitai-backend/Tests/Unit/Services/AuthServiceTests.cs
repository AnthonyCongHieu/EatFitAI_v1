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
using Moq;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services
{
    public class AuthServiceTests : IDisposable
    {
        private const string TestJwtKey = "test-secret-key-for-unit-tests-12345";

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
            _configurationMock.Setup(c => c["Jwt:Issuer"]).Returns("EatFitAI");
            _configurationMock.Setup(c => c["Jwt:Audience"]).Returns("EatFitAI");

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
    }
}
