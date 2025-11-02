using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models
{
    [Table("MealType")]
    public class MealType
    {
        [Key]
        [Column("MealTypeId")]
        public int MealTypeId { get; set; }

        [Required]
        [Column("Name")]
        [StringLength(50)]
        public string Name { get; set; } = string.Empty;
    }
}