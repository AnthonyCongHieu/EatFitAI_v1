using System.Security.Claims;
using EatFitAI.API.Data;
using EatFitAI.API.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Npgsql;

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

        AdminUserProjection? user = null;
        if (Guid.TryParse(userId, out var parsedUserId))
        {
            user = await TryResolveUserAsync(_context.Users
                .AsNoTracking()
                .Where(item => item.UserId == parsedUserId));
        }

        if (user == null && !string.IsNullOrWhiteSpace(email))
        {
            var normalizedEmail = email.Trim();
            user = await TryResolveUserAsync(_context.Users
                .AsNoTracking()
                .Where(item => item.Email == normalizedEmail));
        }

        if (user == null)
        {
            user = await EnsureAdminUserProjectionAsync(principal, userId, email);
        }

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

        var normalizedRole = PlatformRoles.ResolveEffectiveRole(principal, user.Role);

        AddOrReplace(identity, AdminCapabilityClaims.PlatformRole, normalizedRole);
        AddOrReplace(identity, AdminCapabilityClaims.AccessState, accessState);
        AddOrReplace(identity, ClaimTypes.Email, user.Email);

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

    private static async Task<AdminUserProjection?> TryResolveUserAsync(IQueryable<User> query)
    {
        try
        {
            return await query
                .Select(entity => new AdminUserProjection
                {
                    UserId = entity.UserId,
                    Email = entity.Email,
                    Role = entity.Role,
                })
                .FirstOrDefaultAsync();
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UndefinedColumn)
        {
            return await query
                .Select(entity => new AdminUserProjection
                {
                    UserId = entity.UserId,
                    Email = entity.Email,
                    Role = null,
                })
                .FirstOrDefaultAsync();
        }
    }

    private async Task<AdminUserProjection?> EnsureAdminUserProjectionAsync(
        ClaimsPrincipal principal,
        string? userId,
        string? email)
    {
        var bootstrapRole = PlatformRoles.ResolveRoleFromClaims(principal);
        if (!PlatformRoles.IsAdminRole(bootstrapRole)
            || !Guid.TryParse(userId, out var parsedUserId)
            || string.IsNullOrWhiteSpace(email))
        {
            return null;
        }

        var normalizedEmail = email.Trim();
        var existingUser = await TryResolveUserAsync(_context.Users
            .AsNoTracking()
            .Where(item => item.UserId == parsedUserId || item.Email == normalizedEmail));
        if (existingUser != null)
        {
            return existingUser;
        }

        var now = DateTime.UtcNow;
        _context.Users.Add(new User
        {
            UserId = parsedUserId,
            Email = normalizedEmail,
            DisplayName = principal.FindFirstValue(ClaimTypes.Name) ?? normalizedEmail,
            CreatedAt = now,
            EmailVerified = true,
            OnboardingCompleted = true,
            Role = bootstrapRole,
        });

        if (!await _context.UserAccessControls.AnyAsync(item => item.UserId == parsedUserId))
        {
            _context.UserAccessControls.Add(new UserAccessControl
            {
                UserId = parsedUserId,
                AccessState = AdminAccessStates.Active,
                UpdatedAt = now,
            });
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            _context.ChangeTracker.Clear();
        }

        return await TryResolveUserAsync(_context.Users
            .AsNoTracking()
            .Where(item => item.UserId == parsedUserId || item.Email == normalizedEmail));
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

    private sealed class AdminUserProjection
    {
        public Guid UserId { get; init; }
        public string Email { get; init; } = string.Empty;
        public string? Role { get; init; }
    }
}
