using EatFitAI.API.Data;
using EatFitAI.API.Options;
using EatFitAI.API.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace EatFitAI.API.Services;

public sealed class AdminGovernanceBootstrapper
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AdminGovernanceBootstrapper> _logger;
    private readonly AdminGovernanceOptions _options;
    private readonly IHostEnvironment _environment;

    public AdminGovernanceBootstrapper(
        ApplicationDbContext context,
        ILogger<AdminGovernanceBootstrapper> logger,
        IOptions<AdminGovernanceOptions> options,
        IHostEnvironment environment)
    {
        _context = context;
        _logger = logger;
        _options = options.Value;
        _environment = environment;
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
            await EnsureExistingAdminAccessRowsAsync(cancellationToken);
            await EnsureSeedMembershipsAsync(cancellationToken);
            await BackfillLegacyAuditRowsAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Unable to ensure admin governance schema.");
        }
    }

    private async Task EnsureExistingAdminAccessRowsAsync(CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO "UserAccessControl" ("UserId", "AccessState", "UpdatedAt")
            SELECT "UserId", 'active', NOW() AT TIME ZONE 'UTC'
            FROM "Users" AS users
            WHERE COALESCE(users."Role", 'user') <> 'user'
              AND NOT EXISTS (
                  SELECT 1
                  FROM "UserAccessControl" AS access
                  WHERE access."UserId" = users."UserId"
              );
            """;

        await _context.Database.ExecuteSqlRawAsync(sql, cancellationToken);
    }

    private async Task EnsureSeedMembershipsAsync(CancellationToken cancellationToken)
    {
        if (_options.SeedMemberships.Count == 0)
        {
            return;
        }

        foreach (var seed in _options.SeedMemberships)
        {
            if (string.IsNullOrWhiteSpace(seed.Email))
            {
                continue;
            }

            var normalizedEmail = seed.Email.Trim();
            var normalizedRole = PlatformRoles.Normalize(seed.Role);
            var normalizedAccessState = NormalizeAccessState(seed.AccessState);
            var provisionedUserId = Guid.Empty;
            var canProvision = seed.ProvisionIfMissing && Guid.TryParse(seed.UserId, out provisionedUserId);

            if (!PlatformRoles.IsAdminRole(normalizedRole))
            {
                _logger.LogWarning(
                    "Skipping configured admin membership seed for {Email} because role {Role} is not an admin role.",
                    normalizedEmail,
                    seed.Role);
                continue;
            }

            Models.User? user = null;
            if (Guid.TryParse(seed.UserId, out var seededUserId))
            {
                user = await _context.Users.FirstOrDefaultAsync(
                    item => item.UserId == seededUserId,
                    cancellationToken);
            }

            user ??= await _context.Users.FirstOrDefaultAsync(
                item => item.Email == normalizedEmail,
                cancellationToken);

            if (user == null)
            {
                if (!canProvision)
                {
                    _logger.LogWarning(
                        "Configured admin membership for {Email} was skipped because no matching user exists and no provisionable UserId was supplied.",
                        normalizedEmail);
                    continue;
                }

                user = new Models.User
                {
                    UserId = provisionedUserId,
                    Email = normalizedEmail,
                    DisplayName = string.IsNullOrWhiteSpace(seed.DisplayName) ? normalizedEmail : seed.DisplayName.Trim(),
                    CreatedAt = DateTime.UtcNow,
                    EmailVerified = true,
                    OnboardingCompleted = true,
                    Role = normalizedRole,
                };
                _context.Users.Add(user);
            }
            else
            {
                user.Email = normalizedEmail;
                if (!string.IsNullOrWhiteSpace(seed.DisplayName) && string.IsNullOrWhiteSpace(user.DisplayName))
                {
                    user.DisplayName = seed.DisplayName.Trim();
                }

                user.Role = normalizedRole;
            }

            var accessControl = await _context.UserAccessControls.FirstOrDefaultAsync(
                item => item.UserId == user.UserId,
                cancellationToken);
            if (accessControl == null)
            {
                accessControl = new Models.UserAccessControl
                {
                    UserId = user.UserId,
                };
                _context.UserAccessControls.Add(accessControl);
            }

            accessControl.AccessState = normalizedAccessState;
            accessControl.UpdatedAt = DateTime.UtcNow;
            if (normalizedAccessState == AdminAccessStates.Active)
            {
                accessControl.SuspendedAt = null;
                accessControl.SuspendedReason = null;
                accessControl.SuspendedBy = null;
                accessControl.DeactivatedAt = null;
                accessControl.DeactivatedBy = null;
            }

            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task BackfillLegacyAuditRowsAsync(CancellationToken cancellationToken)
    {
        var environmentName = string.IsNullOrWhiteSpace(_environment.EnvironmentName)
            ? "unknown"
            : _environment.EnvironmentName;

        await _context.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE "AdminAuditEvent"
            SET "ActorEmail" = COALESCE("ActorEmail", CASE WHEN "Actor" LIKE '%@%' THEN "Actor" ELSE NULL END),
                "Severity" = COALESCE("Severity", CASE WHEN LOWER(COALESCE("Outcome", '')) = 'failed' THEN 'warning' ELSE 'info' END),
                "CorrelationId" = COALESCE("CorrelationId", "RequestId"),
                "Environment" = COALESCE("Environment", {environmentName})
            WHERE "ActorEmail" IS NULL
               OR "Severity" IS NULL
               OR "CorrelationId" IS NULL
               OR "Environment" IS NULL;
            """, cancellationToken);

        const string actorBackfillSql = """
            UPDATE "AdminAuditEvent" AS audit
            SET "ActorId" = COALESCE(audit."ActorId", users."UserId"::text),
                "EffectiveRole" = COALESCE(audit."EffectiveRole", users."Role")
            FROM "Users" AS users
            WHERE (audit."ActorId" IS NULL OR audit."EffectiveRole" IS NULL)
              AND audit."ActorEmail" IS NOT NULL
              AND lower(users."Email") = lower(audit."ActorEmail");
            """;

        await _context.Database.ExecuteSqlRawAsync(actorBackfillSql, cancellationToken);
    }

    private static string NormalizeAccessState(string? accessState)
    {
        return accessState?.Trim().ToLowerInvariant() switch
        {
            AdminAccessStates.Suspended => AdminAccessStates.Suspended,
            AdminAccessStates.Deactivated => AdminAccessStates.Deactivated,
            _ => AdminAccessStates.Active,
        };
    }
}
