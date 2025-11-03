using System;
using System.Collections.Generic;

namespace EatFitAI.API.DbScaffold.Models;

public partial class vw_TargetProgress
{
    public Guid UserId { get; set; }

    public DateOnly EatenDate { get; set; }

    public decimal? TotalCalories { get; set; }

    public decimal? TotalProtein { get; set; }

    public decimal? TotalCarb { get; set; }

    public decimal? TotalFat { get; set; }

    public int TargetCalories { get; set; }

    public int TargetProtein { get; set; }

    public int TargetCarb { get; set; }

    public int TargetFat { get; set; }

    public int? CalorieDelta { get; set; }

    public int? ProteinDelta { get; set; }

    public int? CarbDelta { get; set; }

    public int? FatDelta { get; set; }
}
