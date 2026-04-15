using System.ComponentModel.DataAnnotations;

namespace EatFitAI.API.Models;

public class PasswordResetCode
{
    [Key]
    public Guid UserId { get; set; }

    [MaxLength(88)]
    public string CodeHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public DateTime? ConsumedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
