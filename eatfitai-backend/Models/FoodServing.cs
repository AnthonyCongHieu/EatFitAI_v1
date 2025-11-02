using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models
{
    [Table("FoodServing")]
    public class FoodServing
    {
        [Key]
        [Column("FoodServingId")]
        public int FoodServingId { get; set; }

        [Required]
        [Column("FoodItemId")]
        public int FoodItemId { get; set; }

        [ForeignKey("FoodItemId")]
        public virtual FoodItem? FoodItem { get; set; }

        [Required]
        [Column("ServingUnitId")]
        public int ServingUnitId { get; set; }

        [ForeignKey("ServingUnitId")]
        public virtual ServingUnit? ServingUnit { get; set; }

        [Required]
        [Column("GramsPerUnit", TypeName = "decimal(10,2)")]
        public decimal GramsPerUnit { get; set; }

        [Column("Description")]
        [StringLength(200)]
        public string? Description { get; set; }
    }
}