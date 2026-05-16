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

    public static string SchemaSql => """
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

            ALTER TABLE "PasswordResetCode" ENABLE ROW LEVEL SECURITY;
            REVOKE ALL ON TABLE "PasswordResetCode" FROM anon, authenticated;

            NOTIFY pgrst, 'reload schema';
            """;

    public async Task EnsureSchemaAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await _context.Database.ExecuteSqlRawAsync(
                SchemaSql,
                parameters: Array.Empty<object>(),
                cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Unable to ensure auth infrastructure schema.");
            throw;
        }
    }
}
