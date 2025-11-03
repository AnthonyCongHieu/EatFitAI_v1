using System;
using System.Collections.Generic;

namespace EatFitAI.API.Models;

public partial class BodyMetric
{
    public int BodyMetricId { get; set; }

    public Guid UserId { get; set; }

    public decimal? HeightCm { get; set; }

    public decimal? WeightKg { get; set; }

    public DateOnly MeasuredDate { get; set; }

    public string? Note { get; set; }

    public virtual User User { get; set; } = null!;
}
