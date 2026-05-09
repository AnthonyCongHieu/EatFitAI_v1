using EatFitAI.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace EatFitAI.API.Services;

public sealed class ProductSchemaBootstrapper
{
    private static readonly SemaphoreSlim SchemaInitLock = new(1, 1);
    private static bool _schemaInitialized;

    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<ProductSchemaBootstrapper> _logger;

    public ProductSchemaBootstrapper(
        ApplicationDbContext context,
        IConfiguration configuration,
        IHostEnvironment environment,
        ILogger<ProductSchemaBootstrapper> logger)
    {
        _context = context;
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public static string SchemaSql => """
        ALTER TABLE IF EXISTS "FoodItem"
            ADD COLUMN IF NOT EXISTS "Barcode" varchar(64) NULL;

        CREATE INDEX IF NOT EXISTS "IX_FoodItem_Barcode_Active"
            ON "FoodItem" ("Barcode")
            WHERE "Barcode" IS NOT NULL AND "IsDeleted" = false AND "IsActive" = true;

        CREATE TABLE IF NOT EXISTS "TelemetryEvent" (
            "TelemetryEventId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "UserId" uuid NULL REFERENCES "Users" ("UserId") ON DELETE SET NULL,
            "Name" varchar(120) NOT NULL,
            "Category" varchar(60) NOT NULL,
            "OccurredAt" timestamp without time zone NOT NULL,
            "Screen" varchar(120) NULL,
            "Flow" varchar(120) NULL,
            "Step" varchar(120) NULL,
            "Status" varchar(60) NULL,
            "SessionId" varchar(120) NULL,
            "MetadataJson" text NULL,
            "RequestId" varchar(120) NULL,
            "CreatedAt" timestamp without time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
        );

        CREATE INDEX IF NOT EXISTS "IX_TelemetryEvent_OccurredAt"
            ON "TelemetryEvent" ("OccurredAt");

        CREATE INDEX IF NOT EXISTS "IX_TelemetryEvent_UserId_OccurredAt"
            ON "TelemetryEvent" ("UserId", "OccurredAt");

        CREATE INDEX IF NOT EXISTS "IX_TelemetryEvent_Category_OccurredAt"
            ON "TelemetryEvent" ("Category", "OccurredAt");

        DO $$
        BEGIN
            IF to_regclass('public."WaterIntake"') IS NOT NULL THEN
                EXECUTE 'ALTER TABLE "WaterIntake" ENABLE ROW LEVEL SECURITY';
                EXECUTE 'REVOKE ALL ON TABLE "WaterIntake" FROM anon, authenticated';
                EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "WaterIntake" TO authenticated';

                IF to_regclass('public."WaterIntake_WaterIntakeId_seq"') IS NOT NULL THEN
                    EXECUTE 'REVOKE ALL ON SEQUENCE "WaterIntake_WaterIntakeId_seq" FROM anon, authenticated';
                    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE "WaterIntake_WaterIntakeId_seq" TO authenticated';
                END IF;

                EXECUTE 'DROP POLICY IF EXISTS "WaterIntake_authenticated_own_read" ON "WaterIntake"';
                EXECUTE 'CREATE POLICY "WaterIntake_authenticated_own_read"
                    ON "WaterIntake"
                    FOR SELECT
                    TO authenticated
                    USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = "UserId")';

                EXECUTE 'DROP POLICY IF EXISTS "WaterIntake_authenticated_own_insert" ON "WaterIntake"';
                EXECUTE 'CREATE POLICY "WaterIntake_authenticated_own_insert"
                    ON "WaterIntake"
                    FOR INSERT
                    TO authenticated
                    WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = "UserId")';

                EXECUTE 'DROP POLICY IF EXISTS "WaterIntake_authenticated_own_update" ON "WaterIntake"';
                EXECUTE 'CREATE POLICY "WaterIntake_authenticated_own_update"
                    ON "WaterIntake"
                    FOR UPDATE
                    TO authenticated
                    USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = "UserId")
                    WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = "UserId")';

                EXECUTE 'DROP POLICY IF EXISTS "WaterIntake_authenticated_own_delete" ON "WaterIntake"';
                EXECUTE 'CREATE POLICY "WaterIntake_authenticated_own_delete"
                    ON "WaterIntake"
                    FOR DELETE
                    TO authenticated
                    USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = "UserId")';
            END IF;

            IF to_regclass('public."TelemetryEvent"') IS NOT NULL THEN
                EXECUTE 'ALTER TABLE "TelemetryEvent" ENABLE ROW LEVEL SECURITY';
                EXECUTE 'REVOKE ALL ON TABLE "TelemetryEvent" FROM anon, authenticated';
                EXECUTE 'GRANT INSERT ON TABLE "TelemetryEvent" TO authenticated';

                EXECUTE 'DROP POLICY IF EXISTS "TelemetryEvent_authenticated_own_insert" ON "TelemetryEvent"';
                EXECUTE 'CREATE POLICY "TelemetryEvent_authenticated_own_insert"
                    ON "TelemetryEvent"
                    FOR INSERT
                    TO authenticated
                    WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = "UserId")';
            END IF;

            IF to_regclass('public."GeminiProviderState"') IS NOT NULL THEN
                EXECUTE 'ALTER TABLE "GeminiProviderState" ENABLE ROW LEVEL SECURITY';
                EXECUTE 'REVOKE ALL ON TABLE "GeminiProviderState" FROM anon, authenticated';
            END IF;

            IF to_regclass('public."__EFMigrationsHistory"') IS NOT NULL THEN
                EXECUTE 'ALTER TABLE "__EFMigrationsHistory" ENABLE ROW LEVEL SECURITY';
                EXECUTE 'REVOKE ALL ON TABLE "__EFMigrationsHistory" FROM anon, authenticated';
            END IF;
        END $$;

        NOTIFY pgrst, 'reload schema';
        """;

    public async Task EnsureSchemaAsync(CancellationToken cancellationToken = default, bool force = false)
    {
        if (_schemaInitialized || !_context.Database.IsRelational())
        {
            return;
        }

        if (!SchemaBootstrapStartupGate.ShouldAllowRuntimeRepair(_configuration, _environment, force))
        {
            return;
        }

        await SchemaInitLock.WaitAsync(cancellationToken);
        try
        {
            if (_schemaInitialized || !_context.Database.IsRelational())
            {
                return;
            }

            if (!SchemaBootstrapStartupGate.ShouldAllowRuntimeRepair(_configuration, _environment, force))
            {
                return;
            }

            await _context.Database.ExecuteSqlRawAsync(SchemaSql, cancellationToken);
            _schemaInitialized = true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Unable to ensure product schema drift repair.");
            throw;
        }
        finally
        {
            SchemaInitLock.Release();
        }
    }
}
