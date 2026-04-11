using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models;

public class GeminiKey
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string KeyName { get; set; } = null!;

    [Required]
    public string EncryptedApiKey { get; set; } = null!;

    // Tracking Quota (Dạng B: Chỉ đếm số, không lưu lịch sử phiền phức)
    public int DailyRequestsUsed { get; set; } = 0;
    
    // Tổng số lượng Request đã từng dùng của key này (Optional để Analytics Admin)
    public int TotalRequestsUsed { get; set; } = 0;

    public DateTime? LastUsedAt { get; set; }

    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
