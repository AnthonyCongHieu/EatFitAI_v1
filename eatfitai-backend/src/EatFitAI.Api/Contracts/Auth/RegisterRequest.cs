using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.Auth;

public sealed class RegisterRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;

    public string? HoTen { get; set; }

    public string? DisplayName { get; set; }
}
