using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services
{
    public class AiFoodMapServiceTests : IDisposable
    {
        private readonly EatFitAIDbContext _context;
        private readonly Mock<IMediaUrlResolver> _mediaUrlResolver;

        public AiFoodMapServiceTests()
        {
            var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new EatFitAIDbContext(options);
            _mediaUrlResolver = new Mock<IMediaUrlResolver>();
            _mediaUrlResolver
                .Setup(r => r.NormalizePublicUrl(It.IsAny<string?>()))
                .Returns((string? url) => url);
        }

        [Fact]
        public async Task MapDetectionsAsync_ResolvesCatalogNameWhenLabelMapIsMissing()
        {
            _context.FoodItems.Add(new FoodItem
            {
                FoodItemId = 101,
                FoodName = "Thịt bò nạc (sống)",
                FoodNameUnsigned = "thit bo nac song",
                CaloriesPer100g = 187,
                ProteinPer100g = 20,
                CarbPer100g = 0,
                FatPer100g = 12,
                IsActive = true,
                IsDeleted = false,
                CredibilityScore = 95
            });
            await _context.SaveChangesAsync();

            var service = new AiFoodMapService(_context, _mediaUrlResolver.Object);

            var mapped = await service.MapDetectionsAsync(new[]
            {
                new VisionDetectionDto { Label = "Thịt bò", Confidence = 0.89f }
            });

            var item = Assert.Single(mapped);
            Assert.Equal(101, item.FoodItemId);
            Assert.Equal("Thịt bò nạc (sống)", item.FoodName);
            Assert.Equal(187, item.CaloriesPer100g);
            Assert.True(item.IsMatched);
        }

        [Fact]
        public async Task MapDetectionsAsync_DoesNotMatchCatalogItemWithEmptyNutrition()
        {
            _context.FoodItems.Add(new FoodItem
            {
                FoodItemId = 303,
                FoodName = "Thịt bò",
                FoodNameUnsigned = "thit bo",
                CaloriesPer100g = 0,
                ProteinPer100g = 0,
                CarbPer100g = 0,
                FatPer100g = 0,
                IsActive = true,
                IsDeleted = false,
                CredibilityScore = 95
            });
            await _context.SaveChangesAsync();

            var service = new AiFoodMapService(_context, _mediaUrlResolver.Object);

            var mapped = await service.MapDetectionsAsync(new[]
            {
                new VisionDetectionDto { Label = "Thịt bò", Confidence = 0.89f }
            });

            var item = Assert.Single(mapped);
            Assert.Null(item.FoodItemId);
            Assert.Null(item.CaloriesPer100g);
            Assert.False(item.IsMatched);
        }

        [Fact]
        public async Task MapDetectionsAsync_DoesNotResolveCatalogNameBelowConfidenceThreshold()
        {
            _context.FoodItems.Add(new FoodItem
            {
                FoodItemId = 404,
                FoodName = "Beef",
                FoodNameUnsigned = "beef",
                CaloriesPer100g = 187,
                ProteinPer100g = 20,
                CarbPer100g = 0,
                FatPer100g = 12,
                IsActive = true,
                IsDeleted = false,
                CredibilityScore = 95
            });
            await _context.SaveChangesAsync();

            var service = new AiFoodMapService(_context, _mediaUrlResolver.Object);

            var mapped = await service.MapDetectionsAsync(new[]
            {
                new VisionDetectionDto { Label = "beef", Confidence = 0.30f }
            });

            var item = Assert.Single(mapped);
            Assert.Null(item.FoodItemId);
            Assert.False(item.IsMatched);
        }

        [Fact]
        public async Task MapDetectionsAsync_ResolvesEnglishChickenAlias()
        {
            _context.FoodItems.Add(new FoodItem
            {
                FoodItemId = 202,
                FoodName = "Thịt gà",
                FoodNameUnsigned = "thit ga",
                CaloriesPer100g = 165,
                ProteinPer100g = 31,
                CarbPer100g = 0,
                FatPer100g = 3.6m,
                IsActive = true,
                IsDeleted = false,
                CredibilityScore = 95
            });
            await _context.SaveChangesAsync();

            var service = new AiFoodMapService(_context, _mediaUrlResolver.Object);

            var mapped = await service.MapDetectionsAsync(new[]
            {
                new VisionDetectionDto { Label = "chicken", Confidence = 0.91f }
            });

            var item = Assert.Single(mapped);
            Assert.Equal(202, item.FoodItemId);
            Assert.Equal("Thịt gà", item.FoodName);
            Assert.Equal(165, item.CaloriesPer100g);
            Assert.True(item.IsMatched);
        }

        [Fact]
        public async Task MapDetectionsAsync_AllowsSeededYoloRecoveryLabelBelowCatalogThreshold()
        {
            _context.FoodItems.Add(new FoodItem
            {
                FoodItemId = 505,
                FoodName = "Beef",
                FoodNameUnsigned = "beef",
                CaloriesPer100g = 187,
                ProteinPer100g = 20,
                CarbPer100g = 0,
                FatPer100g = 12,
                IsActive = true,
                IsDeleted = false,
                CredibilityScore = 95
            });
            _context.AiLabelMaps.Add(new AiLabelMap
            {
                Label = "beef",
                FoodItemId = 505,
                MinConfidence = 0.05m,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var service = new AiFoodMapService(_context, _mediaUrlResolver.Object);

            var mapped = await service.MapDetectionsAsync(new[]
            {
                new VisionDetectionDto { Label = "beef", Confidence = 0.08f }
            });

            var item = Assert.Single(mapped);
            Assert.Equal(505, item.FoodItemId);
            Assert.Equal("Beef", item.FoodName);
            Assert.True(item.IsMatched);
        }

        public void Dispose()
        {
            _context.Dispose();
        }
    }
}
