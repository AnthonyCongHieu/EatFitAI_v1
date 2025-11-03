using System;
using System.Collections.Generic;

namespace EatFitAI.API.Models;

public partial class AILog
{
    public int AILogId { get; set; }

    public Guid? UserId { get; set; }

    public string Action { get; set; } = null!;

    public string? InputJson { get; set; }

    public string? OutputJson { get; set; }

    public int? DurationMs { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<AISuggestion> AISuggestions { get; set; } = new List<AISuggestion>();

    public virtual ICollection<ImageDetection> ImageDetections { get; set; } = new List<ImageDetection>();

    public virtual User? User { get; set; }
}
