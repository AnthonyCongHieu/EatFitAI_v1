using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models
{
    [Table("NutritionTarget")]
    public class NutritionTarget
    {
        [Key]
        [Column("NutritionTargetId")]
        public int NutritionTargetId { get; set; }

        [Required]
        [Column("UserId")]
        public Guid UserId { get; set; }

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        [Column("ActivityLevelId")]
        public int? ActivityLevelId { get; set; }

        [ForeignKey("ActivityLevelId")]
        public virtual ActivityLevel? ActivityLevel { get; set; }

        [Required]
        [Column("TargetCalories")]
        public int TargetCalories { get; set; }

        [Required]
        [Column("TargetProtein")]
        public int TargetProtein { get; set; }

        [Required]
        [Column("TargetCarb")]
        public int TargetCarb { get; set; }

        [Required]
        [Column("TargetFat")]
        public int TargetFat { get; set; }

        [Required]
        [Column("EffectiveFrom")]
        public DateTime EffectiveFrom { get; set; }

        [Column("EffectiveTo")]
        public DateTime? EffectiveTo { get; set; }
    }
}