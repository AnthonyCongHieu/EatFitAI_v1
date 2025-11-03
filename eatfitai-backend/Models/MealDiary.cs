using System;
using System.Collections.Generic;

namespace EatFitAI.API.Models;

public partial class MealDiary
{
    public int MealDiaryId { get; set; }

    public Guid UserId { get; set; }

    public DateOnly EatenDate { get; set; }

    public int MealTypeId { get; set; }

    public int? FoodItemId { get; set; }

    public int? UserDishId { get; set; }

    public int? UserFoodItemId { get; set; }

    public int? RecipeId { get; set; }

    public int? ServingUnitId { get; set; }

    public decimal? PortionQuantity { get; set; }

    public decimal Grams { get; set; }

    public decimal Calories { get; set; }

    public decimal Protein { get; set; }

    public decimal Carb { get; set; }

    public decimal Fat { get; set; }

    public string? Note { get; set; }

    public string? PhotoUrl { get; set; }

    public string? SourceMethod { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public bool IsDeleted { get; set; }

    public virtual FoodItem? FoodItem { get; set; }

    public virtual MealType MealType { get; set; } = null!;

    public virtual Recipe? Recipe { get; set; }

    public virtual ServingUnit? ServingUnit { get; set; }

    public virtual User User { get; set; } = null!;

    public virtual UserDish? UserDish { get; set; }
}
