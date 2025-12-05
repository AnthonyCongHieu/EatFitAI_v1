using System.ComponentModel.DataAnnotations;

namespace EatFitAI.API.DTOs.Auth
{
    /// <summary>
    /// Request gửi lại mã xác minh email
    /// </summary>
    public class ResendVerificationRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }
}
