using System;
using System.Collections.Generic;

namespace EatFitAI.API.DbScaffold.Models;

public partial class vw_MonthlyTotal
{
    public Guid UserId { get; set; }

    public DateOnly? Month { get; set; }

    public decimal? TotalCalories { get; set; }

    public decimal? TotalProtein { get; set; }

    public decimal? TotalCarb { get; set; }

    public decimal? TotalFat { get; set; }

    public int? EntryCount { get; set; }
}
