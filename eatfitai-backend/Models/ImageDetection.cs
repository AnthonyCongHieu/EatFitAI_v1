using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models
{
    [Table("ImageDetection")]
    public class ImageDetection
    {
        [Key]
        [Column("ImageDetectionId")]
        public int ImageDetectionId { get; set; }

        [Required]
        [Column("AILogId")]
        public int AILogId { get; set; }

        [ForeignKey("AILogId")]
        public virtual AILog? AILog { get; set; }

        [Required]
        [Column("Label")]
        [StringLength(200)]
        public string Label { get; set; } = string.Empty;

        [Required]
        [Column("Confidence", TypeName = "decimal(5,4)")]
        public decimal Confidence { get; set; }
    }
}