using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models
{
    [Table("ServingUnit")]
    public class ServingUnit
    {
        [Key]
        [Column("ServingUnitId")]
        public int ServingUnitId { get; set; }

        [Required]
        [Column("Name")]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Column("Symbol")]
        [StringLength(20)]
        public string? Symbol { get; set; }

        [Required]
        [Column("IsBaseUnit")]
        public bool IsBaseUnit { get; set; }
    }
}