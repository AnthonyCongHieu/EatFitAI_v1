using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.Auth;

/// <summary>
/// Request model for user registration.
/// </summary>
public sealed class RegisterRequest
{
    /// <summary>
    /// User's email address.
    /// </summary>
    /// <example>user@example.com</example>
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// User's password (minimum 6 characters, must contain uppercase, lowercase, and digit).
    /// </summary>
    /// <example>MySecurePass123</example>
    [Required]
    [MinLength(6)]
    public string MatKhau { get; set; } = string.Empty;

    /// <summary>
    /// User's full name.
    /// </summary>
    /// <example>Nguyen Van A</example>
    [Required]
    public string HoTen { get; set; } = string.Empty;
}
