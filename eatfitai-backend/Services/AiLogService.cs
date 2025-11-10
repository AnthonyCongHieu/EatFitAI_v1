using System.Text.Json;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;

namespace EatFitAI.API.Services
{
    public interface IAiLogService
    {
        Task<int> LogAsync(Guid userId, string action, object? input, object? output, long durationMs);
    }

    public sealed class AiLogService : IAiLogService
    {
        private readonly EatFitAIDbContext _db;
        public AiLogService(EatFitAIDbContext db) => _db = db;

        public async Task<int> LogAsync(Guid userId, string action, object? input, object? output, long durationMs)
        {
            var log = new AILog
            {
                UserId = userId,
                Action = action,
                InputJson = input is null ? null : JsonSerializer.Serialize(input),
                OutputJson = output is null ? null : JsonSerializer.Serialize(output),
                DurationMs = (int)Math.Min(durationMs, int.MaxValue),
            };
            _db.AILogs.Add(log);
            await _db.SaveChangesAsync();
            return log.AILogId;
        }
    }
}

