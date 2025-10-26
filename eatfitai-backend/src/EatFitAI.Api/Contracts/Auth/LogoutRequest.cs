using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.Auth;

public sealed class LogoutRequest
{
    [Required]
    public string MaRefreshToken { get; set; } = string.Empty;
}

