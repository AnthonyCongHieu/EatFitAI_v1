using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models
{
    [Table("Recipe")]
    public class Recipe
    {
        [Key]
        [Column("RecipeId")]
        public int RecipeId { get; set; }

        [Required]
        [Column("RecipeName")]
        [StringLength(255)]
        public string RecipeName { get; set; } = string.Empty;

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