using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models
{
    [Table("UserDishIngredient")]
    public class UserDishIngredient
    {
        [Key]
        [Column("UserDishIngredientId")]
        public int UserDishIngredientId { get; set; }

        [Required]
        [Column("UserDishId")]
        public int UserDishId { get; set; }

        [ForeignKey("UserDishId")]
        public virtual UserDish? UserDish { get; set; }

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