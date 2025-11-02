using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models
{
    [Table("AILog")]
    public class AILog
    {
        [Key]
        [Column("AILogId")]
        public int AILogId { get; set; }

        [Column("UserId")]
        public Guid? UserId { get; set; }

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        [Required]
        [Column("Action")]
        [StringLength(50)]
        public string Action { get; set; } = string.Empty;

        [Column("InputJson")]
        public string? InputJson { get; set; }

        [Column("OutputJson")]
        public string? OutputJson { get; set; }

        [Column("DurationMs")]
        public int? DurationMs { get; set; }

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; }
    }
}