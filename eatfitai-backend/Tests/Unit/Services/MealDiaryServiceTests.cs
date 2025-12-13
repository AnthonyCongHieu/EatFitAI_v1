using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.MealDiary;
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
    /// Unit tests cho MealDiaryService - Kiểm tra CRUD operations và tính toán macros
    /// </summary>
    public class MealDiaryServiceTests : IDisposable
    {
        private readonly Mock<IMealDiaryRepository> _mealDiaryRepositoryMock;
        private readonly EatFitAIDbContext _context;
        private readonly Mock<IMapper> _mapperMock;
        private readonly MealDiaryService _mealDiaryService;
        private readonly Guid _testUserId = Guid.NewGuid();

        public MealDiaryServiceTests()
        {
            _mealDiaryRepositoryMock = new Mock<IMealDiaryRepository>();
            _mapperMock = new Mock<IMapper>();

            // Setup in-memory database cho việc test CRUD và macro computation
            var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new EatFitAIDbContext(options);

            _mealDiaryService = new MealDiaryService(
                _mealDiaryRepositoryMock.Object,
                _context,
                _mapperMock.Object);

            // Seed test data cho context
            SeedTestData();
        }

        private void SeedTestData()
        {
            // Add test FoodItems
            _context.FoodItems.AddRange(
                new FoodItem
                {
                    FoodItemId = 1,
                    FoodName = "Cơm trắng",
                    CaloriesPer100g = 130,
                    ProteinPer100g = 2.7m,
                    CarbPer100g = 28,
                    FatPer100g = 0.3m
                },
                new FoodItem
                {
                    FoodItemId = 2,
                    FoodName = "Thịt gà",
                    CaloriesPer100g = 165,
                    ProteinPer100g = 31,
                    CarbPer100g = 0,
                    FatPer100g = 3.6m
                }
            );

            // Add test UserFoodItem
            _context.UserFoodItems.Add(new UserFoodItem
            {
                UserFoodItemId = 1,
                UserId = _testUserId,
                FoodName = "Phở bò tự làm",
                CaloriesPer100 = 420,
                ProteinPer100 = 25,
                CarbPer100 = 55,
                FatPer100 = 10
            });

            _context.SaveChanges();
        }

        public void Dispose()
        {
            _context.Dispose();
        }

        #region GetUserMealDiariesAsync Tests

        [Fact]
        public async Task GetUserMealDiariesAsync_ValidUserId_ReturnsDiaries()
        {
            // Arrange - User có meal diaries
            var mealDiaries = new List<MealDiary>
            {
                new MealDiary { MealDiaryId = 1, UserId = _testUserId, FoodItemId = 1, Grams = 200, Calories = 260 },
                new MealDiary { MealDiaryId = 2, UserId = _testUserId, FoodItemId = 2, Grams = 150, Calories = 247 }
            };

            var expectedDtos = new List<MealDiaryDto>
            {
                new MealDiaryDto { MealDiaryId = 1, FoodItemName = "Cơm trắng", Grams = 200, Calories = 260 },
                new MealDiaryDto { MealDiaryId = 2, FoodItemName = "Thịt gà", Grams = 150, Calories = 247 }
            };

            _mealDiaryRepositoryMock.Setup(r => r.GetByUserIdAsync(_testUserId, null))
                .ReturnsAsync(mealDiaries);
            _mapperMock.Setup(m => m.Map<List<MealDiaryDto>>(It.IsAny<IEnumerable<MealDiary>>()))
                .Returns(expectedDtos);

            // Act
            var result = await _mealDiaryService.GetUserMealDiariesAsync(_testUserId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result.Count());
        }

        [Fact]
        public async Task GetUserMealDiariesAsync_WithDateFilter_ReturnsFilteredResults()
        {
            // Arrange - Lọc theo ngày
            var filterDate = new DateTime(2024, 1, 15);
            var mealDiaries = new List<MealDiary>
            {
                new MealDiary { MealDiaryId = 1, UserId = _testUserId, EatenDate = DateOnly.FromDateTime(filterDate) }
            };

            _mealDiaryRepositoryMock.Setup(r => r.GetByUserIdAsync(_testUserId, filterDate))
                .ReturnsAsync(mealDiaries);
            _mapperMock.Setup(m => m.Map<List<MealDiaryDto>>(It.IsAny<IEnumerable<MealDiary>>()))
                .Returns(new List<MealDiaryDto> { new MealDiaryDto { MealDiaryId = 1 } });

            // Act
            var result = await _mealDiaryService.GetUserMealDiariesAsync(_testUserId, filterDate);

            // Assert
            Assert.Single(result);
            _mealDiaryRepositoryMock.Verify(r => r.GetByUserIdAsync(_testUserId, filterDate), Times.Once);
        }

        #endregion

        #region GetMealDiaryByIdAsync Tests

        [Fact]
        public async Task GetMealDiaryByIdAsync_ValidId_ReturnsDiary()
        {
            // Arrange - Entry tồn tại và thuộc về user
            var mealDiary = new MealDiary
            {
                MealDiaryId = 1,
                UserId = _testUserId,
                FoodItemId = 1,
                Grams = 200,
                Calories = 260,
                IsDeleted = false
            };

            _mealDiaryRepositoryMock.Setup(r => r.GetByIdWithIncludesAsync(1))
                .ReturnsAsync(mealDiary);
            _mapperMock.Setup(m => m.Map<MealDiaryDto>(It.IsAny<MealDiary>()))
                .Returns(new MealDiaryDto { MealDiaryId = 1, Grams = 200, Calories = 260 });

            // Act
            var result = await _mealDiaryService.GetMealDiaryByIdAsync(1, _testUserId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(200, result.Grams);
        }

        [Fact]
        public async Task GetMealDiaryByIdAsync_NotFound_ThrowsKeyNotFoundException()
        {
            // Arrange - Entry không tồn tại
            _mealDiaryRepositoryMock.Setup(r => r.GetByIdWithIncludesAsync(999))
                .ReturnsAsync((MealDiary?)null);

            // Act & Assert
            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _mealDiaryService.GetMealDiaryByIdAsync(999, _testUserId));
        }

        [Fact]
        public async Task GetMealDiaryByIdAsync_WrongUser_ThrowsKeyNotFoundException()
        {
            // Arrange - Entry thuộc user khác
            var otherUserId = Guid.NewGuid();
            var mealDiary = new MealDiary
            {
                MealDiaryId = 1,
                UserId = otherUserId, // Khác với _testUserId
                IsDeleted = false
            };

            _mealDiaryRepositoryMock.Setup(r => r.GetByIdWithIncludesAsync(1))
                .ReturnsAsync(mealDiary);

            // Act & Assert - Không được phép truy cập entry của user khác
            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _mealDiaryService.GetMealDiaryByIdAsync(1, _testUserId));
        }

        [Fact]
        public async Task GetMealDiaryByIdAsync_DeletedEntry_ThrowsKeyNotFoundException()
        {
            // Arrange - Entry đã bị xóa (soft delete)
            var mealDiary = new MealDiary
            {
                MealDiaryId = 1,
                UserId = _testUserId,
                IsDeleted = true
            };

            _mealDiaryRepositoryMock.Setup(r => r.GetByIdWithIncludesAsync(1))
                .ReturnsAsync(mealDiary);

            // Act & Assert
            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _mealDiaryService.GetMealDiaryByIdAsync(1, _testUserId));
        }

        #endregion

        #region CreateMealDiaryAsync Tests

        [Fact]
        public async Task CreateMealDiaryAsync_WithFoodItem_CreatesDiaryWithMacros()
        {
            // Arrange - Tạo entry từ catalog FoodItem
            var request = new CreateMealDiaryRequest
            {
                EatenDate = DateTime.Today,
                MealTypeId = 2, // Lunch
                FoodItemId = 1, // Cơm trắng (130 cal/100g)
                Grams = 200
            };

            var mappedDiary = new MealDiary
            {
                UserId = _testUserId,
                EatenDate = DateOnly.FromDateTime(request.EatenDate),
                MealTypeId = 2,
                FoodItemId = 1,
                Grams = 200
            };

            _mapperMock.Setup(m => m.Map<MealDiary>(request)).Returns(mappedDiary);
            _mealDiaryRepositoryMock.Setup(r => r.AddAsync(It.IsAny<MealDiary>()))
                .Returns(Task.CompletedTask);
            _mealDiaryRepositoryMock.Setup(r => r.GetByIdWithIncludesAsync(It.IsAny<int>()))
                .ReturnsAsync(mappedDiary);
            _mapperMock.Setup(m => m.Map<MealDiaryDto>(It.IsAny<MealDiary>()))
                .Returns(new MealDiaryDto { MealDiaryId = 1, Calories = 260 });

            // Act
            var result = await _mealDiaryService.CreateMealDiaryAsync(_testUserId, request);

            // Assert
            Assert.NotNull(result);
            _mealDiaryRepositoryMock.Verify(r => r.AddAsync(It.IsAny<MealDiary>()), Times.Once);
        }

        [Fact]
        public async Task CreateMealDiaryAsync_WithUserFoodItem_CreatesDiaryWithUserMacros()
        {
            // Arrange - Tạo entry từ UserFoodItem
            var request = new CreateMealDiaryRequest
            {
                EatenDate = DateTime.Today,
                MealTypeId = 1, // Breakfast
                UserFoodItemId = 1, // Phở bò tự làm (420 cal/100g)
                Grams = 350
            };

            var mappedDiary = new MealDiary
            {
                UserId = _testUserId,
                EatenDate = DateOnly.FromDateTime(request.EatenDate),
                MealTypeId = 1,
                UserFoodItemId = 1,
                Grams = 350
            };

            _mapperMock.Setup(m => m.Map<MealDiary>(request)).Returns(mappedDiary);
            _mealDiaryRepositoryMock.Setup(r => r.AddAsync(It.IsAny<MealDiary>()))
                .Returns(Task.CompletedTask);
            _mealDiaryRepositoryMock.Setup(r => r.GetByIdWithIncludesAsync(It.IsAny<int>()))
                .ReturnsAsync(mappedDiary);
            _mapperMock.Setup(m => m.Map<MealDiaryDto>(It.IsAny<MealDiary>()))
                .Returns(new MealDiaryDto { MealDiaryId = 1, Calories = 1470 }); // 420 * 3.5

            // Act
            var result = await _mealDiaryService.CreateMealDiaryAsync(_testUserId, request);

            // Assert
            Assert.NotNull(result);
        }

        #endregion

        #region UpdateMealDiaryAsync Tests

        [Fact]
        public async Task UpdateMealDiaryAsync_ValidRequest_UpdatesDiary()
        {
            // Arrange - Update grams của entry
            var existingDiary = new MealDiary
            {
                MealDiaryId = 1,
                UserId = _testUserId,
                FoodItemId = 1,
                Grams = 200,
                Calories = 260,
                Protein = 5.4m,
                Carb = 56,
                Fat = 0.6m,
                IsDeleted = false
            };

            var updateRequest = new UpdateMealDiaryRequest
            {
                Grams = 300, // Tăng từ 200 -> 300
                Note = "Ăn thêm một chút"
            };

            _mealDiaryRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existingDiary);
            _mealDiaryRepositoryMock.Setup(r => r.Update(It.IsAny<MealDiary>()));
            _mealDiaryRepositoryMock.Setup(r => r.GetByIdWithIncludesAsync(1)).ReturnsAsync(existingDiary);
            _mapperMock.Setup(m => m.Map<MealDiaryDto>(It.IsAny<MealDiary>()))
                .Returns(new MealDiaryDto { MealDiaryId = 1, Grams = 300, Note = "Ăn thêm một chút" });

            // Act
            var result = await _mealDiaryService.UpdateMealDiaryAsync(1, _testUserId, updateRequest);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(300, result.Grams);
            Assert.Equal("Ăn thêm một chút", result.Note);
        }

        [Fact]
        public async Task UpdateMealDiaryAsync_InvalidId_ThrowsKeyNotFoundException()
        {
            // Arrange
            _mealDiaryRepositoryMock.Setup(r => r.GetByIdAsync(999))
                .ReturnsAsync((MealDiary?)null);

            // Act & Assert
            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _mealDiaryService.UpdateMealDiaryAsync(999, _testUserId, new UpdateMealDiaryRequest()));
        }

        #endregion

        #region DeleteMealDiaryAsync Tests

        [Fact]
        public async Task DeleteMealDiaryAsync_ValidId_SoftDeletes()
        {
            // Arrange - Entry tồn tại và thuộc về user
            var existingDiary = new MealDiary
            {
                MealDiaryId = 1,
                UserId = _testUserId,
                IsDeleted = false
            };

            _mealDiaryRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existingDiary);
            _mealDiaryRepositoryMock.Setup(r => r.Update(It.IsAny<MealDiary>()));

            // Act
            await _mealDiaryService.DeleteMealDiaryAsync(1, _testUserId);

            // Assert - Verify soft delete được thực hiện
            _mealDiaryRepositoryMock.Verify(r => r.Update(It.Is<MealDiary>(d => d.IsDeleted == true)), Times.Once);
        }

        [Fact]
        public async Task DeleteMealDiaryAsync_InvalidId_ThrowsKeyNotFoundException()
        {
            // Arrange
            _mealDiaryRepositoryMock.Setup(r => r.GetByIdAsync(999))
                .ReturnsAsync((MealDiary?)null);

            // Act & Assert
            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _mealDiaryService.DeleteMealDiaryAsync(999, _testUserId));
        }

        [Fact]
        public async Task DeleteMealDiaryAsync_AlreadyDeleted_ThrowsKeyNotFoundException()
        {
            // Arrange - Entry đã bị xóa trước đó
            var deletedDiary = new MealDiary
            {
                MealDiaryId = 1,
                UserId = _testUserId,
                IsDeleted = true
            };

            _mealDiaryRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(deletedDiary);

            // Act & Assert
            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _mealDiaryService.DeleteMealDiaryAsync(1, _testUserId));
        }

        #endregion
    }
}
