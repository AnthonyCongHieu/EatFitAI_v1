using System;
using System.Threading.Tasks;

namespace EatFitAI.API.Services.Interfaces;

public interface IGeminiPoolManager
{
    /// <summary>
    /// Lấy Key tiếp theo từ Pool, tự động kiểm tra xem có vượt quá giới hạn hay không và loại trừ Key kiệt sức.
    /// Nếu key đã qua ngày mới, tự động reset quota.
    /// </summary>
    Task<(Guid KeyId, string ApiKey)> GetNextAvailableKeyAsync();
    
    /// <summary>
    /// Báo cáo (cộng dồn) mức độ sử dụng cho key đó sau khi AI Request thành công.
    /// </summary>
    Task ReportUsageAsync(Guid keyId);

    /// <summary>
    /// Circuit Breaker: Báo cáo khi có lỗi xảy ra (vd 429).
    /// </summary>
    void ReportFailure(Guid keyId, int statusCode);
}
