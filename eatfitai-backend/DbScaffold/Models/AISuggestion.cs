using System;
using System.Collections.Generic;

namespace EatFitAI.API.DbScaffold.Models;

public partial class AISuggestion
{
    public int AISuggestionId { get; set; }

    public int AILogId { get; set; }

    public int FoodItemId { get; set; }

    public decimal Confidence { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual AILog AILog { get; set; } = null!;

    public virtual FoodItem FoodItem { get; set; } = null!;
}
