using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models
{
    [Table("RecipeIngredient")]
    public class RecipeIngredient
    {
        [Key]
        [Column("RecipeIngredientId")]
        public int RecipeIngredientId { get; set; }

        [Required]
        [Column("RecipeId")]
        public int RecipeId { get; set; }

        [ForeignKey("RecipeId")]
        public virtual Recipe? Recipe { get; set; }

        [Required]
        [Column("FoodItemId")]
        public int FoodItemId { get; set; }

        [ForeignKey("FoodItemId")]
        public virtual FoodItem? FoodItem { get; set; }

        [Required]
        [Column("Grams", TypeName = "decimal(10,2)")]
        public decimal Grams { get; set; }
    }
}