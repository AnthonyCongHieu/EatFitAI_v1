using System;
using System.Collections.Generic;

namespace EatFitAI.API.Models;

public partial class RecipeIngredient
{
    public int RecipeIngredientId { get; set; }

    public int RecipeId { get; set; }

    public int FoodItemId { get; set; }

    public decimal Grams { get; set; }

    public virtual FoodItem FoodItem { get; set; } = null!;

    public virtual Recipe Recipe { get; set; } = null!;
}
