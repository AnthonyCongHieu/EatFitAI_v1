using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models
{
    [Table("FoodItem")]
    public class FoodItem
    {
        [Key]
        [Column("FoodItemId")]
        public int FoodItemId { get; set; }

        [Required]
        [Column("FoodName")]
        [StringLength(255)]
        public string FoodName { get; set; } = string.Empty;

        [Required]
        [Column("CaloriesPer100g", TypeName = "decimal(10,2)")]
        public decimal CaloriesPer100g { get; set; }

        [Required]
        [Column("ProteinPer100g", TypeName = "decimal(10,2)")]
        public decimal ProteinPer100g { get; set; }

        [Required]
        [Column("CarbPer100g", TypeName = "decimal(10,2)")]
        public decimal CarbPer100g { get; set; }

        [Required]
        [Column("FatPer100g", TypeName = "decimal(10,2)")]
        public decimal FatPer100g { get; set; }

        [Required]
        [Column("IsActive")]
        public bool IsActive { get; set; }

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; }

        [Column("UpdatedAt")]
        public DateTime UpdatedAt { get; set; }

        [Required]
        [Column("IsDeleted")]
        public bool IsDeleted { get; set; }
    }
}