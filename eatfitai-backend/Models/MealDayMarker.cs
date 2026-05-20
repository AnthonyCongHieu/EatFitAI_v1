using System;

namespace EatFitAI.API.Models;

public partial class MealDayMarker
{
    public int MealDayMarkerId { get; set; }
    public Guid UserId { get; set; }
    public DateOnly LocalDate { get; set; }
    public int? MealTypeId { get; set; }
    public string MarkerType { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }

    public virtual MealType? MealType { get; set; }
    public virtual User User { get; set; } = null!;
}
