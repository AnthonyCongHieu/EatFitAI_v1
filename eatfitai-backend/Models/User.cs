using System;
using System.Collections.Generic;

namespace EatFitAI.API.Models;

public partial class User
{
    public Guid UserId { get; set; }

    public string Email { get; set; } = null!;

    public string? PasswordHash { get; set; }

    public string? DisplayName { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<AILog> AILogs { get; set; } = new List<AILog>();

    public virtual ICollection<BodyMetric> BodyMetrics { get; set; } = new List<BodyMetric>();

    public virtual ICollection<MealDiary> MealDiaries { get; set; } = new List<MealDiary>();

    public virtual ICollection<NutritionTarget> NutritionTargets { get; set; } = new List<NutritionTarget>();

    public virtual ICollection<UserDish> UserDishes { get; set; } = new List<UserDish>();

    public virtual ICollection<UserFavoriteFood> UserFavoriteFoods { get; set; } = new List<UserFavoriteFood>();

    public virtual ICollection<UserFoodItem> UserFoodItems { get; set; } = new List<UserFoodItem>();

    public virtual ICollection<UserRecentFood> UserRecentFoods { get; set; } = new List<UserRecentFood>();
}
