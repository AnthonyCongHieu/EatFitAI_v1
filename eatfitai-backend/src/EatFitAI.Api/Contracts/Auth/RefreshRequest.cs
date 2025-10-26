using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.Auth;

public sealed class RefreshRequest
{
    [Required]
    public string MaRefreshToken { get; set; } = string.Empty;
}
