using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models
{
    [Table("ActivityLevel")]
    public class ActivityLevel
    {
        [Key]
        [Column("ActivityLevelId")]
        public int ActivityLevelId { get; set; }

        [Required]
        [Column("Name")]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Column("ActivityFactor", TypeName = "decimal(4,2)")]
        public decimal ActivityFactor { get; set; }
    }
}