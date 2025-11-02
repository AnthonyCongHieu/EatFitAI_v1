using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models
{
    [Table("UserRecentFood")]
    public class UserRecentFood
    {
        [Key]
        [Column("UserRecentFoodId")]
        public int UserRecentFoodId { get; set; }

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

        [Column("LastUsedAt")]
        public DateTime LastUsedAt { get; set; }

        [Required]
        [Column("UsedCount")]
        public int UsedCount { get; set; }
    }
}