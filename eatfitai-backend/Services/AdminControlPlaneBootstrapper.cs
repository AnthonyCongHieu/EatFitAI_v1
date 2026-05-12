using EatFitAI.API.Data;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public sealed class AdminControlPlaneBootstrapper
{
    private static readonly SemaphoreSlim SchemaInitLock = new(1, 1);
    private static bool _schemaInitialized;

    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<AdminControlPlaneBootstrapper> _logger;

    public AdminControlPlaneBootstrapper(
        ApplicationDbContext context,
        IConfiguration configuration,
        IHostEnvironment environment,
        ILogger<AdminControlPlaneBootstrapper> logger)
    {
        _context = context;
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public static string SchemaSql => """
        CREATE TABLE IF NOT EXISTS "OpsMetricBucket" (
            "OpsMetricBucketId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "Source" varchar(40) NOT NULL,
            "Method" varchar(12) NOT NULL,
            "RouteGroup" varchar(160) NOT NULL,
            "StatusClass" varchar(12) NOT NULL,
            "BucketStart" timestamp without time zone NOT NULL,
            "Granularity" varchar(20) NOT NULL,
            "RequestCount" bigint NOT NULL DEFAULT 0,
            "ErrorCount" bigint NOT NULL DEFAULT 0,
            "DurationSumMs" bigint NOT NULL DEFAULT 0,
            "DurationMaxMs" integer NOT NULL DEFAULT 0,
            "LatencyHistogramJson" text NOT NULL DEFAULT '{}',
            "CreatedAt" timestamp without time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
            "UpdatedAt" timestamp without time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
        );

        CREATE UNIQUE INDEX IF NOT EXISTS "UQ_OpsMetricBucket_Key"
        ON "OpsMetricBucket" ("Source", "Method", "RouteGroup", "StatusClass", "BucketStart", "Granularity");

        CREATE INDEX IF NOT EXISTS "IX_OpsMetricBucket_Granularity_BucketStart"
        ON "OpsMetricBucket" ("Granularity", "BucketStart" DESC);

        CREATE TABLE IF NOT EXISTS "MobileRuntimeConfig" (
            "MobileRuntimeConfigId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "Environment" varchar(40) NOT NULL,
            "Platform" varchar(40) NOT NULL,
            "Channel" varchar(80) NOT NULL,
            "MaintenanceEnabled" boolean NOT NULL DEFAULT false,
            "MaintenanceMessage" text NULL,
            "ForceUpdateEnabled" boolean NOT NULL DEFAULT false,
            "MinSupportedVersion" varchar(40) NULL,
            "LatestVersion" varchar(40) NULL,
            "UpdateUrl" text NULL,
            "FeatureFlagsJson" text NOT NULL DEFAULT '{}',
            "TelemetrySampleRate" double precision NOT NULL DEFAULT 1,
            "ConfigVersion" integer NOT NULL DEFAULT 1,
            "UpdatedBy" varchar(256) NULL,
            "CreatedAt" timestamp without time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
            "UpdatedAt" timestamp without time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
        );

        CREATE UNIQUE INDEX IF NOT EXISTS "UQ_MobileRuntimeConfig_Target"
        ON "MobileRuntimeConfig" ("Environment", "Platform", "Channel");

        CREATE TABLE IF NOT EXISTS "PushDevice" (
            "PushDeviceId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "UserId" uuid NOT NULL REFERENCES "Users" ("UserId") ON DELETE CASCADE,
            "ExpoPushToken" varchar(256) NOT NULL,
            "Platform" varchar(40) NOT NULL DEFAULT 'unknown',
            "DeviceId" varchar(160) NULL,
            "AppVersion" varchar(40) NULL,
            "RuntimeVersion" varchar(40) NULL,
            "Channel" varchar(80) NULL,
            "PermissionStatus" varchar(40) NOT NULL DEFAULT 'unknown',
            "IsEnabled" boolean NOT NULL DEFAULT true,
            "DisabledReason" varchar(120) NULL,
            "LastRegisteredAt" timestamp without time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
            "LastSeenAt" timestamp without time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
            "CreatedAt" timestamp without time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
            "UpdatedAt" timestamp without time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
        );

        CREATE UNIQUE INDEX IF NOT EXISTS "UQ_PushDevice_Token"
        ON "PushDevice" ("ExpoPushToken");

        CREATE INDEX IF NOT EXISTS "IX_PushDevice_User_Enabled"
        ON "PushDevice" ("UserId", "IsEnabled");

        CREATE TABLE IF NOT EXISTS "PushCampaign" (
            "PushCampaignId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "Title" varchar(120) NOT NULL,
            "Body" varchar(512) NOT NULL,
            "DataJson" text NOT NULL DEFAULT '{}',
            "AudienceFilterJson" text NOT NULL DEFAULT '{}',
            "Status" varchar(40) NOT NULL DEFAULT 'draft',
            "ScheduledAt" timestamp without time zone NULL,
            "SentAt" timestamp without time zone NULL,
            "CompletedAt" timestamp without time zone NULL,
            "TargetCount" integer NOT NULL DEFAULT 0,
            "DeliveredCount" integer NOT NULL DEFAULT 0,
            "FailedCount" integer NOT NULL DEFAULT 0,
            "CreatedBy" varchar(256) NULL,
            "UpdatedBy" varchar(256) NULL,
            "CreatedAt" timestamp without time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
            "UpdatedAt" timestamp without time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
        );

        CREATE INDEX IF NOT EXISTS "IX_PushCampaign_Status_ScheduledAt"
        ON "PushCampaign" ("Status", "ScheduledAt");

        CREATE TABLE IF NOT EXISTS "PushCampaignDelivery" (
            "PushCampaignDeliveryId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "PushCampaignId" uuid NOT NULL REFERENCES "PushCampaign" ("PushCampaignId") ON DELETE CASCADE,
            "PushDeviceId" uuid NOT NULL REFERENCES "PushDevice" ("PushDeviceId") ON DELETE CASCADE,
            "ExpoPushToken" varchar(256) NOT NULL,
            "Status" varchar(40) NOT NULL DEFAULT 'pending',
            "TicketId" varchar(120) NULL,
            "ErrorCode" varchar(120) NULL,
            "ErrorMessage" text NULL,
            "AttemptCount" integer NOT NULL DEFAULT 0,
            "NextAttemptAt" timestamp without time zone NULL,
            "LastAttemptAt" timestamp without time zone NULL,
            "ReceiptCheckedAt" timestamp without time zone NULL,
            "CreatedAt" timestamp without time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
            "UpdatedAt" timestamp without time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
        );

        CREATE UNIQUE INDEX IF NOT EXISTS "UQ_PushCampaignDelivery_Campaign_Device"
        ON "PushCampaignDelivery" ("PushCampaignId", "PushDeviceId");

        CREATE INDEX IF NOT EXISTS "IX_PushCampaignDelivery_Status_NextAttempt"
        ON "PushCampaignDelivery" ("Status", "NextAttemptAt");

        CREATE INDEX IF NOT EXISTS "IX_PushCampaignDelivery_TicketId"
        ON "PushCampaignDelivery" ("TicketId");

        INSERT INTO "MobileRuntimeConfig" (
            "Environment",
            "Platform",
            "Channel",
            "MaintenanceEnabled",
            "MaintenanceMessage",
            "ForceUpdateEnabled",
            "FeatureFlagsJson",
            "TelemetrySampleRate",
            "ConfigVersion",
            "CreatedAt",
            "UpdatedAt"
        )
        VALUES (
            'production',
            'all',
            'production',
            false,
            'EatFitAI đang bảo trì ngắn. Vui lòng thử lại sau ít phút.',
            false,
            '{"aiScan":true,"voice":true,"recipes":true,"pushCampaigns":true}',
            1,
            1,
            NOW() AT TIME ZONE 'UTC',
            NOW() AT TIME ZONE 'UTC'
        )
        ON CONFLICT ("Environment", "Platform", "Channel") DO NOTHING;

        DO $$
        BEGIN
            IF to_regclass('public."OpsMetricBucket"') IS NOT NULL THEN
                EXECUTE 'ALTER TABLE "OpsMetricBucket" ENABLE ROW LEVEL SECURITY';
                EXECUTE 'REVOKE ALL ON TABLE "OpsMetricBucket" FROM anon, authenticated';
            END IF;

            IF to_regclass('public."MobileRuntimeConfig"') IS NOT NULL THEN
                EXECUTE 'ALTER TABLE "MobileRuntimeConfig" ENABLE ROW LEVEL SECURITY';
                EXECUTE 'REVOKE ALL ON TABLE "MobileRuntimeConfig" FROM anon, authenticated';
            END IF;

            IF to_regclass('public."PushDevice"') IS NOT NULL THEN
                EXECUTE 'ALTER TABLE "PushDevice" ENABLE ROW LEVEL SECURITY';
                EXECUTE 'REVOKE ALL ON TABLE "PushDevice" FROM anon, authenticated';
            END IF;

            IF to_regclass('public."PushCampaign"') IS NOT NULL THEN
                EXECUTE 'ALTER TABLE "PushCampaign" ENABLE ROW LEVEL SECURITY';
                EXECUTE 'REVOKE ALL ON TABLE "PushCampaign" FROM anon, authenticated';
            END IF;

            IF to_regclass('public."PushCampaignDelivery"') IS NOT NULL THEN
                EXECUTE 'ALTER TABLE "PushCampaignDelivery" ENABLE ROW LEVEL SECURITY';
                EXECUTE 'REVOKE ALL ON TABLE "PushCampaignDelivery" FROM anon, authenticated';
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
            _logger.LogWarning(ex, "Unable to ensure admin control-plane schema.");
            throw;
        }
        finally
        {
            SchemaInitLock.Release();
        }
    }
}
