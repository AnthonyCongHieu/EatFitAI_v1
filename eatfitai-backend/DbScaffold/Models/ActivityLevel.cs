using System;
using System.Collections.Generic;

namespace EatFitAI.API.DbScaffold.Models;

public partial class ActivityLevel
{
    public int ActivityLevelId { get; set; }

    public string Name { get; set; } = null!;

    public decimal ActivityFactor { get; set; }

    public virtual ICollection<NutritionTarget> NutritionTargets { get; set; } = new List<NutritionTarget>();
}
