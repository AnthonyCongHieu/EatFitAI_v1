using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.DbScaffold.Models;

public partial class NutritionTarget
{
    public int NutritionTargetId { get; set; }

    public Guid UserId { get; set; }

    public int? ActivityLevelId { get; set; }

    [Column("CaloriesTarget")]
    public int TargetCalories { get; set; }

    [Column("ProteinTarget")]
    public int TargetProtein { get; set; }

    [Column("CarbTarget")]
    public int TargetCarb { get; set; }

    [Column("FatTarget")]
    public int TargetFat { get; set; }

    // Goal is stored on Users in the active Supabase schema, not on NutritionTarget.
    [NotMapped]
    public string? Goal { get; set; }

    public DateOnly EffectiveFrom { get; set; }

    public DateOnly? EffectiveTo { get; set; }

    public virtual ActivityLevel? ActivityLevel { get; set; }

    public virtual User User { get; set; } = null!;
}
