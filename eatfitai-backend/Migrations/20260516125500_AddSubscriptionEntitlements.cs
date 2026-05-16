using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EatFitAI.API.Migrations;

public partial class AddSubscriptionEntitlements : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
                "PlanCode" varchar(40) PRIMARY KEY,
                "DisplayName" varchar(120) NOT NULL,
                "IsPremium" boolean NOT NULL DEFAULT false,
                "FeaturesJson" text NOT NULL DEFAULT '{}',
                "LimitsJson" text NOT NULL DEFAULT '{}',
                "IsActive" boolean NOT NULL DEFAULT true,
                "SortOrder" integer NOT NULL DEFAULT 0,
                "CreatedAt" timestamp(3) with time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
                "UpdatedAt" timestamp(3) with time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
            );

            CREATE TABLE IF NOT EXISTS "UserEntitlement" (
                "UserEntitlementId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "UserId" uuid NOT NULL REFERENCES "Users" ("UserId") ON DELETE CASCADE,
                "PlanCode" varchar(40) NOT NULL REFERENCES "SubscriptionPlan" ("PlanCode") ON DELETE RESTRICT,
                "Status" varchar(40) NOT NULL DEFAULT 'active',
                "Source" varchar(60) NOT NULL DEFAULT 'manual',
                "StartsAt" timestamp(3) with time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
                "ExpiresAt" timestamp with time zone NULL,
                "CreatedAt" timestamp(3) with time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
                "UpdatedAt" timestamp(3) with time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
            );

            CREATE INDEX IF NOT EXISTS "IX_UserEntitlement_User_Status_Expires"
                ON "UserEntitlement" ("UserId", "Status", "ExpiresAt");

            INSERT INTO "SubscriptionPlan" ("PlanCode", "DisplayName", "IsPremium", "FeaturesJson", "LimitsJson", "IsActive", "SortOrder")
            VALUES
                ('free', 'EatFitAI Free', false, '{"basicLogging":true,"aiScan":true,"mochiCoach":true}', '{"aiScansPerDay":10,"recipeSuggestionsPerDay":3}', true, 0),
                ('premium', 'EatFitAI Premium', true, '{"basicLogging":true,"aiScan":true,"mochiCoach":true,"advancedInsights":true,"priorityAi":true}', '{"aiScansPerDay":100,"recipeSuggestionsPerDay":30}', true, 10)
            ON CONFLICT ("PlanCode") DO UPDATE
            SET "DisplayName" = EXCLUDED."DisplayName",
                "IsPremium" = EXCLUDED."IsPremium",
                "FeaturesJson" = EXCLUDED."FeaturesJson",
                "LimitsJson" = EXCLUDED."LimitsJson",
                "IsActive" = EXCLUDED."IsActive",
                "SortOrder" = EXCLUDED."SortOrder",
                "UpdatedAt" = NOW() AT TIME ZONE 'UTC';

            DO $$
            BEGIN
                IF to_regclass('public."SubscriptionPlan"') IS NOT NULL THEN
                    EXECUTE 'ALTER TABLE "SubscriptionPlan" ENABLE ROW LEVEL SECURITY';
                    EXECUTE 'REVOKE ALL ON TABLE "SubscriptionPlan" FROM anon, authenticated';
                END IF;

                IF to_regclass('public."UserEntitlement"') IS NOT NULL THEN
                    EXECUTE 'ALTER TABLE "UserEntitlement" ENABLE ROW LEVEL SECURITY';
                    EXECUTE 'REVOKE ALL ON TABLE "UserEntitlement" FROM anon, authenticated';
                END IF;
            END $$;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DROP TABLE IF EXISTS "UserEntitlement";
            DROP TABLE IF EXISTS "SubscriptionPlan";
            """);
    }
}
