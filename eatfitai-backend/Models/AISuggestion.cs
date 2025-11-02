using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models
{
    [Table("AISuggestion")]
    public class AISuggestion
    {
        [Key]
        [Column("AISuggestionId")]
        public int AISuggestionId { get; set; }

        [Required]
        [Column("AILogId")]
        public int AILogId { get; set; }

        [ForeignKey("AILogId")]
        public virtual AILog? AILog { get; set; }

        [Required]
        [Column("FoodItemId")]
        public int FoodItemId { get; set; }

        [ForeignKey("FoodItemId")]
        public virtual FoodItem? FoodItem { get; set; }

        [Required]
        [Column("Confidence", TypeName = "decimal(5,4)")]
        public decimal Confidence { get; set; }

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; }
    }
}