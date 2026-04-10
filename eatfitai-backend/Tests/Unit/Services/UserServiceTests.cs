using AutoMapper;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.User;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services
{
    public class UserServiceTests : IDisposable
    {
        private readonly Mock<IUserRepository> _userRepositoryMock;
        private readonly EatFitAIDbContext _context;
        private readonly Mock<IMapper> _mapperMock;
        private readonly Mock<ISupabaseStorageService> _supabaseStorageServiceMock;
        private readonly Mock<IHostEnvironment> _environmentMock;
        private readonly Mock<ILogger<UserService>> _loggerMock;
        private readonly UserService _userService;
        private readonly Guid _testUserId = Guid.NewGuid();

        public UserServiceTests()
        {
            _userRepositoryMock = new Mock<IUserRepository>();
            _mapperMock = new Mock<IMapper>();
            _supabaseStorageServiceMock = new Mock<ISupabaseStorageService>();
            _environmentMock = new Mock<IHostEnvironment>();
            _loggerMock = new Mock<ILogger<UserService>>();

            var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            _context = new EatFitAIDbContext(options);

            _supabaseStorageServiceMock.SetupGet(s => s.IsConfigured).Returns(false);
            _environmentMock.SetupGet(e => e.EnvironmentName).Returns(Environments.Development);

            _userService = new UserService(
                _userRepositoryMock.Object,
                _context,
                _mapperMock.Object,
                _supabaseStorageServiceMock.Object,
                _environmentMock.Object,
                _loggerMock.Object);

            SeedTestData();
        }

        private void SeedTestData()
        {
            _context.Users.Add(new User
            {
                UserId = _testUserId,
                Email = "testuser@example.com",
                DisplayName = "Test User",
                AvatarUrl = "/uploads/avatars/seed.png",
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.UtcNow,
                EmailVerified = true
            });

            _context.SaveChanges();
        }

        public void Dispose()
        {
            _context.Dispose();
        }

        [Fact]
        public async Task GetUserByIdAsync_ValidId_ReturnsUser()
        {
            var user = new User
            {
                UserId = _testUserId,
                Email = "test@example.com",
                DisplayName = "Test User"
            };

            _userRepositoryMock.Setup(r => r.GetByIdAsync(_testUserId)).ReturnsAsync(user);
            _mapperMock.Setup(m => m.Map<UserDto>(It.IsAny<User>()))
                .Returns(new UserDto { UserId = _testUserId, DisplayName = "Test User" });

            var result = await _userService.GetUserByIdAsync(_testUserId);

            Assert.NotNull(result);
            Assert.Equal("Test User", result.DisplayName);
        }

        [Fact]
        public async Task GetUserByIdAsync_InvalidId_ThrowsKeyNotFoundException()
        {
            var invalidId = Guid.NewGuid();
            _userRepositoryMock.Setup(r => r.GetByIdAsync(invalidId)).ReturnsAsync((User?)null);

            await Assert.ThrowsAsync<KeyNotFoundException>(() => _userService.GetUserByIdAsync(invalidId));
        }

        [Fact]
        public async Task UpdateUserAsync_ValidRequest_UpdatesUser()
        {
            var existingUser = new User
            {
                UserId = _testUserId,
                Email = "old@example.com",
                DisplayName = "Old Name"
            };

            var updateDto = new UserDto
            {
                DisplayName = "New Name"
            };

            _userRepositoryMock.Setup(r => r.GetByIdAsync(_testUserId)).ReturnsAsync(existingUser);
            _userRepositoryMock.Setup(r => r.Update(It.IsAny<User>()));
            _mapperMock.Setup(m => m.Map<UserDto>(It.IsAny<User>()))
                .Returns(new UserDto { DisplayName = "New Name" });

            var result = await _userService.UpdateUserAsync(_testUserId, updateDto);

            Assert.NotNull(result);
            Assert.Equal("New Name", result.DisplayName);
        }

        [Fact]
        public async Task UpdateUserAsync_InvalidId_ThrowsKeyNotFoundException()
        {
            var invalidId = Guid.NewGuid();
            _userRepositoryMock.Setup(r => r.GetByIdAsync(invalidId)).ReturnsAsync((User?)null);

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _userService.UpdateUserAsync(invalidId, new UserDto()));
        }

        [Fact]
        public async Task RecordBodyMetricsAsync_ValidData_RecordsMetrics()
        {
            var bodyMetricDto = new BodyMetricDto
            {
                WeightKg = 70.5m,
                HeightCm = 175,
                MeasuredDate = DateTime.Today
            };

            _userRepositoryMock.Setup(r => r.GetByIdAsync(_testUserId))
                .ReturnsAsync(new User { UserId = _testUserId });
            _mapperMock.Setup(m => m.Map<BodyMetricDto>(It.IsAny<BodyMetric>()))
                .Returns(bodyMetricDto);

            var result = await _userService.RecordBodyMetricsAsync(_testUserId, bodyMetricDto);

            Assert.NotNull(result);
            _userRepositoryMock.Verify(r => r.GetByIdAsync(_testUserId), Times.Once);
            Assert.Single(_context.BodyMetrics.Where(x => x.UserId == _testUserId));
        }

        [Fact]
        public async Task RecordBodyMetricsAsync_InvalidUser_ThrowsException()
        {
            var invalidId = Guid.NewGuid();
            _userRepositoryMock.Setup(r => r.GetByIdAsync(invalidId)).ReturnsAsync((User?)null);

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _userService.RecordBodyMetricsAsync(invalidId, new BodyMetricDto()));
        }

        [Fact]
        public async Task GetUserProfileAsync_ValidUser_ReturnsFullProfile()
        {
            await _context.BodyMetrics.AddAsync(new BodyMetric
            {
                UserId = _testUserId,
                HeightCm = 175,
                WeightKg = 70,
                MeasuredDate = DateOnly.FromDateTime(DateTime.Today),
                Note = "Initial metric"
            });
            await _context.SaveChangesAsync();

            _mapperMock.Setup(m => m.Map<UserProfileDto>(It.IsAny<User>()))
                .Returns(new UserProfileDto { DisplayName = "Test User" });

            var result = await _userService.GetUserProfileAsync(_testUserId);

            Assert.NotNull(result);
            Assert.Equal("Test User", result.DisplayName);
            Assert.Equal(175, result.CurrentHeightCm);
            Assert.Equal(70, result.CurrentWeightKg);
        }

        [Fact]
        public async Task UpdateUserProfileAsync_ValidData_UpdatesAllFields()
        {
            var trackedUser = await _context.Users.SingleAsync(u => u.UserId == _testUserId);
            var updateDto = new UserProfileDto
            {
                DisplayName = "Updated Name",
                CurrentHeightCm = 175,
                CurrentWeightKg = 70,
                Goal = "maintain"
            };

            _userRepositoryMock.Setup(r => r.GetByIdAsync(_testUserId)).ReturnsAsync(trackedUser);
            _userRepositoryMock.Setup(r => r.Update(It.IsAny<User>()));
            _mapperMock.Setup(m => m.Map<UserProfileDto>(It.IsAny<User>()))
                .Returns(new UserProfileDto { DisplayName = "Updated Name" });

            var result = await _userService.UpdateUserProfileAsync(_testUserId, updateDto);

            Assert.NotNull(result);
            Assert.Equal("Updated Name", result.DisplayName);
            Assert.Equal("Updated Name", trackedUser.DisplayName);
            Assert.Single(_context.BodyMetrics.Where(x => x.UserId == _testUserId));
        }

        [Fact]
        public async Task UpdateAvatarAsync_DevelopmentFallback_PersistsAvatarUrl()
        {
            var trackedUser = await _context.Users.SingleAsync(u => u.UserId == _testUserId);
            _userRepositoryMock.Setup(r => r.GetByIdAsync(_testUserId)).ReturnsAsync(trackedUser);
            _userRepositoryMock.Setup(r => r.Update(It.IsAny<User>()));

            await using var imageStream = new MemoryStream(new byte[] { 1, 2, 3, 4 });
            var formFile = new FormFile(imageStream, 0, imageStream.Length, "file", "avatar.png")
            {
                Headers = new HeaderDictionary(),
                ContentType = "image/png"
            };

            var uploadsRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
            var avatarUrl = await _userService.UpdateAvatarAsync(_testUserId, formFile, uploadsRoot);

            Assert.StartsWith("/uploads/avatars/", avatarUrl);
            Assert.Equal(avatarUrl, trackedUser.AvatarUrl);
            Assert.True(Directory.Exists(uploadsRoot));
        }

        [Fact]
        public async Task UpdateUserProfileAsync_InvalidUser_ThrowsKeyNotFoundException()
        {
            var invalidId = Guid.NewGuid();
            _userRepositoryMock.Setup(r => r.GetByIdAsync(invalidId)).ReturnsAsync((User?)null);

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _userService.UpdateUserProfileAsync(invalidId, new UserProfileDto()));
        }

        [Fact]
        public async Task DeleteUserAsync_ValidUser_DeletesAllRelatedData()
        {
            var trackedUser = await _context.Users.SingleAsync(u => u.UserId == _testUserId);

            await _context.BodyMetrics.AddAsync(new BodyMetric
            {
                UserId = _testUserId,
                HeightCm = 175,
                WeightKg = 70,
                MeasuredDate = DateOnly.FromDateTime(DateTime.Today)
            });
            await _context.UserFoodItems.AddAsync(new UserFoodItem
            {
                UserId = _testUserId,
                FoodName = "Test Food",
                UnitType = "g",
                CaloriesPer100 = 100,
                ProteinPer100 = 10,
                CarbPer100 = 10,
                FatPer100 = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsDeleted = false
            });
            await _context.SaveChangesAsync();

            _userRepositoryMock.Setup(r => r.GetByIdAsync(_testUserId)).ReturnsAsync(trackedUser);
            _userRepositoryMock.Setup(r => r.Remove(It.IsAny<User>()))
                .Callback<User>(user => _context.Users.Remove(user));

            await _userService.DeleteUserAsync(_testUserId);

            _userRepositoryMock.Verify(r => r.Remove(It.IsAny<User>()), Times.Once);
            Assert.Empty(_context.BodyMetrics.Where(x => x.UserId == _testUserId));
            Assert.Empty(_context.UserFoodItems.Where(x => x.UserId == _testUserId));
        }

        [Fact]
        public async Task DeleteUserAsync_InvalidUser_ThrowsKeyNotFoundException()
        {
            var invalidId = Guid.NewGuid();
            _userRepositoryMock.Setup(r => r.GetByIdAsync(invalidId)).ReturnsAsync((User?)null);

            await Assert.ThrowsAsync<KeyNotFoundException>(() => _userService.DeleteUserAsync(invalidId));
        }
    }
}
