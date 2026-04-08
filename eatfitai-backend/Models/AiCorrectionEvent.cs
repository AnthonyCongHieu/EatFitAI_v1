using System;

namespace EatFitAI.API.Models;

public class AiCorrectionEvent
{
    public int AiCorrectionEventId { get; set; }

    public Guid UserId { get; set; }

    public string Label { get; set; } = null!;

    public int? FoodItemId { get; set; }

    public string? SelectedFoodName { get; set; }

    public decimal? DetectedConfidence { get; set; }

    public string? Source { get; set; }

    public DateTime? ClientTimestamp { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
