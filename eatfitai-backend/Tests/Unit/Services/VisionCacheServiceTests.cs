using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class VisionCacheServiceTests : IDisposable
{
    private readonly EatFitAIDbContext _db;
    private readonly VisionCacheService _service;

    public VisionCacheServiceTests()
    {
        var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _db = new EatFitAIDbContext(options);
        _service = new VisionCacheService(
            _db,
            new MemoryCache(new MemoryCacheOptions()),
            NullLogger<VisionCacheService>.Instance);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    [Fact]
    public async Task GetDetectionHistoryAsync_ParsesPascalCaseAndCamelCaseLogJson()
    {
        var userId = Guid.NewGuid();

        _db.AILogs.AddRange(
            new AILog
            {
                UserId = userId,
                Action = "VisionDetect",
                CreatedAt = DateTime.UtcNow.AddMinutes(-1),
                OutputJson = """
                {
                  "Items": [
                    {
                      "Label": "Banana",
                      "Confidence": 0.91,
                      "FoodName": "Chuoi"
                    }
                  ],
                  "UnmappedLabels": ["unknown"]
                }
                """
            },
            new AILog
            {
                UserId = userId,
                Action = "VisionDetect",
                CreatedAt = DateTime.UtcNow,
                OutputJson = """
                {
                  "items": [
                    {
                      "label": "Apple",
                      "confidence": 0.8,
                      "foodName": "Táo"
                    }
                  ],
                  "unmappedLabels": [
                    {
                      "label": "mystery"
                    }
                  ]
                }
                """
            });

        await _db.SaveChangesAsync();

        var history = await _service.GetDetectionHistoryAsync(
            userId,
            new DetectionHistoryRequest { Days = 7, MaxResults = 10 });

        Assert.Equal(2, history.Count);
        Assert.Contains(history[0].DetectedLabels, label => label == "Apple" || label == "mystery");
        Assert.Contains(history[0].MappedFoodNames, name => name == "Táo");
        Assert.Contains(history[1].DetectedLabels, label => label == "Banana" || label == "unknown");
        Assert.Contains(history[1].MappedFoodNames, name => name == "Chuoi");

        var stats = await _service.GetUnmappedLabelsStatsAsync(userId, 7);
        Assert.Equal(1, stats["unknown"]);
        Assert.Equal(1, stats["mystery"]);
    }
}
