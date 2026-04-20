using System.ComponentModel.DataAnnotations;

namespace EatFitAI.API.Models;

public class UserAccessControl
{
    [Key]
    public Guid UserId { get; set; }

    [MaxLength(40)]
    public string AccessState { get; set; } = "active";

    public DateTime? SuspendedAt { get; set; }

    public string? SuspendedReason { get; set; }

    [MaxLength(256)]
    public string? SuspendedBy { get; set; }

    public DateTime? DeactivatedAt { get; set; }

    [MaxLength(256)]
    public string? DeactivatedBy { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
