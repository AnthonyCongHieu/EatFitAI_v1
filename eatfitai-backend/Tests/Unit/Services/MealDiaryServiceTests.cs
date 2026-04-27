using AutoMapper;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.MealDiary;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services
{
    public class MealDiaryServiceTests : IDisposable
    {
        private readonly Mock<IMealDiaryRepository> _mealDiaryRepositoryMock;
        private readonly EatFitAIDbContext _context;
        private readonly Mock<IMapper> _mapperMock;
        private readonly Mock<IStreakService> _streakServiceMock;
        private readonly Mock<IMediaUrlResolver> _mediaUrlResolverMock;
        private readonly MealDiaryService _mealDiaryService;
        private readonly Guid _testUserId = Guid.NewGuid();

        public MealDiaryServiceTests()
        {
            _mealDiaryRepositoryMock = new Mock<IMealDiaryRepository>();
            _mapperMock = new Mock<IMapper>();
            _streakServiceMock = new Mock<IStreakService>();
            _mediaUrlResolverMock = new Mock<IMediaUrlResolver>();
            _mediaUrlResolverMock
                .Setup(r => r.NormalizePublicUrl(It.IsAny<string?>()))
                .Returns((string? url) => url);

            var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            _context = new EatFitAIDbContext(options);

            _mealDiaryService = new MealDiaryService(
                _mealDiaryRepositoryMock.Object,
                _context,
                _mapperMock.Object,
                _streakServiceMock.Object,
                _mediaUrlResolverMock.Object);

            SeedTestData();
        }

        private void SeedTestData()
        {
            _context.FoodItems.AddRange(
                new FoodItem
                {
                    FoodItemId = 1,
                    FoodName = "Com trang",
                    CaloriesPer100g = 130,
                    ProteinPer100g = 2.7m,
                    CarbPer100g = 28,
                    FatPer100g = 0.3m,
                    IsActive = true,
                    IsDeleted = false
                },
                new FoodItem
                {
                    FoodItemId = 2,
                    FoodName = "Thit ga",
                    CaloriesPer100g = 165,
                    ProteinPer100g = 31,
                    CarbPer100g = 0,
                    FatPer100g = 3.6m,
                    IsActive = true,
                    IsDeleted = false
                }
            );

            _context.UserFoodItems.Add(new UserFoodItem
            {
                UserFoodItemId = 1,
                UserId = _testUserId,
                FoodName = "Pho bo tu lam",
                UnitType = "g",
                CaloriesPer100 = 420,
                ProteinPer100 = 25,
                CarbPer100 = 55,
                FatPer100 = 10,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsDeleted = false
            });

            _context.UserFoodItems.Add(new UserFoodItem
            {
                UserFoodItemId = 2,
                UserId = Guid.NewGuid(),
                FoodName = "Banh mi ca",
                UnitType = "g",
                CaloriesPer100 = 250,
                ProteinPer100 = 12,
                CarbPer100 = 30,
                FatPer100 = 8,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsDeleted = false
            });

            _context.UserDishes.Add(new UserDish
            {
                UserDishId = 1,
                UserId = _testUserId,
                DishName = "Com ga",
                Description = "Mon tu tao",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsDeleted = false,
                UserDishIngredients =
                {
                    new UserDishIngredient
                    {
                        UserDishIngredientId = 1,
                        FoodItemId = 1,
                        Grams = 100
                    },
                    new UserDishIngredient
                    {
                        UserDishIngredientId = 2,
                        FoodItemId = 2,
                        Grams = 50
                    }
                }
            });

            _context.SaveChanges();
        }

        public void Dispose()
        {
            _context.Dispose();
        }

        [Fact]
        public async Task GetUserMealDiariesAsync_ValidUserId_ReturnsDiaries()
        {
            var mealDiaries = new List<MealDiary>
            {
                new MealDiary { MealDiaryId = 1, UserId = _testUserId, FoodItemId = 1, Grams = 200, Calories = 260 },
                new MealDiary { MealDiaryId = 2, UserId = _testUserId, FoodItemId = 2, Grams = 150, Calories = 247 }
            };

            var expectedDtos = new List<MealDiaryDto>
            {
                new MealDiaryDto { MealDiaryId = 1, FoodItemName = "Com trang", Grams = 200, Calories = 260 },
                new MealDiaryDto { MealDiaryId = 2, FoodItemName = "Thit ga", Grams = 150, Calories = 247 }
            };

            _mealDiaryRepositoryMock.Setup(r => r.GetByUserIdAsync(_testUserId, null))
                .ReturnsAsync(mealDiaries);
            _mapperMock.Setup(m => m.Map<List<MealDiaryDto>>(It.IsAny<IEnumerable<MealDiary>>()))
                .Returns(expectedDtos);

            var result = await _mealDiaryService.GetUserMealDiariesAsync(_testUserId);

            Assert.NotNull(result);
            Assert.Equal(2, result.Count());
        }

        [Fact]
        public async Task GetUserMealDiariesAsync_WithDateFilter_ReturnsFilteredResults()
        {
            var filterDate = new DateTime(2024, 1, 15);
            var mealDiaries = new List<MealDiary>
            {
                new MealDiary { MealDiaryId = 1, UserId = _testUserId, EatenDate = DateOnly.FromDateTime(filterDate) }
            };

            _mealDiaryRepositoryMock.Setup(r => r.GetByUserIdAsync(_testUserId, filterDate))
                .ReturnsAsync(mealDiaries);
            _mapperMock.Setup(m => m.Map<List<MealDiaryDto>>(It.IsAny<IEnumerable<MealDiary>>()))
                .Returns(new List<MealDiaryDto> { new MealDiaryDto { MealDiaryId = 1 } });

            var result = await _mealDiaryService.GetUserMealDiariesAsync(_testUserId, filterDate);

            Assert.Single(result);
            _mealDiaryRepositoryMock.Verify(r => r.GetByUserIdAsync(_testUserId, filterDate), Times.Once);
        }

        [Fact]
        public async Task GetUserMealDiariesAsync_RewritesUserFoodThumbnailUrl()
        {
            const string supabaseThumb =
                "https://bjlmndmafrajjysenpbm.supabase.co/storage/v1/object/public/user-food/v2/user-1/thumb/beef.webp";
            const string mediaThumb =
                "https://media.example.com/user-food/v2/user-1/thumb/beef.webp";

            var userFood = await _context.UserFoodItems.SingleAsync(item => item.UserFoodItemId == 1);
            userFood.ThumbnailUrl = supabaseThumb;
            await _context.SaveChangesAsync();

            var mealDiaries = new List<MealDiary>
            {
                new MealDiary
                {
                    MealDiaryId = 12,
                    UserId = _testUserId,
                    UserFoodItemId = 1,
                    Grams = 100,
                    Calories = 420
                }
            };

            _mealDiaryRepositoryMock.Setup(r => r.GetByUserIdAsync(_testUserId, null))
                .ReturnsAsync(mealDiaries);
            _mapperMock.Setup(m => m.Map<List<MealDiaryDto>>(It.IsAny<IEnumerable<MealDiary>>()))
                .Returns(new List<MealDiaryDto>
                {
                    new MealDiaryDto
                    {
                        MealDiaryId = 12,
                        UserId = _testUserId
                    }
                });
            _mediaUrlResolverMock.Setup(r => r.NormalizePublicUrl(supabaseThumb))
                .Returns(mediaThumb);

            var result = (await _mealDiaryService.GetUserMealDiariesAsync(_testUserId)).Single();

            Assert.Equal("Pho bo tu lam", result.FoodItemName);
            Assert.Equal(mediaThumb, result.FoodItemThumbNail);
            Assert.DoesNotContain("supabase.co", result.FoodItemThumbNail, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task GetMealDiaryByIdAsync_ValidId_ReturnsDiary()
        {
            var mealDiary = new MealDiary
            {
                MealDiaryId = 1,
                UserId = _testUserId,
                FoodItemId = 1,
                Grams = 200,
                Calories = 260,
                IsDeleted = false
            };

            _mealDiaryRepositoryMock.Setup(r => r.GetByIdWithIncludesAsync(1)).ReturnsAsync(mealDiary);
            _mapperMock.Setup(m => m.Map<MealDiaryDto>(It.IsAny<MealDiary>()))
                .Returns(new MealDiaryDto { MealDiaryId = 1, Grams = 200, Calories = 260 });

            var result = await _mealDiaryService.GetMealDiaryByIdAsync(1, _testUserId);

            Assert.NotNull(result);
            Assert.Equal(200, result.Grams);
        }

        [Fact]
        public async Task GetMealDiaryByIdAsync_NotFound_ThrowsKeyNotFoundException()
        {
            _mealDiaryRepositoryMock.Setup(r => r.GetByIdWithIncludesAsync(999))
                .ReturnsAsync((MealDiary?)null);

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _mealDiaryService.GetMealDiaryByIdAsync(999, _testUserId));
        }

        [Fact]
        public async Task GetMealDiaryByIdAsync_WrongUser_ThrowsKeyNotFoundException()
        {
            var mealDiary = new MealDiary
            {
                MealDiaryId = 1,
                UserId = Guid.NewGuid(),
                IsDeleted = false
            };

            _mealDiaryRepositoryMock.Setup(r => r.GetByIdWithIncludesAsync(1)).ReturnsAsync(mealDiary);

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _mealDiaryService.GetMealDiaryByIdAsync(1, _testUserId));
        }

        [Fact]
        public async Task GetMealDiaryByIdAsync_DeletedEntry_ThrowsKeyNotFoundException()
        {
            var mealDiary = new MealDiary
            {
                MealDiaryId = 1,
                UserId = _testUserId,
                IsDeleted = true
            };

            _mealDiaryRepositoryMock.Setup(r => r.GetByIdWithIncludesAsync(1)).ReturnsAsync(mealDiary);

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _mealDiaryService.GetMealDiaryByIdAsync(1, _testUserId));
        }

        [Fact]
        public async Task CreateMealDiaryAsync_WithFoodItem_CreatesDiaryWithMacros()
        {
            var request = new CreateMealDiaryRequest
            {
                EatenDate = DateTime.Today,
                MealTypeId = 2,
                FoodItemId = 1,
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
            _mealDiaryRepositoryMock.Setup(r => r.AddAsync(It.IsAny<MealDiary>())).Returns(Task.CompletedTask);
            _mealDiaryRepositoryMock.Setup(r => r.GetByIdWithIncludesAsync(It.IsAny<int>())).ReturnsAsync(mappedDiary);
            _mapperMock.Setup(m => m.Map<MealDiaryDto>(It.IsAny<MealDiary>()))
                .Returns(new MealDiaryDto { MealDiaryId = 1, Calories = 260 });

            var result = await _mealDiaryService.CreateMealDiaryAsync(_testUserId, request);

            Assert.NotNull(result);
            _mealDiaryRepositoryMock.Verify(r => r.AddAsync(It.IsAny<MealDiary>()), Times.Once);
        }

        [Fact]
        public async Task CreateMealDiaryAsync_WithUserFoodItem_CreatesDiaryWithUserMacros()
        {
            var request = new CreateMealDiaryRequest
            {
                EatenDate = DateTime.Today,
                MealTypeId = 1,
                UserFoodItemId = 1,
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
            _mealDiaryRepositoryMock.Setup(r => r.AddAsync(It.IsAny<MealDiary>())).Returns(Task.CompletedTask);
            _mealDiaryRepositoryMock.Setup(r => r.GetByIdWithIncludesAsync(It.IsAny<int>())).ReturnsAsync(mappedDiary);
            _mapperMock.Setup(m => m.Map<MealDiaryDto>(It.IsAny<MealDiary>()))
                .Returns(new MealDiaryDto { MealDiaryId = 1, Calories = 1470 });

            var result = await _mealDiaryService.CreateMealDiaryAsync(_testUserId, request);

            Assert.NotNull(result);
        }

        [Fact]
        public async Task CreateMealDiaryAsync_WithUserDish_CreatesDiaryWithDishMacros()
        {
            var request = new CreateMealDiaryRequest
            {
                EatenDate = DateTime.Today,
                MealTypeId = 1,
                UserDishId = 1,
                Grams = 150
            };

            var mappedDiary = new MealDiary
            {
                UserId = _testUserId,
                EatenDate = DateOnly.FromDateTime(request.EatenDate),
                MealTypeId = 1,
                UserDishId = 1,
                Grams = 150
            };

            _mapperMock.Setup(m => m.Map<MealDiary>(request)).Returns(mappedDiary);
            _mealDiaryRepositoryMock.Setup(r => r.AddAsync(It.IsAny<MealDiary>())).Returns(Task.CompletedTask);
            _mealDiaryRepositoryMock.Setup(r => r.GetByIdWithIncludesAsync(It.IsAny<int>())).ReturnsAsync(mappedDiary);
            _mapperMock.Setup(m => m.Map<MealDiaryDto>(It.IsAny<MealDiary>()))
                .Returns(new MealDiaryDto { MealDiaryId = 1, Calories = 0 });

            var result = await _mealDiaryService.CreateMealDiaryAsync(_testUserId, request);

            Assert.NotNull(result);
            _mealDiaryRepositoryMock.Verify(r => r.AddAsync(It.IsAny<MealDiary>()), Times.Once);
        }

        [Fact]
        public async Task CreateMealDiaryAsync_WithMultipleSources_ThrowsArgumentException()
        {
            var request = new CreateMealDiaryRequest
            {
                EatenDate = DateTime.Today,
                MealTypeId = 1,
                FoodItemId = 1,
                UserFoodItemId = 1,
                Grams = 100
            };

            var mappedDiary = new MealDiary
            {
                UserId = _testUserId,
                EatenDate = DateOnly.FromDateTime(request.EatenDate),
                MealTypeId = 1,
                FoodItemId = 1,
                UserFoodItemId = 1,
                Grams = 100
            };

            _mapperMock.Setup(m => m.Map<MealDiary>(request)).Returns(mappedDiary);

            await Assert.ThrowsAsync<ArgumentException>(() =>
                _mealDiaryService.CreateMealDiaryAsync(_testUserId, request));
        }

        [Fact]
        public async Task CreateMealDiaryAsync_WithForeignUserFoodItem_ThrowsKeyNotFoundException()
        {
            var request = new CreateMealDiaryRequest
            {
                EatenDate = DateTime.Today,
                MealTypeId = 1,
                UserFoodItemId = 2,
                Grams = 100
            };

            var mappedDiary = new MealDiary
            {
                UserId = _testUserId,
                EatenDate = DateOnly.FromDateTime(request.EatenDate),
                MealTypeId = 1,
                UserFoodItemId = 2,
                Grams = 100
            };

            _mapperMock.Setup(m => m.Map<MealDiary>(request)).Returns(mappedDiary);

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _mealDiaryService.CreateMealDiaryAsync(_testUserId, request));
        }

        [Fact]
        public async Task UpdateMealDiaryAsync_ValidRequest_UpdatesDiary()
        {
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
                Grams = 300,
                Note = "An them mot chut"
            };

            _mealDiaryRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existingDiary);
            _mealDiaryRepositoryMock.Setup(r => r.GetByIdWithIncludesAsync(1)).ReturnsAsync(existingDiary);
            _mapperMock.Setup(m => m.Map<MealDiaryDto>(It.IsAny<MealDiary>()))
                .Returns(new MealDiaryDto { MealDiaryId = 1, Grams = 300, Note = "An them mot chut" });

            var result = await _mealDiaryService.UpdateMealDiaryAsync(1, _testUserId, updateRequest);

            Assert.NotNull(result);
            Assert.Equal(300, result.Grams);
            Assert.Equal("An them mot chut", result.Note);
            _mealDiaryRepositoryMock.Verify(r => r.Update(It.IsAny<MealDiary>()), Times.Never);
        }

        [Fact]
        public async Task UpdateMealDiaryAsync_SourceChangeClearsPreviousSourceIds()
        {
            var existingDiary = new MealDiary
            {
                MealDiaryId = 1,
                UserId = _testUserId,
                FoodItemId = 1,
                UserFoodItemId = null,
                UserDishId = null,
                RecipeId = null,
                Grams = 200,
                Calories = 260,
                Protein = 5.4m,
                Carb = 56,
                Fat = 0.6m,
                IsDeleted = false
            };

            var updateRequest = new UpdateMealDiaryRequest
            {
                UserFoodItemId = 1,
                Grams = 350
            };

            _mealDiaryRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existingDiary);
            _mealDiaryRepositoryMock.Setup(r => r.GetByIdWithIncludesAsync(1)).ReturnsAsync(existingDiary);
            _mapperMock.Setup(m => m.Map<MealDiaryDto>(It.IsAny<MealDiary>()))
                .Returns(new MealDiaryDto { MealDiaryId = 1, Grams = 350 });

            var result = await _mealDiaryService.UpdateMealDiaryAsync(1, _testUserId, updateRequest);

            Assert.NotNull(result);
            Assert.Null(existingDiary.FoodItemId);
            Assert.Equal(1, existingDiary.UserFoodItemId);
            Assert.Null(existingDiary.UserDishId);
            Assert.Null(existingDiary.RecipeId);
            _mealDiaryRepositoryMock.Verify(r => r.Update(It.IsAny<MealDiary>()), Times.Never);
        }

        [Fact]
        public async Task UpdateMealDiaryAsync_InvalidId_ThrowsKeyNotFoundException()
        {
            _mealDiaryRepositoryMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((MealDiary?)null);

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _mealDiaryService.UpdateMealDiaryAsync(999, _testUserId, new UpdateMealDiaryRequest()));
        }

        [Fact]
        public async Task DeleteMealDiaryAsync_ValidId_SoftDeletes()
        {
            var existingDiary = new MealDiary
            {
                MealDiaryId = 1,
                UserId = _testUserId,
                UpdatedAt = DateTime.UtcNow.AddDays(-1),
                IsDeleted = false
            };

            _mealDiaryRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existingDiary);
            _mealDiaryRepositoryMock.Setup(r => r.Update(It.IsAny<MealDiary>()));

            await _mealDiaryService.DeleteMealDiaryAsync(1, _testUserId);

            _mealDiaryRepositoryMock.Verify(
                r => r.Update(It.Is<MealDiary>(d => d.IsDeleted && d.UpdatedAt > DateTime.UtcNow.AddMinutes(-1))),
                Times.Once);
        }

        [Fact]
        public async Task DeleteMealDiaryAsync_InvalidId_ThrowsKeyNotFoundException()
        {
            _mealDiaryRepositoryMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((MealDiary?)null);

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _mealDiaryService.DeleteMealDiaryAsync(999, _testUserId));
        }

        [Fact]
        public async Task DeleteMealDiaryAsync_AlreadyDeleted_ThrowsKeyNotFoundException()
        {
            var deletedDiary = new MealDiary
            {
                MealDiaryId = 1,
                UserId = _testUserId,
                IsDeleted = true
            };

            _mealDiaryRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(deletedDiary);

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _mealDiaryService.DeleteMealDiaryAsync(1, _testUserId));
        }
    }
}
