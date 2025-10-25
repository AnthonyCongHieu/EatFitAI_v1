using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.Auth;

public sealed class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string MatKhau { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}
