using System;
using System.Linq;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using EatFitAI.API.Data;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;

namespace EatFitAI.API.Services;

public class GeminiPoolManager : IGeminiPoolManager
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<GeminiPoolManager> _logger;
    private readonly IEncryptionService _encryptionService;
    private readonly IMemoryCache _cache;
    private const int DAILY_LIMIT = 20;

    // Background queue to async update DB so we don't hold up threads
    private static ConcurrentQueue<Guid> _usageQueue = new();

    public GeminiPoolManager(
        ApplicationDbContext context, 
        ILogger<GeminiPoolManager> logger, 
        IEncryptionService encryptionService,
        IMemoryCache cache)
    {
        _context = context;
        _logger = logger;
        _encryptionService = encryptionService;
        _cache = cache;
    }

    public async Task<(Guid KeyId, string ApiKey)> GetNextAvailableKeyAsync()
    {
        var keys = await _context.GeminiKeys
            .Where(k => k.IsActive)
            .ToListAsync();

        if (!keys.Any())
        {
            _logger.LogError("Không tìm thấy bất kỳ API Key nào trong hệ thống.");
            throw new Exception("Dịch vụ AI đang bảo trì, vui lòng thử lại sau.");
        }

        Guid? selectedKeyId = null;
        string? selectedApiKey = null;
        int lowestUsage = int.MaxValue;

        foreach (var key in keys)
        {
            // 1. Check Circuit Breaker (Ejection)
            if (_cache.TryGetValue($"key_ejected_{key.Id}", out DateTime ejectedUntil))
            {
                if (DateTime.UtcNow < ejectedUntil)
                {
                    continue; // Bỏ qua key này vì đang bị phạt
                }
            }

            // 2. Refresh Quota cache
            string usageCacheKey = $"key_usage_{key.Id}_{DateTime.UtcNow:yyyyMMdd}";
            if (!_cache.TryGetValue(usageCacheKey, out int currentUsage))
            {
                // Mới sang ngày mới hoặc cache mất, lấy lại từ DB
                if (key.LastUsedAt.HasValue && key.LastUsedAt.Value.Date == DateTime.UtcNow.Date)
                {
                    currentUsage = key.DailyRequestsUsed;
                }
                else
                {
                    currentUsage = 0; // Đã sang ngày mới
                }
                _cache.Set(usageCacheKey, currentUsage, TimeSpan.FromHours(24));
            }

            // 3. Weighted / Round Robin Selection
            var limit = key.DailyQuotaLimit > 0 ? key.DailyQuotaLimit : DAILY_LIMIT; // Custom per key if exists

            if (currentUsage < limit)
            {
                // Chọn key có số Request thấp nhất so với Limit của nó (Tải đều dàn trải)
                if (currentUsage < lowestUsage)
                {
                    lowestUsage = currentUsage;
                    selectedKeyId = key.Id;
                    try {
                        selectedApiKey = _encryptionService.Decrypt(key.EncryptedApiKey);
                    } catch {
                        // Failed to decrypt, skip
                        _logger.LogError("Failed to decrypt key {Id}", key.Id);
                    }
                }
            }
        }

        if (selectedKeyId == null || selectedApiKey == null)
        {
            _logger.LogError("Toàn bộ Pool API Key đã cạn hạn mức hoặc bị vô hiệu hóa bởi Circuit Breaker.");
            throw new Exception("Dịch vụ AI hiện đang quá tải, vui lòng thử lại sau vài phút.");
        }

        return (selectedKeyId.Value, selectedApiKey);
    }

    public async Task ReportUsageAsync(Guid keyId)
    {
        string usageCacheKey = $"key_usage_{keyId}_{DateTime.UtcNow:yyyyMMdd}";
        
        // Increase memory counter atomically (simplified)
        var newUsage = 1;
        if (_cache.TryGetValue(usageCacheKey, out int currentUsage))
        {
             newUsage = currentUsage + 1;
             _cache.Set(usageCacheKey, newUsage, TimeSpan.FromHours(24));
        }
        else 
        {
             _cache.Set(usageCacheKey, 1, TimeSpan.FromHours(24));
        }

        _logger.LogInformation("Key {KeyId} Memory Usage = {Usage}", keyId, newUsage);
        
        // Queue for DB batch update (Fire & Forget to DB)
        _usageQueue.Enqueue(keyId);
        _ = SyncQueueToDbAsync();
        
        await Task.CompletedTask;
    }
    
    public void ReportFailure(Guid keyId, int statusCode)
    {
        // Circuit Breaker logic
        string failCacheKey = $"key_fails_{keyId}";
        int fails = _cache.GetOrCreate(failCacheKey, entry => 0);
        
        if (statusCode == 429) fails += 3;       // 429 Too Many Requests -> Nặng
        else if (statusCode == 401) fails += 10; // Lỗi token vô hiệu -> Cực nặng
        else fails += 1;

        _cache.Set(failCacheKey, fails, TimeSpan.FromMinutes(10));

        if (fails >= 10)
        {
            _logger.LogWarning("CIRCUIT BREAKER: Key {KeyId} failed too many times. Ejecting for 30 mins.", keyId);
            _cache.Set($"key_ejected_{keyId}", DateTime.UtcNow.AddMinutes(30), TimeSpan.FromMinutes(30));
            _cache.Remove(failCacheKey); // reset fails
        }
    }

    private async Task SyncQueueToDbAsync()
    {
        // Simple async batch sync (In production you'd use a background hosted service like IHostedService)
        if (_usageQueue.Count < 5) return; // Sync only when 5+ actions
        
        using var scope = _context.Database.BeginTransactionAsync();
        try 
        {
            while (_usageQueue.TryDequeue(out var id))
            {
                var k = await _context.GeminiKeys.FindAsync(id);
                if (k != null)
                {
                    k.DailyRequestsUsed += 1;
                    k.TotalRequestsUsed += 1;
                    k.LastUsedAt = DateTime.UtcNow;
                }
            }
            await _context.SaveChangesAsync();
            await _context.Database.CommitTransactionAsync();
        } 
        catch {
             // Rollback or ignore
        }
    }
}
