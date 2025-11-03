using System;
using System.Collections.Generic;

namespace EatFitAI.API.Models;

public partial class ServingUnit
{
    public int ServingUnitId { get; set; }

    public string Name { get; set; } = null!;

    public string? Symbol { get; set; }

    public bool IsBaseUnit { get; set; }

    public virtual ICollection<FoodServing> FoodServings { get; set; } = new List<FoodServing>();

    public virtual ICollection<MealDiary> MealDiaries { get; set; } = new List<MealDiary>();
}
