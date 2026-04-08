using System;

namespace EatFitAI.API.DbScaffold.Models;

public partial class AiLabelMap
{
    public string Label { get; set; } = null!;

    public int? FoodItemId { get; set; }

    public decimal MinConfidence { get; set; }

    public DateTime CreatedAt { get; set; }
}
