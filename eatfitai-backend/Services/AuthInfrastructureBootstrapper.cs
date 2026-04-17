using EatFitAI.API.Data;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public sealed class AuthInfrastructureBootstrapper
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AuthInfrastructureBootstrapper> _logger;

    public AuthInfrastructureBootstrapper(
        ApplicationDbContext context,
        ILogger<AuthInfrastructureBootstrapper> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task EnsureSchemaAsync(CancellationToken cancellationToken = default)
    {
        const string sql = """
            CREATE TABLE IF NOT EXISTS "PasswordResetCode" (
                "UserId" uuid PRIMARY KEY,
                "CodeHash" varchar(88) NOT NULL,
                "ExpiresAt" timestamp with time zone NOT NULL,
                "ConsumedAt" timestamp with time zone NULL,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
            );

            CREATE INDEX IF NOT EXISTS "IX_PasswordResetCode_ExpiresAt"
            ON "PasswordResetCode" ("ExpiresAt");

            CREATE INDEX IF NOT EXISTS "IX_PasswordResetCode_ConsumedAt"
            ON "PasswordResetCode" ("ConsumedAt");
            """;

        try
        {
            await _context.Database.ExecuteSqlRawAsync(sql, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Unable to ensure auth infrastructure schema.");
            throw;
        }
    }
}
