using System;
using System.Collections.Generic;

namespace EatFitAI.API.DbScaffold.Models;

public partial class UserFavoriteFood
{
    public int UserFavoriteFoodId { get; set; }

    public Guid UserId { get; set; }

    public int FoodItemId { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual FoodItem FoodItem { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
