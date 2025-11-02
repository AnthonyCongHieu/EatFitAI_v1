using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EatFitAI.API.Models
{
    [Table("Users")]
    public class User
    {
        [Key]
        [Column("UserId")]
        public Guid UserId { get; set; }

        [Required]
        [Column("Email")]
        [StringLength(256)]
        public string Email { get; set; } = string.Empty;

        [Column("PasswordHash")]
        [StringLength(256)]
        public string? PasswordHash { get; set; }

        [Column("DisplayName")]
        [StringLength(150)]
        public string? DisplayName { get; set; }

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; }
    }
}