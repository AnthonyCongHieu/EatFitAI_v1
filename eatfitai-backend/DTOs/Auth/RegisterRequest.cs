using System.ComponentModel.DataAnnotations;

namespace EatFitAI.API.DTOs.Auth
{
    public class RegisterRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string Password { get; set; } = string.Empty;

        [Required]
        [StringLength(150)]
        public string DisplayName { get; set; } = string.Empty;
    }
}