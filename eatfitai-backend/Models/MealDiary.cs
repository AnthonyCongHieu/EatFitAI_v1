using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models
{
    [Table("MealDiary")]
    public class MealDiary
    {
        [Key]
        [Column("MealDiaryId")]
        public int MealDiaryId { get; set; }

        [Required]
        [Column("UserId")]
        public Guid UserId { get; set; }

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        [Required]
        [Column("EatenDate")]
        public DateTime EatenDate { get; set; }

        [Required]
        [Column("MealTypeId")]
        public int MealTypeId { get; set; }

        [ForeignKey("MealTypeId")]
        public virtual MealType? MealType { get; set; }

        [Column("FoodItemId")]
        public int? FoodItemId { get; set; }

        [ForeignKey("FoodItemId")]
        public virtual FoodItem? FoodItem { get; set; }

        [Column("UserDishId")]
        public int? UserDishId { get; set; }

        [ForeignKey("UserDishId")]
        public virtual UserDish? UserDish { get; set; }

        [Column("RecipeId")]
        public int? RecipeId { get; set; }

        [ForeignKey("RecipeId")]
        public virtual Recipe? Recipe { get; set; }

        [Column("ServingUnitId")]
        public int? ServingUnitId { get; set; }

        [ForeignKey("ServingUnitId")]
        public virtual ServingUnit? ServingUnit { get; set; }

        [Column("PortionQuantity", TypeName = "decimal(10,2)")]
        public decimal? PortionQuantity { get; set; }

        [Required]
        [Column("Grams", TypeName = "decimal(10,2)")]
        public decimal Grams { get; set; }

        [Required]
        [Column("Calories", TypeName = "decimal(10,2)")]
        public decimal Calories { get; set; }

        [Required]
        [Column("Protein", TypeName = "decimal(10,2)")]
        public decimal Protein { get; set; }

        [Required]
        [Column("Carb", TypeName = "decimal(10,2)")]
        public decimal Carb { get; set; }

        [Required]
        [Column("Fat", TypeName = "decimal(10,2)")]
        public decimal Fat { get; set; }

        [Column("Note")]
        [StringLength(500)]
        public string? Note { get; set; }

        [Column("PhotoUrl")]
        [StringLength(500)]
        public string? PhotoUrl { get; set; }

        [Column("SourceMethod")]
        [StringLength(30)]
        public string? SourceMethod { get; set; }

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; }

        [Column("UpdatedAt")]
        public DateTime UpdatedAt { get; set; }

        [Required]
        [Column("IsDeleted")]
        public bool IsDeleted { get; set; }
    }
}