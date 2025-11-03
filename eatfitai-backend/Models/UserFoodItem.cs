using System;
using System.Collections.Generic;

namespace EatFitAI.API.Models;

public partial class UserFoodItem
{
    public int UserFoodItemId { get; set; }

    public Guid UserId { get; set; }

    public string FoodName { get; set; } = null!;

    public string? ThumbnailUrl { get; set; }

    public string UnitType { get; set; } = null!;

    public decimal CaloriesPer100 { get; set; }

    public decimal ProteinPer100 { get; set; }

    public decimal CarbPer100 { get; set; }

    public decimal FatPer100 { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
