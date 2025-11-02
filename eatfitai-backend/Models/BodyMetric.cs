using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models
{
    [Table("BodyMetric")]
    public class BodyMetric
    {
        [Key]
        [Column("BodyMetricId")]
        public int BodyMetricId { get; set; }

        [Required]
        [Column("UserId")]
        public Guid UserId { get; set; }

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        [Column("HeightCm", TypeName = "decimal(5,2)")]
        public decimal? HeightCm { get; set; }

        [Column("WeightKg", TypeName = "decimal(5,2)")]
        public decimal? WeightKg { get; set; }

        [Column("BodyFatPct", TypeName = "decimal(5,2)")]
        public decimal? BodyFatPct { get; set; }

        [Required]
        [Column("MeasuredDate")]
        public DateTime MeasuredDate { get; set; }

        [Column("Note")]
        [StringLength(200)]
        public string? Note { get; set; }
    }
}