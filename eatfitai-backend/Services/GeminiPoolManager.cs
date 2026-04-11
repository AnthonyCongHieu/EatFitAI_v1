using System;
using System.Linq;
using System.Threading.Tasks;
using EatFitAI.API.Data;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EatFitAI.API.Services;

public class GeminiPoolManager : IGeminiPoolManager
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<GeminiPoolManager> _logger;
    private readonly IEncryptionService _encryptionService;
    private const int DAILY_LIMIT = 20; // Giới hạn của Tier Free

    public GeminiPoolManager(ApplicationDbContext context, ILogger<GeminiPoolManager> logger, IEncryptionService encryptionService)
    {
        _context = context;
        _logger = logger;
        _encryptionService = encryptionService;
    }

    public async Task<(Guid KeyId, string ApiKey)> GetNextAvailableKeyAsync()
    {
        var today = DateTime.UtcNow.Date;
        
        // 1. Lấy thông tin các key đang thiết lập "Active"
        var keys = await _context.GeminiKeys
            .Where(k => k.IsActive)
            .ToListAsync();

        if (!keys.Any())
        {
            _logger.LogError("Không tìm thấy bất kỳ API Key nào trong hệ thống.");
            throw new Exception("Dịch vụ AI đang bảo trì, vui lòng thử lại sau.");
        }

        // 2. Refresh quota "Lazy Reload": Nếu lưu trữ chưa reset qua ngày mới thì Reset thành 0
        bool needsSave = false;
        foreach (var k in keys)
        {
            if (!k.LastUsedAt.HasValue || k.LastUsedAt.Value.Date != today)
            {
                k.DailyRequestsUsed = 0;
                // Chỉ set LastUsedAt khi có sử dụng thật sự để tránh trượt mốc
                needsSave = true;
            }
        }
        
        if (needsSave)
        {
            await _context.SaveChangesAsync();
        }

        // 3. Round-Robin / Lọc những key chạm trần
        var availableKey = keys
            .Where(k => k.DailyRequestsUsed < DAILY_LIMIT)
            .OrderBy(k => k.DailyRequestsUsed) // Lấy key đang có số quota nhỏ nhất để xài đều (Round-Robin)
            .FirstOrDefault();

        if (availableKey == null)
        {
            _logger.LogError("Toàn bộ Pool API Key đã cạn hạn mức 20 requests/ngày.");
            throw new Exception("Dịch vụ AI đang tạm ngừng hoặc quá tải, vui lòng thử lại sau.");
        }

        var decryptedKey = _encryptionService.Decrypt(availableKey.EncryptedApiKey);
        return (availableKey.Id, decryptedKey);
    }

    public async Task ReportUsageAsync(Guid keyId)
    {
        var keyRecord = await _context.GeminiKeys.FindAsync(keyId);

        if (keyRecord != null)
        {
            keyRecord.DailyRequestsUsed += 1;
            keyRecord.TotalRequestsUsed += 1;
            keyRecord.LastUsedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            _logger.LogInformation("Phân bổ AI. Tăng Quota cho Key '{KeyName}'. Đã dùng: {Count}/{Limit}", keyRecord.KeyName, keyRecord.DailyRequestsUsed, DAILY_LIMIT);
        }
    }
}
