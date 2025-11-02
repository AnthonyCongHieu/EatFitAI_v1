using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models
{
    [Table("UserFavoriteFood")]
    public class UserFavoriteFood
    {
        [Key]
        [Column("UserFavoriteFoodId")]
        public int UserFavoriteFoodId { get; set; }

        [Required]
        [Column("UserId")]
        public Guid UserId { get; set; }

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        [Required]
        [Column("FoodItemId")]
        public int FoodItemId { get; set; }

        [ForeignKey("FoodItemId")]
        public virtual FoodItem? FoodItem { get; set; }

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; }
    }
}