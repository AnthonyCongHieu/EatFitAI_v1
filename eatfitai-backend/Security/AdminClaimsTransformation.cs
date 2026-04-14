using System.Security.Claims;
using EatFitAI.API.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Security;

public sealed class AdminClaimsTransformation : IClaimsTransformation
{
    private readonly ApplicationDbContext _context;

    public AdminClaimsTransformation(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity is not ClaimsIdentity identity || !identity.IsAuthenticated)
        {
            return principal;
        }

        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? principal.FindFirstValue("sub");
        var email = principal.FindFirstValue(ClaimTypes.Email)
            ?? principal.FindFirstValue("email");

        if (string.IsNullOrWhiteSpace(userId) && string.IsNullOrWhiteSpace(email))
        {
            return principal;
        }

        var query = _context.Users.AsNoTracking().AsQueryable();
        if (Guid.TryParse(userId, out var parsedUserId))
        {
            query = query.Where(user => user.UserId == parsedUserId);
        }
        else if (!string.IsNullOrWhiteSpace(email))
        {
            var normalizedEmail = email.Trim();
            query = query.Where(user => user.Email == normalizedEmail);
        }
        else
        {
            return principal;
        }

        var user = await query
            .Select(entity => new
            {
                entity.UserId,
                entity.Email,
                entity.Role,
            })
            .FirstOrDefaultAsync();

        if (user == null)
        {
            return principal;
        }

        var accessState = await _context.UserAccessControls
            .AsNoTracking()
            .Where(item => item.UserId == user.UserId)
            .Select(item => item.AccessState)
            .FirstOrDefaultAsync()
            ?? AdminAccessStates.Active;

        AddOrReplace(identity, AdminCapabilityClaims.PlatformRole, PlatformRoles.Normalize(user.Role));
        AddOrReplace(identity, AdminCapabilityClaims.AccessState, accessState);
        AddOrReplace(identity, ClaimTypes.Email, user.Email);

        var normalizedRole = PlatformRoles.Normalize(user.Role);
        if (PlatformRoles.IsAdminRole(normalizedRole) && !identity.HasClaim(ClaimTypes.Role, "Admin"))
        {
            identity.AddClaim(new Claim(ClaimTypes.Role, "Admin"));
        }

        if (!identity.HasClaim(ClaimTypes.Role, normalizedRole))
        {
            identity.AddClaim(new Claim(ClaimTypes.Role, normalizedRole));
        }

        RemoveAll(identity, AdminCapabilityClaims.Capability);
        foreach (var capability in AdminCapabilities.GetForRole(normalizedRole))
        {
            identity.AddClaim(new Claim(AdminCapabilityClaims.Capability, capability));
        }

        return principal;
    }

    private static void AddOrReplace(ClaimsIdentity identity, string claimType, string value)
    {
        RemoveAll(identity, claimType);
        identity.AddClaim(new Claim(claimType, value));
    }

    private static void RemoveAll(ClaimsIdentity identity, string claimType)
    {
        foreach (var claim in identity.FindAll(claimType).ToArray())
        {
            identity.RemoveClaim(claim);
        }
    }
}
