using EatFitAI.API.Data;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class AiLogServiceTests : IDisposable
{
    private readonly EatFitAIDbContext _db;
    private readonly ApplicationDbContext _adminDb;
    private readonly AiLogService _service;

    public AiLogServiceTests()
    {
        var dbOptions = new DbContextOptionsBuilder<EatFitAIDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new EatFitAIDbContext(dbOptions);

        var adminOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _adminDb = new ApplicationDbContext(adminOptions);

        _service = new AiLogService(
            _db,
            new SupabaseSchemaBootstrapper(_adminDb, NullLogger<SupabaseSchemaBootstrapper>.Instance));
    }

    public void Dispose()
    {
        _db.Dispose();
        _adminDb.Dispose();
    }

    [Fact]
    public async Task LogAsync_PersistsDurationAndPayloads()
    {
        var userId = Guid.NewGuid();

        var logId = await _service.LogAsync(
            userId,
            "vision-scan",
            new { FoodName = "pho" },
            new { TotalCalories = 420 },
            1234);

        var entry = await _db.AILogs.SingleAsync(item => item.AILogId == logId);
        Assert.Equal(userId, entry.UserId);
        Assert.Equal("vision-scan", entry.Action);
        Assert.Equal(1234, entry.DurationMs);
        Assert.Contains("foodName", entry.InputJson ?? string.Empty, StringComparison.Ordinal);
        Assert.Contains("pho", entry.InputJson ?? string.Empty, StringComparison.Ordinal);
        Assert.Contains("totalCalories", entry.OutputJson ?? string.Empty, StringComparison.Ordinal);
        Assert.Contains("420", entry.OutputJson ?? string.Empty, StringComparison.Ordinal);
    }
}
