using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models;

public partial class Recipe
{
    public int RecipeId { get; set; }

    public string RecipeName { get; set; } = null!;

    public string? Description { get; set; }

    public string? ImageUrl { get; set; }

    public int? CookTimeMinutes { get; set; }

    public string? Difficulty { get; set; }

    public int? ServingCount { get; set; }

    public string? InstructionsJson { get; set; }

    public string? VideoUrl { get; set; }

    public string? SourceUrlsJson { get; set; }

    public int CredibilityScore { get; set; } = 70;

    public DateTime? EnhancedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [NotMapped]
    public bool IsDeleted { get; set; }

    public virtual ICollection<MealDiary> MealDiaries { get; set; } = new List<MealDiary>();

    public virtual ICollection<RecipeIngredient> RecipeIngredients { get; set; } = new List<RecipeIngredient>();
}
