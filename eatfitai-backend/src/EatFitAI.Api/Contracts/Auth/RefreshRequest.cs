using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.Auth;

public sealed class RefreshRequest
{
    [Required]
    public string MaRefreshToken { get; set; } = string.Empty;

    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}
