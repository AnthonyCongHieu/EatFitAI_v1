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
            ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "Role" varchar(80) NULL;
            ALTER TABLE "Users" ALTER COLUMN "Role" SET DEFAULT 'user';
            CREATE INDEX IF NOT EXISTS "IX_Users_Role"
            ON "Users" ("Role");

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

            ALTER TABLE "GeminiKeys" ENABLE ROW LEVEL SECURITY;
            ALTER TABLE "AiCorrectionEvent" ENABLE ROW LEVEL SECURITY;
            ALTER TABLE "AdminAuditEvent" ENABLE ROW LEVEL SECURITY;
            ALTER TABLE "UserAccessControl" ENABLE ROW LEVEL SECURITY;

            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.role_table_grants
                    WHERE table_schema = 'public'
                      AND table_name = 'GeminiKeys'
                      AND grantee IN ('anon', 'authenticated')
                ) THEN
                    EXECUTE 'REVOKE ALL ON TABLE "GeminiKeys" FROM anon, authenticated';
                END IF;
            END $$;

            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.role_table_grants
                    WHERE table_schema = 'public'
                      AND table_name = 'AdminAuditEvent'
                      AND grantee IN ('anon', 'authenticated')
                ) THEN
                    EXECUTE 'REVOKE ALL ON TABLE "AdminAuditEvent" FROM anon, authenticated';
                END IF;
            END $$;

            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.role_table_grants
                    WHERE table_schema = 'public'
                      AND table_name = 'UserAccessControl'
                      AND grantee IN ('anon', 'authenticated')
                ) THEN
                    EXECUTE 'REVOKE ALL ON TABLE "UserAccessControl" FROM anon, authenticated';
                END IF;
            END $$;

            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_policies
                    WHERE schemaname = 'public'
                      AND tablename = 'AiCorrectionEvent'
                      AND policyname = 'AiCorrectionEvent_authenticated_own_read'
                ) THEN
                    CREATE POLICY "AiCorrectionEvent_authenticated_own_read"
                    ON "AiCorrectionEvent"
                    FOR SELECT
                    TO authenticated
                    USING (auth.uid() = "UserId");
                END IF;
            END $$;

            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_policies
                    WHERE schemaname = 'public'
                      AND tablename = 'AiCorrectionEvent'
                      AND policyname = 'AiCorrectionEvent_authenticated_own_write'
                ) THEN
                    CREATE POLICY "AiCorrectionEvent_authenticated_own_write"
                    ON "AiCorrectionEvent"
                    FOR INSERT
                    TO authenticated
                    WITH CHECK (auth.uid() = "UserId");
                END IF;
            END $$;

            NOTIFY pgrst, 'reload schema';
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
