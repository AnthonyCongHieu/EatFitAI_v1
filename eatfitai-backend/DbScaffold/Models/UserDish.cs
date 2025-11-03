using System;
using System.Collections.Generic;

namespace EatFitAI.API.DbScaffold.Models;

public partial class UserDish
{
    public int UserDishId { get; set; }

    public Guid UserId { get; set; }

    public string DishName { get; set; } = null!;

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public bool IsDeleted { get; set; }

    public virtual ICollection<MealDiary> MealDiaries { get; set; } = new List<MealDiary>();

    public virtual User User { get; set; } = null!;

    public virtual ICollection<UserDishIngredient> UserDishIngredients { get; set; } = new List<UserDishIngredient>();
}
