using System.Security.Claims;
using EatFitAI.API.Data;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Controllers;

[Route("api/admin/auth")]
[ApiController]
[Authorize]
public sealed class AdminAuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AdminAuthController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("compatibility")]
    public async Task<ActionResult<AdminAuthCompatibilityDto>> GetCompatibility()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        var email = User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue("email");

        Models.User? user = null;
        if (Guid.TryParse(userIdClaim, out var userId))
        {
            user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.UserId == userId);
        }

        if (user == null && !string.IsNullOrWhiteSpace(email))
        {
            var normalizedEmail = email.Trim();
            user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Email == normalizedEmail);
        }

        if (user == null)
        {
            return Ok(new AdminAuthCompatibilityDto
            {
                Ok = false,
                Reason = "membership_missing",
                Detail = "No seeded admin membership matched the authenticated user.",
                Email = email,
                RequestId = HttpContext.TraceIdentifier,
            });
        }

        var role = PlatformRoles.Normalize(user.Role);
        var accessControl = await _context.UserAccessControls
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.UserId == user.UserId);
        var accessState = accessControl?.AccessState ?? AdminAccessStates.Active;
        var capabilities = AdminCapabilities.GetForRole(role).ToList();

        if (!PlatformRoles.IsAdminRole(role))
        {
            return Ok(new AdminAuthCompatibilityDto
            {
                Ok = false,
                Reason = "role_not_admin",
                Detail = "The authenticated user exists in the backend but does not have an admin platform role.",
                UserId = user.UserId,
                Email = user.Email,
                PlatformRole = role,
                AccessState = accessState,
                Capabilities = capabilities,
                RequestId = HttpContext.TraceIdentifier,
            });
        }

        if (!string.Equals(accessState, AdminAccessStates.Active, StringComparison.OrdinalIgnoreCase))
        {
            return Ok(new AdminAuthCompatibilityDto
            {
                Ok = false,
                Reason = "access_inactive",
                Detail = $"Admin membership exists but access state is {accessState}.",
                UserId = user.UserId,
                Email = user.Email,
                PlatformRole = role,
                AccessState = accessState,
                Capabilities = capabilities,
                RequestId = HttpContext.TraceIdentifier,
            });
        }

        return Ok(new AdminAuthCompatibilityDto
        {
            Ok = true,
            Reason = "ok",
            UserId = user.UserId,
            Email = user.Email,
            PlatformRole = role,
            AccessState = accessState,
            Capabilities = capabilities,
            RequestId = HttpContext.TraceIdentifier,
        });
    }
}
