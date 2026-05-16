using System.ComponentModel.DataAnnotations;

namespace EatFitAI.API.Models;

public class SubscriptionPlan
{
    [Key]
    [MaxLength(40)]
    public string PlanCode { get; set; } = string.Empty;

    [MaxLength(120)]
    public string DisplayName { get; set; } = string.Empty;

    public bool IsPremium { get; set; }

    public string FeaturesJson { get; set; } = "{}";

    public string LimitsJson { get; set; } = "{}";

    public bool IsActive { get; set; } = true;

    public int SortOrder { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual ICollection<UserEntitlement> UserEntitlements { get; set; } = new List<UserEntitlement>();
}
