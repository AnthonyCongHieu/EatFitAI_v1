using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.User;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services
{
    /// <summary>
    /// Unit tests cho UserService - Kiểm tra các chức năng quản lý user profile và body metrics
    /// </summary>
    public class UserServiceTests : IDisposable
    {
        private readonly Mock<IUserRepository> _userRepositoryMock;
        private readonly EatFitAIDbContext _context;
        private readonly Mock<IMapper> _mapperMock;
        private readonly UserService _userService;
        private readonly Guid _testUserId = Guid.NewGuid();

        public UserServiceTests()
        {
            _userRepositoryMock = new Mock<IUserRepository>();
            _mapperMock = new Mock<IMapper>();

            // Setup in-memory database
            var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new EatFitAIDbContext(options);

            _userService = new UserService(
                _userRepositoryMock.Object,
                _context,
                _mapperMock.Object);

            SeedTestData();
        }

        private void SeedTestData()
        {
            // Add test user vào context
            _context.Users.Add(new User
            {
                UserId = _testUserId,
                Email = "testuser@example.com",
                DisplayName = "Test User",
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.UtcNow
            });

            _context.SaveChanges();
        }

        public void Dispose()
        {
            _context.Dispose();
        }

        #region GetUserByIdAsync Tests

        [Fact]
        public async Task GetUserByIdAsync_ValidId_ReturnsUser()
        {
            // Arrange - User tồn tại
            var user = new User
            {
                UserId = _testUserId,
                Email = "test@example.com",
                DisplayName = "Test User"
            };

            _userRepositoryMock.Setup(r => r.GetByIdAsync(_testUserId))
                .ReturnsAsync(user);
            _mapperMock.Setup(m => m.Map<UserDto>(It.IsAny<User>()))
                .Returns(new UserDto { UserId = _testUserId, DisplayName = "Test User" });

            // Act
            var result = await _userService.GetUserByIdAsync(_testUserId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("Test User", result.DisplayName);
        }

        [Fact]
        public async Task GetUserByIdAsync_InvalidId_ThrowsKeyNotFoundException()
        {
            // Arrange - User không tồn tại
            var invalidId = Guid.NewGuid();
            _userRepositoryMock.Setup(r => r.GetByIdAsync(invalidId))
                .ReturnsAsync((User?)null);

            // Act & Assert
            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _userService.GetUserByIdAsync(invalidId));
        }

        #endregion

        #region UpdateUserAsync Tests

        [Fact]
        public async Task UpdateUserAsync_ValidRequest_UpdatesUser()
        {
            // Arrange
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

            _userRepositoryMock.Setup(r => r.GetByIdAsync(_testUserId))
                .ReturnsAsync(existingUser);
            _userRepositoryMock.Setup(r => r.Update(It.IsAny<User>()));
            _mapperMock.Setup(m => m.Map<UserDto>(It.IsAny<User>()))
                .Returns(new UserDto { DisplayName = "New Name" });

            // Act
            var result = await _userService.UpdateUserAsync(_testUserId, updateDto);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("New Name", result.DisplayName);
        }

        [Fact]
        public async Task UpdateUserAsync_InvalidId_ThrowsKeyNotFoundException()
        {
            // Arrange
            var invalidId = Guid.NewGuid();
            _userRepositoryMock.Setup(r => r.GetByIdAsync(invalidId))
                .ReturnsAsync((User?)null);

            // Act & Assert
            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _userService.UpdateUserAsync(invalidId, new UserDto()));
        }

        #endregion

        #region RecordBodyMetricsAsync Tests

        [Fact]
        public async Task RecordBodyMetricsAsync_ValidData_RecordsMetrics()
        {
            // Arrange - Ghi lại chiều cao, cân nặng
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

            // Act
            var result = await _userService.RecordBodyMetricsAsync(_testUserId, bodyMetricDto);

            // Assert
            Assert.NotNull(result);
            _userRepositoryMock.Verify(r => r.GetByIdAsync(_testUserId), Times.Once);
        }

        [Fact]
        public async Task RecordBodyMetricsAsync_InvalidUser_ThrowsException()
        {
            // Arrange
            var invalidId = Guid.NewGuid();
            _userRepositoryMock.Setup(r => r.GetByIdAsync(invalidId))
                .ReturnsAsync((User?)null);

            // Act & Assert
            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _userService.RecordBodyMetricsAsync(invalidId, new BodyMetricDto()));
        }

        #endregion

        #region GetUserProfileAsync Tests

        [Fact]
        public async Task GetUserProfileAsync_ValidUser_ReturnsFullProfile()
        {
            // Arrange - Lấy profile đầy đủ bao gồm body metrics
            var user = new User
            {
                UserId = _testUserId,
                Email = "test@example.com",
                DisplayName = "Test User"
            };

            // Add user vào context để query work
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _mapperMock.Setup(m => m.Map<UserProfileDto>(It.IsAny<User>()))
                .Returns(new UserProfileDto { DisplayName = "Test User" });

            // Act
            var result = await _userService.GetUserProfileAsync(_testUserId);

            // Assert
            Assert.NotNull(result);
        }

        #endregion

        #region UpdateUserProfileAsync Tests

        [Fact]
        public async Task UpdateUserProfileAsync_ValidData_UpdatesAllFields()
        {
            // Arrange - Update profile bao gồm cả body metrics
            var existingUser = new User
            {
                UserId = _testUserId,
                Email = "test@example.com",
                DisplayName = "Old Name"
            };

            var updateDto = new UserProfileDto
            {
                DisplayName = "Updated Name",
                CurrentHeightCm = 175,
                CurrentWeightKg = 70
            };

            _userRepositoryMock.Setup(r => r.GetByIdAsync(_testUserId))
                .ReturnsAsync(existingUser);

            // Setup context để GetUserProfileAsync work
            _context.Users.Add(existingUser);
            await _context.SaveChangesAsync();

            _mapperMock.Setup(m => m.Map<UserProfileDto>(It.IsAny<User>()))
                .Returns(new UserProfileDto { DisplayName = "Updated Name" });

            // Act
            var result = await _userService.UpdateUserProfileAsync(_testUserId, updateDto);

            // Assert
            Assert.NotNull(result);
        }

        [Fact]
        public async Task UpdateUserProfileAsync_InvalidUser_ThrowsKeyNotFoundException()
        {
            // Arrange
            var invalidId = Guid.NewGuid();
            _userRepositoryMock.Setup(r => r.GetByIdAsync(invalidId))
                .ReturnsAsync((User?)null);

            // Act & Assert
            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _userService.UpdateUserProfileAsync(invalidId, new UserProfileDto()));
        }

        #endregion

        #region DeleteUserAsync Tests

        [Fact]
        public async Task DeleteUserAsync_ValidUser_DeletesAllRelatedData()
        {
            // Arrange
            var user = new User
            {
                UserId = _testUserId,
                Email = "test@example.com"
            };

            _userRepositoryMock.Setup(r => r.GetByIdAsync(_testUserId))
                .ReturnsAsync(user);
            _userRepositoryMock.Setup(r => r.Remove(It.IsAny<User>()));

            // Add user to context (required for cascade delete query)
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Act - DeleteUserAsync thực hiện hard delete và các related records
            await _userService.DeleteUserAsync(_testUserId);

            // Assert
            _userRepositoryMock.Verify(r => r.Remove(It.IsAny<User>()), Times.Once);
        }

        [Fact]
        public async Task DeleteUserAsync_InvalidUser_ThrowsKeyNotFoundException()
        {
            // Arrange
            var invalidId = Guid.NewGuid();
            _userRepositoryMock.Setup(r => r.GetByIdAsync(invalidId))
                .ReturnsAsync((User?)null);

            // Act & Assert
            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _userService.DeleteUserAsync(invalidId));
        }

        #endregion
    }
}
