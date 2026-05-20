using System;

namespace EatFitAI.API.Models;

public partial class WeeklyReviewAction
{
    public int WeeklyReviewActionId { get; set; }
    public Guid UserId { get; set; }
    public DateOnly WeekStartDate { get; set; }
    public string ActionKey { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Status { get; set; } = "suggested";
    public string? ReplacementText { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
