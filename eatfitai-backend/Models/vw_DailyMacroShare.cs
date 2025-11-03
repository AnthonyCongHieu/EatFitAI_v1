using System;
using System.Collections.Generic;

namespace EatFitAI.API.Models;

public partial class vw_DailyMacroShare
{
    public Guid UserId { get; set; }

    public DateOnly EatenDate { get; set; }

    public decimal? TotalCalories { get; set; }

    public decimal? TotalProtein { get; set; }

    public decimal? TotalCarb { get; set; }

    public decimal? TotalFat { get; set; }

    public decimal? ProteinShare { get; set; }

    public decimal? CarbShare { get; set; }

    public decimal? FatShare { get; set; }
}
