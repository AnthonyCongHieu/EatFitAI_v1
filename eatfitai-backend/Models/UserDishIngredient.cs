using System;
using System.Collections.Generic;

namespace EatFitAI.API.Models;

public partial class UserDishIngredient
{
    public int UserDishIngredientId { get; set; }

    public int UserDishId { get; set; }

    public int FoodItemId { get; set; }

    public decimal Grams { get; set; }

    public virtual FoodItem FoodItem { get; set; } = null!;

    public virtual UserDish UserDish { get; set; } = null!;
}
