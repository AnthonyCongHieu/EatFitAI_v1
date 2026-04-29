using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services
{
    public class CustomDishServiceTests : IDisposable
    {
        private readonly EatFitAIDbContext _context;

        public CustomDishServiceTests()
        {
            var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new EatFitAIDbContext(options);
        }

        [Fact]
        public async Task GetCustomDishAsync_RewritesIngredientSupabaseThumbnailUrl()
        {
            var userId = Guid.NewGuid();
            const string supabaseThumb =
                "https://bjlmndmafrajjysenpbm.supabase.co/storage/v1/object/public/food-images/v2/thumb/beef.webp";
            const string mediaThumb =
                "https://media.example.com/food-images/v2/thumb/beef.webp";

            _context.FoodItems.Add(new FoodItem
            {
                FoodItemId = 11,
                FoodName = "Beef",
                CaloriesPer100g = 187,
                ProteinPer100g = 20,
                CarbPer100g = 0,
                FatPer100g = 12,
                ThumbNail = supabaseThumb,
                IsActive = true,
                IsDeleted = false
            });
            _context.UserDishes.Add(new UserDish
            {
                UserDishId = 5,
                UserId = userId,
                DishName = "Dinner",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsDeleted = false
            });
            _context.UserDishIngredients.Add(new UserDishIngredient
            {
                UserDishIngredientId = 9,
                UserDishId = 5,
                FoodItemId = 11,
                Grams = 100
            });
            await _context.SaveChangesAsync();

            var mediaUrlResolver = new Mock<IMediaUrlResolver>();
            mediaUrlResolver.Setup(r => r.NormalizePublicUrl(supabaseThumb))
                .Returns(mediaThumb);

            var service = new CustomDishService(
                _context,
                Mock.Of<IMealDiaryService>(),
                mediaUrlResolver.Object);

            var result = await service.GetCustomDishAsync(userId, 5);
            var ingredient = Assert.Single(result.Ingredients);

            Assert.Equal(mediaThumb, ingredient.ThumbnailUrl);
            Assert.DoesNotContain("supabase.co", ingredient.ThumbnailUrl, StringComparison.OrdinalIgnoreCase);
        }

        public void Dispose()
        {
            _context.Dispose();
        }
    }
}
