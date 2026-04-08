using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.DbScaffold.Models;

public partial class Recipe
{
    public int RecipeId { get; set; }

    public string RecipeName { get; set; } = null!;

    public string? Description { get; set; }

    // TODO: Uncomment sau khi chạy migration SQL
    // Hướng dẫn nấu ăn (các bước cụ thể)
    // public string? Instructions { get; set; }

    // URL video hướng dẫn (YouTube embed)
    // public string? VideoUrl { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    // The active Supabase schema does not soft-delete Recipe rows.
    [NotMapped]
    public bool IsDeleted { get; set; }

    public virtual ICollection<MealDiary> MealDiaries { get; set; } = new List<MealDiary>();

    public virtual ICollection<RecipeIngredient> RecipeIngredients { get; set; } = new List<RecipeIngredient>();
}
