using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.Auth;

public sealed class RegisterRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string MatKhau { get; set; } = string.Empty;

    [Required]
    public string HoTen { get; set; } = string.Empty;
}
