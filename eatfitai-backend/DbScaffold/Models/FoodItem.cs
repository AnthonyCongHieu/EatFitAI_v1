using System;
using System.Collections.Generic;

namespace EatFitAI.API.DbScaffold.Models;

public partial class FoodItem
{
    public int FoodItemId { get; set; }

    public string FoodName { get; set; } = null!;

    public string? FoodNameEn { get; set; }

    public string? FoodNameUnsigned { get; set; }

    public decimal CaloriesPer100g { get; set; }

    public decimal ProteinPer100g { get; set; }

    public decimal CarbPer100g { get; set; }

    public decimal FatPer100g { get; set; }

    public string? ThumbNail { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public bool IsDeleted { get; set; }

    // Credibility fields persisted in PostgreSQL.
    public bool IsVerified { get; set; } // Green checkmark for trusted data
    public string? VerifiedBy { get; set; } // e.g., "Admin", "Community", "NIN"
    public int CredibilityScore { get; set; } = 50; // 0 - 100 confidence scale in DB

    public virtual ICollection<AISuggestion> AISuggestions { get; set; } = new List<AISuggestion>();

    public virtual ICollection<FoodServing> FoodServings { get; set; } = new List<FoodServing>();

    public virtual ICollection<MealDiary> MealDiaries { get; set; } = new List<MealDiary>();

    public virtual ICollection<RecipeIngredient> RecipeIngredients { get; set; } = new List<RecipeIngredient>();

    public virtual ICollection<UserDishIngredient> UserDishIngredients { get; set; } = new List<UserDishIngredient>();

    public virtual ICollection<UserFavoriteFood> UserFavoriteFoods { get; set; } = new List<UserFavoriteFood>();

    public virtual ICollection<UserRecentFood> UserRecentFoods { get; set; } = new List<UserRecentFood>();
}
