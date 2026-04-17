using System;

namespace EatFitAI.API.Models;

public partial class WaterIntake
{
    public int WaterIntakeId { get; set; }

    public Guid UserId { get; set; }

    public DateOnly IntakeDate { get; set; }

    public int AmountMl { get; set; }

    public int TargetMl { get; set; } = 2000;

    public DateTime UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
