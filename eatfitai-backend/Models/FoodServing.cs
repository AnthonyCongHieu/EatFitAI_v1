using System;
using System.Collections.Generic;

namespace EatFitAI.API.Models;

public partial class FoodServing
{
    public int FoodServingId { get; set; }

    public int FoodItemId { get; set; }

    public int ServingUnitId { get; set; }

    public decimal GramsPerUnit { get; set; }

    public string? Description { get; set; }

    public virtual FoodItem FoodItem { get; set; } = null!;

    public virtual ServingUnit ServingUnit { get; set; } = null!;
}
