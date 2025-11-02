using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models
{
    [Table("UserDish")]
    public class UserDish
    {
        [Key]
        [Column("UserDishId")]
        public int UserDishId { get; set; }

        [Required]
        [Column("UserId")]
        public Guid UserId { get; set; }

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        [Required]
        [Column("DishName")]
        [StringLength(255)]
        public string DishName { get; set; } = string.Empty;

        [Column("Description")]
        [StringLength(500)]
        public string? Description { get; set; }

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; }

        [Column("UpdatedAt")]
        public DateTime UpdatedAt { get; set; }

        [Required]
        [Column("IsDeleted")]
        public bool IsDeleted { get; set; }
    }
}