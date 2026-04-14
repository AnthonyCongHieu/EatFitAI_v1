using EatFitAI.API.Data;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public sealed class AdminGovernanceBootstrapper
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AdminGovernanceBootstrapper> _logger;

    public AdminGovernanceBootstrapper(ApplicationDbContext context, ILogger<AdminGovernanceBootstrapper> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task EnsureSchemaAsync(CancellationToken cancellationToken = default)
    {
        const string sql = """
            CREATE TABLE IF NOT EXISTS "UserAccessControl" (
                "UserId" uuid PRIMARY KEY,
                "AccessState" varchar(40) NOT NULL DEFAULT 'active',
                "SuspendedAt" timestamp with time zone NULL,
                "SuspendedReason" text NULL,
                "SuspendedBy" varchar(256) NULL,
                "DeactivatedAt" timestamp with time zone NULL,
                "DeactivatedBy" varchar(256) NULL,
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
            );

            CREATE INDEX IF NOT EXISTS "IX_UserAccessControl_AccessState"
            ON "UserAccessControl" ("AccessState");

            ALTER TABLE "AdminAuditEvent" ADD COLUMN IF NOT EXISTS "ActorId" varchar(120) NULL;
            ALTER TABLE "AdminAuditEvent" ADD COLUMN IF NOT EXISTS "ActorEmail" varchar(256) NULL;
            ALTER TABLE "AdminAuditEvent" ADD COLUMN IF NOT EXISTS "EffectiveRole" varchar(80) NULL;
            ALTER TABLE "AdminAuditEvent" ADD COLUMN IF NOT EXISTS "CapabilitySnapshot" text NULL;
            ALTER TABLE "AdminAuditEvent" ADD COLUMN IF NOT EXISTS "Severity" varchar(40) NULL;
            ALTER TABLE "AdminAuditEvent" ADD COLUMN IF NOT EXISTS "CorrelationId" varchar(120) NULL;
            ALTER TABLE "AdminAuditEvent" ADD COLUMN IF NOT EXISTS "Environment" varchar(80) NULL;
            ALTER TABLE "AdminAuditEvent" ADD COLUMN IF NOT EXISTS "DiffSummary" text NULL;
            ALTER TABLE "AdminAuditEvent" ADD COLUMN IF NOT EXISTS "Justification" text NULL;

            CREATE INDEX IF NOT EXISTS "IX_AdminAuditEvent_CorrelationId"
            ON "AdminAuditEvent" ("CorrelationId");
            """;

        try
        {
            await _context.Database.ExecuteSqlRawAsync(sql, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Unable to ensure admin governance schema.");
        }
    }
}
