using EatFitAI.API.Data;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public sealed class ProductSchemaBootstrapper
{
    private static readonly SemaphoreSlim SchemaInitLock = new(1, 1);
    private static bool _schemaInitialized;

    private readonly ApplicationDbContext _context;
    private readonly ILogger<ProductSchemaBootstrapper> _logger;

    public ProductSchemaBootstrapper(
        ApplicationDbContext context,
        ILogger<ProductSchemaBootstrapper> logger)
    {
        _context = context;
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
            "CreatedAt" timestamp without time zone NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC'
        );

        CREATE INDEX IF NOT EXISTS "IX_TelemetryEvent_OccurredAt"
            ON "TelemetryEvent" ("OccurredAt");

        CREATE INDEX IF NOT EXISTS "IX_TelemetryEvent_UserId_OccurredAt"
            ON "TelemetryEvent" ("UserId", "OccurredAt");

        CREATE INDEX IF NOT EXISTS "IX_TelemetryEvent_Category_OccurredAt"
            ON "TelemetryEvent" ("Category", "OccurredAt");

        NOTIFY pgrst, 'reload schema';
        """;

    public async Task EnsureSchemaAsync(CancellationToken cancellationToken = default)
    {
        if (_schemaInitialized || !_context.Database.IsRelational())
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
