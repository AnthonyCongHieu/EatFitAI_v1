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

    // ===== New Admin Fields =====
    
    /// <summary>Free, Pay-as-you-go, Pro</summary>
    [MaxLength(30)]
    public string Tier { get; set; } = "Free";

    /// <summary>gemini-2.5-flash, gemini-2.5-pro, etc.</summary>
    [MaxLength(50)]
    public string Model { get; set; } = "gemini-2.5-flash";

    /// <summary>RPD limit theo tier (Free = 1500)</summary>
    public int DailyQuotaLimit { get; set; } = 1500;

    /// <summary>Google Cloud Project ID (optional)</summary>
    [MaxLength(100)]
    public string? ProjectId { get; set; }

    /// <summary>Ghi chú admin</summary>
    public string? Notes { get; set; }
}

