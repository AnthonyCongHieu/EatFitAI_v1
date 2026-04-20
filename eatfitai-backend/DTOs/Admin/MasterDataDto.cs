using System.ComponentModel.DataAnnotations;

namespace EatFitAI.API.DTOs.Admin
{
    // --- MealType DTOs ---
    public class MealTypeDto
    {
        public int MealTypeId { get; set; }
        public string Name { get; set; } = null!;
    }

    public class CreateMealTypeRequest
    {
        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = null!;
    }

    public class UpdateMealTypeRequest
    {
        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = null!;
    }

    // --- ServingUnit DTOs ---
    public class ServingUnitDto
    {
        public int ServingUnitId { get; set; }
        public string Name { get; set; } = null!;
        public string? Symbol { get; set; }
        public bool IsBaseUnit { get; set; }
    }

    public class CreateServingUnitRequest
    {
        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = null!;

        [MaxLength(20)]
        public string? Symbol { get; set; }

        public bool IsBaseUnit { get; set; }
    }

    public class UpdateServingUnitRequest
    {
        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = null!;

        [MaxLength(20)]
        public string? Symbol { get; set; }

        public bool IsBaseUnit { get; set; }
    }

    // --- ActivityLevel DTOs ---
    public class ActivityLevelDto
    {
        public int ActivityLevelId { get; set; }
        public string Name { get; set; } = null!;
        public decimal ActivityFactor { get; set; }
    }

    public class CreateActivityLevelRequest
    {
        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = null!;

        [Required]
        [Range(1.0, 3.0)]
        public decimal ActivityFactor { get; set; }
    }

    public class UpdateActivityLevelRequest
    {
        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = null!;

        [Required]
        [Range(1.0, 3.0)]
        public decimal ActivityFactor { get; set; }
    }
}
