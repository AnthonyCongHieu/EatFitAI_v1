using AutoMapper;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.Food;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services
{
    public class UserFoodItemServiceTests : IDisposable
    {
        private readonly EatFitAIDbContext _context;

        public UserFoodItemServiceTests()
        {
            var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new EatFitAIDbContext(options);
        }

        [Fact]
        public async Task ListAsync_RewritesSupabaseStorageThumbnailUrls()
        {
            var userId = Guid.NewGuid();
            const string supabaseThumb =
                "https://bjlmndmafrajjysenpbm.supabase.co/storage/v1/object/public/user-food/v2/user-1/thumb/beef.webp";
            const string mediaThumb =
                "https://media.example.com/user-food/v2/user-1/thumb/beef.webp";

            var repo = new Mock<IUserFoodItemRepository>();
            repo.Setup(r => r.SearchByUserAsync(userId, null, 0, 20))
                .ReturnsAsync(new List<UserFoodItem>
                {
                    new UserFoodItem
                    {
                        UserFoodItemId = 7,
                        UserId = userId,
                        FoodName = "Beef test",
                        ThumbnailUrl = supabaseThumb,
                        UnitType = "g"
                    }
                });
            repo.Setup(r => r.CountByUserAsync(userId, null)).ReturnsAsync(1);

            var mapper = new Mock<IMapper>();
            mapper.Setup(m => m.Map<IEnumerable<UserFoodItemDto>>(It.IsAny<IEnumerable<UserFoodItem>>()))
                .Returns(new List<UserFoodItemDto>
                {
                    new UserFoodItemDto
                    {
                        UserFoodItemId = 7,
                        UserId = userId,
                        FoodName = "Beef test",
                        ThumbnailUrl = supabaseThumb,
                        UnitType = "g"
                    }
                });

            var mediaUrlResolver = new Mock<IMediaUrlResolver>();
            mediaUrlResolver.Setup(r => r.NormalizePublicUrl(supabaseThumb))
                .Returns(mediaThumb);

            var service = new UserFoodItemService(
                repo.Object,
                _context,
                mapper.Object,
                Mock.Of<IMediaImageProcessor>(),
                Mock.Of<IMediaStorageService>(),
                mediaUrlResolver.Object,
                Mock.Of<IWebHostEnvironment>(),
                Mock.Of<ILogger<UserFoodItemService>>());

            var (items, total) = await service.ListAsync(userId, null, 1, 20);
            var item = items.Single();

            Assert.Equal(1, total);
            Assert.Equal(mediaThumb, item.ThumbnailUrl);
            Assert.DoesNotContain("supabase.co", item.ThumbnailUrl, StringComparison.OrdinalIgnoreCase);
            Assert.NotNull(item.ImageVariants);
            Assert.Equal("https://media.example.com/user-food/v2/user-1/medium/beef.webp", item.ImageVariants!.MediumUrl);
        }

        public void Dispose()
        {
            _context.Dispose();
        }
    }
}
