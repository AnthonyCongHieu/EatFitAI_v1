using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace EatFitAI.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
                    ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(value) || !Guid.TryParse(value, out var userId))
        {
            throw new InvalidOperationException("User identifier missing in access token");
        }

        return userId;
    }
}
