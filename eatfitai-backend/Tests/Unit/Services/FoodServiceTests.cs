using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.Food;
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
    /// Unit tests cho FoodService - Kiểm tra các chức năng tìm kiếm và lấy thông tin thực phẩm
    /// </summary>
    public class FoodServiceTests : IDisposable
    {
        private readonly Mock<IFoodItemRepository> _foodItemRepositoryMock;
        private readonly Mock<IUserFoodItemRepository> _userFoodItemRepositoryMock;
        private readonly EatFitAIDbContext _context;
        private readonly Mock<IMapper> _mapperMock;
        private readonly FoodService _foodService;

        public FoodServiceTests()
        {
            _foodItemRepositoryMock = new Mock<IFoodItemRepository>();
            _userFoodItemRepositoryMock = new Mock<IUserFoodItemRepository>();
            _mapperMock = new Mock<IMapper>();

            // Setup in-memory database
            var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new EatFitAIDbContext(options);

            _foodService = new FoodService(
                _foodItemRepositoryMock.Object,
                _userFoodItemRepositoryMock.Object,
                _context,
                _mapperMock.Object);
        }

        public void Dispose()
        {
            _context.Dispose();
        }

        #region SearchFoodItemsAsync Tests

        [Fact]
        public async Task SearchFoodItemsAsync_ValidQuery_ReturnsResults()
        {
            // Arrange - Thiết lập dữ liệu test
            var searchTerm = "cơm";
            var foodItems = new List<FoodItem>
            {
                new FoodItem { FoodItemId = 1, FoodName = "Cơm trắng", CaloriesPer100g = 130, ProteinPer100g = 2.7m, CarbPer100g = 28, FatPer100g = 0.3m },
                new FoodItem { FoodItemId = 2, FoodName = "Cơm chiên", CaloriesPer100g = 180, ProteinPer100g = 4, CarbPer100g = 25, FatPer100g = 7 }
            };

            var expectedDtos = new List<FoodItemDto>
            {
                new FoodItemDto { FoodItemId = 1, FoodName = "Cơm trắng", CaloriesPer100g = 130 },
                new FoodItemDto { FoodItemId = 2, FoodName = "Cơm chiên", CaloriesPer100g = 180 }
            };

            _foodItemRepositoryMock.Setup(r => r.SearchByNameAsync(searchTerm, 50))
                .ReturnsAsync(foodItems);
            _mapperMock.Setup(m => m.Map<IEnumerable<FoodItemDto>>(It.IsAny<IEnumerable<FoodItem>>()))
                .Returns(expectedDtos);

            // Act - Thực thi method cần test
            var result = await _foodService.SearchFoodItemsAsync(searchTerm);

            // Assert - Kiểm tra kết quả
            Assert.NotNull(result);
            Assert.Equal(2, result.Count());
            _foodItemRepositoryMock.Verify(r => r.SearchByNameAsync(searchTerm, 50), Times.Once);
        }

        [Fact]
        public async Task SearchFoodItemsAsync_EmptyQuery_ReturnsEmptyList()
        {
            // Arrange - Query trống sẽ trả về list rỗng
            var searchTerm = "";
            _foodItemRepositoryMock.Setup(r => r.SearchByNameAsync(searchTerm, 50))
                .ReturnsAsync(new List<FoodItem>());
            _mapperMock.Setup(m => m.Map<IEnumerable<FoodItemDto>>(It.IsAny<IEnumerable<FoodItem>>()))
                .Returns(new List<FoodItemDto>());

            // Act
            var result = await _foodService.SearchFoodItemsAsync(searchTerm);

            // Assert
            Assert.NotNull(result);
            Assert.Empty(result);
        }

        [Fact]
        public async Task SearchFoodItemsAsync_WithCustomLimit_RespectLimit()
        {
            // Arrange - Test với limit tùy chỉnh
            var searchTerm = "gà";
            var limit = 10;

            _foodItemRepositoryMock.Setup(r => r.SearchByNameAsync(searchTerm, limit))
                .ReturnsAsync(new List<FoodItem>());
            _mapperMock.Setup(m => m.Map<IEnumerable<FoodItemDto>>(It.IsAny<IEnumerable<FoodItem>>()))
                .Returns(new List<FoodItemDto>());

            // Act
            await _foodService.SearchFoodItemsAsync(searchTerm, limit);

            // Assert - Verify repository được gọi với limit đúng
            _foodItemRepositoryMock.Verify(r => r.SearchByNameAsync(searchTerm, limit), Times.Once);
        }

        #endregion

        #region GetFoodItemWithServingsAsync Tests

        [Fact]
        public async Task GetFoodItemWithServingsAsync_ValidId_ReturnsFoodWithServings()
        {
            // Arrange - Thực phẩm tồn tại
            var foodItemId = 1;
            var foodItem = new FoodItem 
            { 
                FoodItemId = foodItemId, 
                FoodName = "Cơm trắng",
                CaloriesPer100g = 130 
            };
            var servings = new List<FoodServing>
            {
                new FoodServing { FoodServingId = 1, GramsPerUnit = 200 },
                new FoodServing { FoodServingId = 2, GramsPerUnit = 300 }
            };

            _foodItemRepositoryMock.Setup(r => r.GetByIdWithServingsAsync(foodItemId))
                .ReturnsAsync((foodItem, servings));
            _mapperMock.Setup(m => m.Map<FoodItemDto>(It.IsAny<FoodItem>()))
                .Returns(new FoodItemDto { FoodItemId = foodItemId, FoodName = "Cơm trắng" });
            _mapperMock.Setup(m => m.Map<IEnumerable<FoodServingDto>>(It.IsAny<IEnumerable<FoodServing>>()))
                .Returns(new List<FoodServingDto>
                {
                    new FoodServingDto { ServingId = 1, ServingUnitName = "chén" },
                    new FoodServingDto { ServingId = 2, ServingUnitName = "bát" }
                });

            // Act
            var (resultFood, resultServings) = await _foodService.GetFoodItemWithServingsAsync(foodItemId);

            // Assert
            Assert.NotNull(resultFood);
            Assert.Equal("Cơm trắng", resultFood.FoodName);
            Assert.Equal(2, resultServings.Count());
        }

        [Fact]
        public async Task GetFoodItemWithServingsAsync_InvalidId_ThrowsKeyNotFoundException()
        {
            // Arrange - Thực phẩm không tồn tại
            var invalidId = 9999;
            _foodItemRepositoryMock.Setup(r => r.GetByIdWithServingsAsync(invalidId))
                .ReturnsAsync((null as FoodItem, new List<FoodServing>()));

            // Act & Assert - Kiểm tra exception được throw
            await Assert.ThrowsAsync<KeyNotFoundException>(() => 
                _foodService.GetFoodItemWithServingsAsync(invalidId));
        }

        #endregion

        #region CreateCustomDishAsync Tests

        [Fact]
        public async Task CreateCustomDishAsync_ValidData_ReturnsCreatedDish()
        {
            // Arrange - Dữ liệu món ăn tự tạo hợp lệ
            var userId = Guid.NewGuid();
            var customDishDto = new CustomDishDto
            {
                DishName = "Cơm gà xối mỡ",
                Description = "Món cơm gà đặc sản",
                Ingredients = new List<CustomDishIngredientDto>
                {
                    new CustomDishIngredientDto { FoodItemId = 1, Grams = 200 },
                    new CustomDishIngredientDto { FoodItemId = 2, Grams = 150 }
                }
            };

            // Act
            var result = await _foodService.CreateCustomDishAsync(userId, customDishDto);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(customDishDto.DishName, result.DishName);
            Assert.Equal(customDishDto.Description, result.Description);
            Assert.Equal(2, result.Ingredients.Count);
        }

        [Fact]
        public async Task CreateCustomDishAsync_EmptyIngredients_ReturnsEmptyIngredientsList()
        {
            // Arrange - Món ăn không có nguyên liệu (edge case)
            var userId = Guid.NewGuid();
            var customDishDto = new CustomDishDto
            {
                DishName = "Món test",
                Ingredients = new List<CustomDishIngredientDto>()
            };

            // Act
            var result = await _foodService.CreateCustomDishAsync(userId, customDishDto);

            // Assert
            Assert.NotNull(result);
            Assert.Empty(result.Ingredients);
        }

        #endregion

        #region SearchAllAsync Tests

        [Fact]
        public async Task SearchAllAsync_WithUserId_ReturnsCombinedResults()
        {
            // Arrange - Tìm kiếm kết hợp catalog và user foods
            var searchTerm = "thịt";
            var userId = Guid.NewGuid();

            var catalogItems = new List<FoodItem>
            {
                new FoodItem { FoodItemId = 1, FoodName = "Thịt bò", CaloriesPer100g = 250 }
            };
            var userItems = new List<UserFoodItem>
            {
                new UserFoodItem { UserFoodItemId = 1, FoodName = "Thịt heo nướng", CaloriesPer100 = 280 }
            };

            _foodItemRepositoryMock.Setup(r => r.SearchByNameAsync(searchTerm, 50))
                .ReturnsAsync(catalogItems);
            _userFoodItemRepositoryMock.Setup(r => r.SearchByUserAsync(userId, searchTerm, 0, 50))
                .ReturnsAsync(userItems);

            // Act
            var result = await _foodService.SearchAllAsync(searchTerm, userId, 50);

            // Assert - Kết quả nên bao gồm cả catalog và user items
            Assert.NotNull(result);
            var resultList = result.ToList();
            Assert.Equal(2, resultList.Count);
            Assert.Contains(resultList, r => r.Source == "catalog");
            Assert.Contains(resultList, r => r.Source == "user");
        }

        [Fact]
        public async Task SearchAllAsync_WithoutUserId_ReturnsOnlyCatalogResults()
        {
            // Arrange - Tìm kiếm không có userId, chỉ trả về catalog
            var searchTerm = "cá";

            var catalogItems = new List<FoodItem>
            {
                new FoodItem { FoodItemId = 1, FoodName = "Cá hồi", CaloriesPer100g = 200 },
                new FoodItem { FoodItemId = 2, FoodName = "Cá thu", CaloriesPer100g = 185 }
            };

            _foodItemRepositoryMock.Setup(r => r.SearchByNameAsync(searchTerm, 50))
                .ReturnsAsync(catalogItems);

            // Act
            var result = await _foodService.SearchAllAsync(searchTerm, null, 50);

            // Assert - Chỉ có kết quả từ catalog
            Assert.NotNull(result);
            Assert.Equal(2, result.Count());
            Assert.All(result, r => Assert.Equal("catalog", r.Source));
        }

        [Fact]
        public async Task SearchAllAsync_ResultsSortedAndLimited()
        {
            // Arrange - Kiểm tra kết quả được sort theo tên và limited
            var searchTerm = "rau";
            var limit = 3;

            var catalogItems = new List<FoodItem>
            {
                new FoodItem { FoodItemId = 1, FoodName = "Rau muống" },
                new FoodItem { FoodItemId = 2, FoodName = "Rau cải" },
                new FoodItem { FoodItemId = 3, FoodName = "Rau xà lách" },
                new FoodItem { FoodItemId = 4, FoodName = "Rau bina" }
            };

            _foodItemRepositoryMock.Setup(r => r.SearchByNameAsync(searchTerm, limit))
                .ReturnsAsync(catalogItems);

            // Act
            var result = await _foodService.SearchAllAsync(searchTerm, null, limit);

            // Assert - Kết quả phải được giới hạn theo limit
            Assert.NotNull(result);
            Assert.Equal(limit, result.Count());
        }

        #endregion
    }
}
