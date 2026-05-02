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

        [Fact]
        public async Task MapDetectionsAsync_PreservesBoundingBoxForMatchedAndUnmatchedItems()
        {
            _context.FoodItems.Add(new FoodItem
            {
                FoodItemId = 606,
                FoodName = "Banana",
                FoodNameUnsigned = "banana",
                CaloriesPer100g = 89,
                ProteinPer100g = 1.1m,
                CarbPer100g = 22.8m,
                FatPer100g = 0.3m,
                IsActive = true,
                IsDeleted = false,
                CredibilityScore = 95
            });
            _context.AiLabelMaps.Add(new AiLabelMap
            {
                Label = "banana",
                FoodItemId = 606,
                MinConfidence = 0.60m,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var service = new AiFoodMapService(_context, _mediaUrlResolver.Object);

            var mapped = await service.MapDetectionsAsync(new[]
            {
                new VisionDetectionDto
                {
                    Label = "banana",
                    Confidence = 0.92f,
                    Bbox = new BoundingBoxDto { X = 10, Y = 20, Width = 30, Height = 40 }
                },
                new VisionDetectionDto
                {
                    Label = "unknown",
                    Confidence = 0.80f,
                    Bbox = new BoundingBoxDto { X = 1, Y = 2, Width = 3, Height = 4 }
                }
            });

            Assert.Collection(
                mapped,
                item =>
                {
                    Assert.Equal(606, item.FoodItemId);
                    Assert.NotNull(item.Bbox);
                    Assert.Equal(10, item.Bbox!.X);
                    Assert.Equal(20, item.Bbox.Y);
                    Assert.Equal(30, item.Bbox.Width);
                    Assert.Equal(40, item.Bbox.Height);
                },
                item =>
                {
                    Assert.Null(item.FoodItemId);
                    Assert.NotNull(item.Bbox);
                    Assert.Equal(1, item.Bbox!.X);
                    Assert.Equal(2, item.Bbox.Y);
                    Assert.Equal(3, item.Bbox.Width);
                    Assert.Equal(4, item.Bbox.Height);
                });
        }

        [Fact]
        public async Task MapDetectionsAsync_FillsDefaultServingFromPreferredNonGramServing()
        {
            _context.ServingUnits.AddRange(
                new ServingUnit { ServingUnitId = 1, Name = "gram", Symbol = "g" },
                new ServingUnit { ServingUnitId = 2, Name = "piece", Symbol = "pc" });
            _context.FoodItems.Add(new FoodItem
            {
                FoodItemId = 707,
                FoodName = "Egg",
                FoodNameUnsigned = "egg",
                CaloriesPer100g = 155,
                ProteinPer100g = 13,
                CarbPer100g = 1.1m,
                FatPer100g = 11,
                IsActive = true,
                IsDeleted = false,
                CredibilityScore = 95
            });
            _context.FoodServings.AddRange(
                new FoodServing { FoodServingId = 1, FoodItemId = 707, ServingUnitId = 1, GramsPerUnit = 1 },
                new FoodServing { FoodServingId = 2, FoodItemId = 707, ServingUnitId = 2, GramsPerUnit = 50 });
            _context.AiLabelMaps.Add(new AiLabelMap
            {
                Label = "egg",
                FoodItemId = 707,
                MinConfidence = 0.60m,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var service = new AiFoodMapService(_context, _mediaUrlResolver.Object);

            var mapped = await service.MapDetectionsAsync(new[]
            {
                new VisionDetectionDto { Label = "egg", Confidence = 0.95f }
            });

            var item = Assert.Single(mapped);
            Assert.Equal(2, item.DefaultServingUnitId);
            Assert.Equal("piece", item.DefaultServingUnitName);
            Assert.Equal("pc", item.DefaultServingUnitSymbol);
            Assert.Equal(1, item.DefaultPortionQuantity);
            Assert.Equal(50, item.DefaultGrams);
        }

        [Fact]
        public async Task MapDetectionsAsync_FallsBackToDefaultGramsWhenOnlyGramServingExists()
        {
            _context.ServingUnits.Add(new ServingUnit { ServingUnitId = 1, Name = "gram", Symbol = "g" });
            _context.FoodItems.Add(new FoodItem
            {
                FoodItemId = 808,
                FoodName = "Rice",
                FoodNameUnsigned = "rice",
                CaloriesPer100g = 130,
                ProteinPer100g = 2.7m,
                CarbPer100g = 28,
                FatPer100g = 0.3m,
                IsActive = true,
                IsDeleted = false,
                CredibilityScore = 95
            });
            _context.FoodServings.Add(new FoodServing
            {
                FoodServingId = 1,
                FoodItemId = 808,
                ServingUnitId = 1,
                GramsPerUnit = 1
            });
            _context.AiLabelMaps.Add(new AiLabelMap
            {
                Label = "rice",
                FoodItemId = 808,
                MinConfidence = 0.60m,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var service = new AiFoodMapService(_context, _mediaUrlResolver.Object);

            var mapped = await service.MapDetectionsAsync(new[]
            {
                new VisionDetectionDto { Label = "rice", Confidence = 0.95f }
            });

            var item = Assert.Single(mapped);
            Assert.Null(item.DefaultServingUnitId);
            Assert.Null(item.DefaultServingUnitName);
            Assert.Null(item.DefaultServingUnitSymbol);
            Assert.Equal(1, item.DefaultPortionQuantity);
            Assert.Equal(100, item.DefaultGrams);
        }

        public void Dispose()
        {
            _context.Dispose();
        }
    }
}
