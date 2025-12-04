using System.ComponentModel.DataAnnotations;

namespace EatFitAI.API.DTOs.Auth
{
    /// <summary>
    /// Request xác minh email bằng mã 6 số
    /// </summary>
    public class VerifyEmailRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        [StringLength(6, MinimumLength = 6)]
        public string VerificationCode { get; set; } = string.Empty;
    }
}
