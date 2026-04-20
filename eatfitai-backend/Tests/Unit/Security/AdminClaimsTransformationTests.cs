using System.Security.Claims;
using EatFitAI.API.Data;
using EatFitAI.API.Models;
using EatFitAI.API.Security;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Security;

public sealed class AdminClaimsTransformationTests
{
    [Fact]
    public async Task TransformAsync_DoesNotBootstrapMissingAdminMembership()
    {
        await using var context = CreateContext();
        var transformation = new AdminClaimsTransformation(context);
        var principal = CreatePrincipal(
            userId: Guid.NewGuid().ToString(),
            email: "missing-admin@eatfit.ai",
            roleClaims: "Admin",
            platformRole: "super_admin");

        var transformed = await transformation.TransformAsync(principal);

        Assert.Empty(context.Users);
        Assert.DoesNotContain(transformed.Claims, claim =>
            claim.Type == ClaimTypes.Role && string.Equals(claim.Value, "Admin", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(transformed.Claims, claim => claim.Type == AdminCapabilityClaims.PlatformRole);
        Assert.DoesNotContain(transformed.Claims, claim => claim.Type == AdminCapabilityClaims.Capability);
    }

    [Fact]
    public async Task TransformAsync_UsesPersistedMembershipInsteadOfTokenClaims()
    {
        await using var context = CreateContext();
        var userId = Guid.NewGuid();
        context.Users.Add(new User
        {
            UserId = userId,
            Email = "auditor@eatfit.ai",
            DisplayName = "Auditor",
            CreatedAt = DateTime.UtcNow,
            EmailVerified = true,
            OnboardingCompleted = true,
            Role = PlatformRoles.ReadOnlyAuditor,
        });
        context.UserAccessControls.Add(new UserAccessControl
        {
            UserId = userId,
            AccessState = AdminAccessStates.Active,
            UpdatedAt = DateTime.UtcNow,
        });
        await context.SaveChangesAsync();

        var transformation = new AdminClaimsTransformation(context);
        var principal = CreatePrincipal(
            userId: userId.ToString(),
            email: "auditor@eatfit.ai",
            roleClaims: "Admin",
            platformRole: "super_admin");

        var transformed = await transformation.TransformAsync(principal);

        Assert.Equal(
            PlatformRoles.ReadOnlyAuditor,
            transformed.FindFirstValue(AdminCapabilityClaims.PlatformRole));
        Assert.Equal(
            AdminAccessStates.Active,
            transformed.FindFirstValue(AdminCapabilityClaims.AccessState));
        Assert.Contains(transformed.Claims, claim =>
            claim.Type == ClaimTypes.Role && claim.Value == PlatformRoles.ReadOnlyAuditor);
        Assert.DoesNotContain(transformed.Claims, claim =>
            claim.Type == ClaimTypes.Role && claim.Value == PlatformRoles.SuperAdmin);
        Assert.Contains(transformed.Claims, claim =>
            claim.Type == AdminCapabilityClaims.Capability && claim.Value == AdminCapabilities.AuditRead);
        Assert.DoesNotContain(transformed.Claims, claim =>
            claim.Type == AdminCapabilityClaims.Capability && claim.Value == AdminCapabilities.UsersWrite);
    }

    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"admin-claims-{Guid.NewGuid():N}")
            .Options;

        return new ApplicationDbContext(options);
    }

    private static ClaimsPrincipal CreatePrincipal(
        string userId,
        string email,
        string? roleClaims = null,
        string? platformRole = null)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new(ClaimTypes.Email, email),
        };

        if (!string.IsNullOrWhiteSpace(roleClaims))
        {
            claims.Add(new Claim(ClaimTypes.Role, roleClaims));
        }

        if (!string.IsNullOrWhiteSpace(platformRole))
        {
            claims.Add(new Claim(AdminCapabilityClaims.PlatformRole, platformRole));
        }

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));
    }
}
