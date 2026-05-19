using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EatFitAI.API.Migrations;

public partial class AddGeminiKeyRotationQuotaFields : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE "GeminiKeys"
                ADD COLUMN IF NOT EXISTS "RpmLimit" integer NOT NULL DEFAULT 5,
                ADD COLUMN IF NOT EXISTS "TpmLimit" integer NOT NULL DEFAULT 250000,
                ADD COLUMN IF NOT EXISTS "RpdLimit" integer NOT NULL DEFAULT 20;

            ALTER TABLE "Users"
                ADD COLUMN IF NOT EXISTS "LastLoginAt" timestamp(3) with time zone NULL;

            UPDATE "GeminiKeys"
            SET "RpdLimit" = "DailyQuotaLimit"
            WHERE "DailyQuotaLimit" IS NOT NULL
              AND "DailyQuotaLimit" > 0
              AND ("RpdLimit" IS NULL OR "RpdLimit" = 20);
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE "GeminiKeys"
                DROP COLUMN IF EXISTS "RpdLimit",
                DROP COLUMN IF EXISTS "TpmLimit",
                DROP COLUMN IF EXISTS "RpmLimit";

            ALTER TABLE "Users"
                DROP COLUMN IF EXISTS "LastLoginAt";
            """);
    }
}
