using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using EatFitAI.API.Data;
using EatFitAI.API.Security;
using EatFitAI.API.Tests.Integration;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace EatFitAI.API.Tests.Integration.Controllers;

public class AdminUsersControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public AdminUsersControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = IntegrationTestHost.CreateFactory(
            factory,
            $"AdminUsersControllerTests_{Guid.NewGuid():N}");
    }

    [Fact]
    public async Task CreateUser_WithUserRole_CreatesVerifiedActiveUser()
    {
        var client = await CreateAdminClientAsync(PlatformRoles.SuperAdmin);
        var email = $"created_{Guid.NewGuid():N}@example.com";

        var response = await client.PostAsJsonAsync("/api/admin/users", new
        {
            email,
            displayName = "Created User",
            temporaryPassword = "TempPass123!",
            role = PlatformRoles.User,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await context.Users.SingleAsync(item => item.Email == email);
        var access = await context.UserAccessControls.SingleAsync(item => item.UserId == user.UserId);

        Assert.Equal("Created User", user.DisplayName);
        Assert.Equal(PlatformRoles.User, user.Role);
        Assert.True(user.EmailVerified);
        Assert.StartsWith("PBKDF2$", user.PasswordHash, StringComparison.Ordinal);
        Assert.Equal(AdminAccessStates.Active, access.AccessState);
    }

    [Fact]
    public async Task CreateUser_WithAdminRoleRequiresRoleManageCapability()
    {
        var client = await CreateAdminClientAsync(PlatformRoles.SupportAdmin);

        var response = await client.PostAsJsonAsync("/api/admin/users", new
        {
            email = $"blocked_role_{Guid.NewGuid():N}@example.com",
            displayName = "Blocked Role User",
            temporaryPassword = "TempPass123!",
            role = PlatformRoles.OpsAdmin,
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CreateUser_DuplicateEmail_ReturnsBadRequest()
    {
        var client = await CreateAdminClientAsync(PlatformRoles.SuperAdmin);
        var existingUserId = Guid.NewGuid();
        var email = $"duplicate_{existingUserId:N}@example.com";
        await IntegrationTestHost.EnsureAdminUserAsync(_factory.Services, existingUserId, email, "Existing User");

        var response = await client.PostAsJsonAsync("/api/admin/users", new
        {
            email,
            displayName = "Duplicate User",
            temporaryPassword = "TempPass123!",
            role = PlatformRoles.User,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateUser_ShortTemporaryPassword_ReturnsBadRequest()
    {
        var client = await CreateAdminClientAsync(PlatformRoles.SuperAdmin);

        var response = await client.PostAsJsonAsync("/api/admin/users", new
        {
            email = $"short_password_{Guid.NewGuid():N}@example.com",
            displayName = "Short Password User",
            temporaryPassword = "12345",
            role = PlatformRoles.User,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateUserProfile_UpdatesOnlyDisplayName()
    {
        var client = await CreateAdminClientAsync(PlatformRoles.SuperAdmin);
        var userId = Guid.NewGuid();
        await IntegrationTestHost.EnsureAdminUserAsync(
            _factory.Services,
            userId,
            $"profile_{userId:N}@example.com",
            "Before Name",
            PlatformRoles.User);

        var response = await client.PutAsJsonAsync($"/api/admin/users/{userId}", new
        {
            displayName = "After Name",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await context.Users.SingleAsync(item => item.UserId == userId);
        Assert.Equal("After Name", user.DisplayName);
        Assert.Equal(PlatformRoles.User, user.Role);
    }

    [Fact]
    public async Task UpdateAccessState_RequiresConfirmationAndJustification()
    {
        var client = await CreateAdminClientAsync(PlatformRoles.SuperAdmin);
        var userId = Guid.NewGuid();
        var email = $"guard_{userId:N}@example.com";
        await IntegrationTestHost.EnsureAdminUserAsync(_factory.Services, userId, email, "Guard User", PlatformRoles.User);

        var missingJustificationResponse = await client.PutAsJsonAsync($"/api/admin/users/{userId}/access-state", new
        {
            accessState = AdminAccessStates.Suspended,
            confirmText = $"USER:{email}:SUSPENDED",
        });

        Assert.Equal(HttpStatusCode.BadRequest, missingJustificationResponse.StatusCode);

        var wrongConfirmResponse = await client.PutAsJsonAsync($"/api/admin/users/{userId}/access-state", new
        {
            accessState = AdminAccessStates.Suspended,
            confirmText = "WRONG",
            justification = "Testing access-state guard.",
        });

        Assert.Equal(HttpStatusCode.BadRequest, wrongConfirmResponse.StatusCode);
    }

    [Fact]
    public async Task UpdateAccessState_CannotSuspendSelf()
    {
        var adminId = Guid.NewGuid();
        var email = $"self_{adminId:N}@example.com";
        await IntegrationTestHost.EnsureAdminUserAsync(_factory.Services, adminId, email, "Self Admin", PlatformRoles.SuperAdmin);
        var client = CreateAuthorizedClient(adminId, email, "Self Admin", PlatformRoles.SuperAdmin);

        var response = await client.PutAsJsonAsync($"/api/admin/users/{adminId}/access-state", new
        {
            accessState = AdminAccessStates.Suspended,
            confirmText = $"USER:{email}:SUSPENDED",
            justification = "Testing self-protection.",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateUserRole_CannotSelfDemoteOutOfAdminAccess()
    {
        var adminId = Guid.NewGuid();
        var email = $"demote_{adminId:N}@example.com";
        await IntegrationTestHost.EnsureAdminUserAsync(_factory.Services, adminId, email, "Self Demote", PlatformRoles.SuperAdmin);
        var client = CreateAuthorizedClient(adminId, email, "Self Demote", PlatformRoles.SuperAdmin);

        var response = await client.PutAsJsonAsync($"/api/admin/users/{adminId}/role", new
        {
            role = PlatformRoles.User,
            justification = "Testing self-demotion guard.",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DeleteUser_LegacyEndpointRemainsGone()
    {
        var client = await CreateAdminClientAsync(PlatformRoles.SuperAdmin);
        var userId = Guid.NewGuid();
        await IntegrationTestHost.EnsureAdminUserAsync(
            _factory.Services,
            userId,
            $"delete_{userId:N}@example.com",
            "Delete Guard",
            PlatformRoles.User);

        var response = await client.DeleteAsync($"/api/admin/users/{userId}");

        Assert.Equal(HttpStatusCode.Gone, response.StatusCode);
    }

    private async Task<HttpClient> CreateAdminClientAsync(string role)
    {
        var userId = Guid.NewGuid();
        var email = $"admin_{role}_{userId:N}@example.com";
        await IntegrationTestHost.EnsureAdminUserAsync(_factory.Services, userId, email, "Admin User", role);
        return CreateAuthorizedClient(userId, email, "Admin User", role);
    }

    private HttpClient CreateAuthorizedClient(Guid userId, string email, string displayName, string role)
    {
        var client = _factory.CreateClient();
        var token = IntegrationTestHost.CreateJwtToken(
            _factory.Services,
            userId,
            email,
            displayName,
            role);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
