using System.ComponentModel.DataAnnotations;

namespace EatFitAI.API.Models;

public class UserEntitlement
{
    [Key]
    public Guid UserEntitlementId { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    [MaxLength(40)]
    public string PlanCode { get; set; } = "free";

    [MaxLength(40)]
    public string Status { get; set; } = "active";

    [MaxLength(60)]
    public string Source { get; set; } = "manual";

    public DateTime StartsAt { get; set; } = DateTime.UtcNow;

    public DateTime? ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual User User { get; set; } = null!;

    public virtual SubscriptionPlan Plan { get; set; } = null!;
}
