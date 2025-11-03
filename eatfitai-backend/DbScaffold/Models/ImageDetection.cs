using System;
using System.Collections.Generic;

namespace EatFitAI.API.DbScaffold.Models;

public partial class ImageDetection
{
    public int ImageDetectionId { get; set; }

    public int AILogId { get; set; }

    public string Label { get; set; } = null!;

    public decimal Confidence { get; set; }

    public virtual AILog AILog { get; set; } = null!;
}
