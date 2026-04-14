using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using EatFitAI.API.Data;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.Security;
using EatFitAI.API.Services;
using AdminUser = EatFitAI.API.Models.User;
using AdminUserAccessControl = EatFitAI.API.Models.UserAccessControl;
using AppUser = EatFitAI.API.DbScaffold.Models.User;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;

namespace EatFitAI.API.Tests.Integration;

internal static class IntegrationTestHost
{
    internal const string TestJwtKey = "test-secret-key-for-integration-tests-12345";

    internal static WebApplicationFactory<Program> CreateFactory(
        WebApplicationFactory<Program> baseFactory,
        string databaseName)
    {
        Environment.SetEnvironmentVariable("Jwt__Key", TestJwtKey);
        Environment.SetEnvironmentVariable("Jwt__Issuer", "EatFitAI");
        Environment.SetEnvironmentVariable("Jwt__Audience", "EatFitAI");

        return baseFactory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Staging");
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Jwt:Key"] = TestJwtKey,
                    ["Jwt:Issuer"] = "EatFitAI",
                    ["Jwt:Audience"] = "EatFitAI",
                    ["ConnectionStrings:DefaultConnection"] = "Host=127.0.0.1;Port=5432;Database=eatfitai_integration;Username=test;Password=test"
                });
            });

            builder.ConfigureServices(services =>
            {
                RemoveDbContextRegistration<EatFitAIDbContext>(services);
                RemoveDbContextRegistration<ApplicationDbContext>(services);
                RemoveHostedService<AiHealthBackgroundService>(services);
                RemoveHostedService<AdminRuntimeSnapshotBackgroundService>(services);

                var inMemoryProvider = new ServiceCollection()
                    .AddEntityFrameworkInMemoryDatabase()
                    .BuildServiceProvider();
                var appDatabaseName = $"{databaseName}_app";
                var adminDatabaseName = $"{databaseName}_admin";

                services.AddDbContext<EatFitAIDbContext>(options =>
                {
                    options.UseInMemoryDatabase(appDatabaseName);
                    options.EnableSensitiveDataLogging();
                    options.UseInternalServiceProvider(inMemoryProvider);
                });

                services.AddDbContext<ApplicationDbContext>(options =>
                {
                    options.UseInMemoryDatabase(adminDatabaseName);
                    options.EnableSensitiveDataLogging();
                    options.UseInternalServiceProvider(inMemoryProvider);
                });
            });
        });
    }

    internal static string CreateJwtToken(
        IServiceProvider services,
        Guid userId,
        string email,
        string displayName,
        string? role = null,
        string? accessState = null,
        IEnumerable<string>? capabilities = null,
        IEnumerable<Claim>? extraClaims = null)
    {
        using var scope = services.CreateScope();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        var jwtKey = configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key is missing for integration tests.");
        var issuer = configuration["Jwt:Issuer"] ?? "EatFitAI";
        var audience = configuration["Jwt:Audience"] ?? "EatFitAI";
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Name, displayName)
        };

        if (!string.IsNullOrWhiteSpace(role))
        {
            var normalizedRole = PlatformRoles.Normalize(role);
            claims.Add(new Claim(ClaimTypes.Role, normalizedRole));
            claims.Add(new Claim(AdminCapabilityClaims.PlatformRole, normalizedRole));

            if (PlatformRoles.IsAdminRole(normalizedRole))
            {
                claims.Add(new Claim(ClaimTypes.Role, "Admin"));
            }

            foreach (var capability in capabilities ?? AdminCapabilities.GetForRole(normalizedRole))
            {
                claims.Add(new Claim(AdminCapabilityClaims.Capability, capability));
            }
        }

        if (!string.IsNullOrWhiteSpace(accessState))
        {
            claims.Add(new Claim(AdminCapabilityClaims.AccessState, accessState));
        }

        if (extraClaims != null)
        {
            claims.AddRange(extraClaims);
        }

        var tokenHandler = new JwtSecurityTokenHandler();
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Issuer = issuer,
            Audience = audience,
            Expires = DateTime.UtcNow.AddHours(1),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtKey)),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    internal static async Task EnsureAppUserAsync(
        IServiceProvider services,
        Guid userId,
        string email,
        string displayName,
        string? passwordHash = "test",
        string? role = null)
    {
        using var scope = services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();

        if (await context.Users.AnyAsync(item => item.UserId == userId))
        {
            return;
        }

        await context.Users.AddAsync(new AppUser
        {
            UserId = userId,
            Email = email,
            DisplayName = displayName,
            PasswordHash = passwordHash,
            CreatedAt = DateTime.UtcNow,
            EmailVerified = true,
            OnboardingCompleted = true,
            Role = PlatformRoles.Normalize(role)
        });

        await context.SaveChangesAsync();
    }

    internal static async Task EnsureAdminUserAsync(
        IServiceProvider services,
        Guid userId,
        string email,
        string displayName,
        string? role = null)
    {
        using var scope = services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        if (await context.Users.AnyAsync(item => item.UserId == userId))
        {
            return;
        }

        await context.Users.AddAsync(new AdminUser
        {
            UserId = userId,
            Email = email,
            DisplayName = displayName,
            CreatedAt = DateTime.UtcNow,
            EmailVerified = true,
            OnboardingCompleted = true,
            Role = PlatformRoles.Normalize(role)
        });

        await context.SaveChangesAsync();
    }

    internal static async Task EnsureAdminAccessAsync(
        IServiceProvider services,
        Guid userId,
        string accessState = AdminAccessStates.Active)
    {
        using var scope = services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var control = await context.UserAccessControls.FirstOrDefaultAsync(item => item.UserId == userId);

        if (control == null)
        {
            await context.UserAccessControls.AddAsync(new AdminUserAccessControl
            {
                UserId = userId,
                AccessState = accessState,
                UpdatedAt = DateTime.UtcNow,
            });
        }
        else
        {
            control.AccessState = accessState;
            control.UpdatedAt = DateTime.UtcNow;
        }

        await context.SaveChangesAsync();
    }

    internal static async Task EnsureUserExistsInBothContextsAsync(
        IServiceProvider services,
        Guid userId,
        string email,
        string displayName,
        string? role = null,
        string accessState = AdminAccessStates.Active)
    {
        await EnsureAppUserAsync(services, userId, email, displayName, role: role);
        await EnsureAdminUserAsync(services, userId, email, displayName, role);
        await EnsureAdminAccessAsync(services, userId, accessState);
    }

    private static void RemoveDbContextRegistration<TContext>(IServiceCollection services)
        where TContext : DbContext
    {
        services.RemoveAll<DbContextOptions<TContext>>();
        services.RemoveAll<TContext>();
    }

    private static void RemoveHostedService<THostedService>(IServiceCollection services)
        where THostedService : class, IHostedService
    {
        foreach (var descriptor in services
                     .Where(item => item.ServiceType == typeof(IHostedService)
                                    && item.ImplementationType == typeof(THostedService))
                     .ToArray())
        {
            services.Remove(descriptor);
        }
    }
}
