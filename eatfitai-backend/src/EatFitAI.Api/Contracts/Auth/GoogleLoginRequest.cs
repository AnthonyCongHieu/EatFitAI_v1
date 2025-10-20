using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.Auth;

public sealed class GoogleLoginRequest
{
    [Required]
    public string IdToken { get; set; } = string.Empty;
}
