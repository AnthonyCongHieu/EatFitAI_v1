using System;
using System.Collections.Generic;

namespace EatFitAI.API.DbScaffold.Models;

public partial class NutritionTarget
{
    public int NutritionTargetId { get; set; }

    public Guid UserId { get; set; }

    public int? ActivityLevelId { get; set; }

    public int TargetCalories { get; set; }

    public int TargetProtein { get; set; }

    public int TargetCarb { get; set; }

    public int TargetFat { get; set; }

    public DateOnly EffectiveFrom { get; set; }

    public DateOnly? EffectiveTo { get; set; }

    public virtual ActivityLevel? ActivityLevel { get; set; }

    public virtual User User { get; set; } = null!;
}
