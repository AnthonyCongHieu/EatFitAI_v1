using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EatFitAI.API.Migrations
{
    public partial class AddNutritionDataAudit : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE SCHEMA IF NOT EXISTS maintenance;

                CREATE TABLE IF NOT EXISTS maintenance."NutritionDataAudit" (
                    "AuditId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                    "BatchId" text NOT NULL,
                    "EntityType" text NOT NULL,
                    "EntityId" text NOT NULL,
                    "Action" text NOT NULL,
                    "OldValueJson" jsonb NULL,
                    "NewValueJson" jsonb NULL,
                    "SourceType" text NOT NULL,
                    "SourceCitation" text NOT NULL,
                    "SourceUrl" text NULL,
                    "ConfidenceLevel" text NOT NULL,
                    "Reason" text NOT NULL,
                    "ReviewedBy" text NOT NULL,
                    "ReviewedAt" timestamptz NOT NULL DEFAULT now()
                );

                CREATE INDEX IF NOT EXISTS "IX_NutritionDataAudit_Batch"
                    ON maintenance."NutritionDataAudit" ("BatchId", "EntityType", "EntityId");

                CREATE TABLE IF NOT EXISTS maintenance."NutritionDataSnapshot" (
                    "SnapshotId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                    "BatchId" text NOT NULL,
                    "EntityType" text NOT NULL,
                    "EntityId" text NOT NULL,
                    "RowJson" jsonb NOT NULL,
                    "CapturedAt" timestamptz NOT NULL DEFAULT now(),
                    CONSTRAINT "UX_NutritionDataSnapshot_Batch_Entity"
                        UNIQUE ("BatchId", "EntityType", "EntityId")
                );

                ALTER TABLE maintenance."NutritionDataAudit" ENABLE ROW LEVEL SECURITY;
                ALTER TABLE maintenance."NutritionDataSnapshot" ENABLE ROW LEVEL SECURITY;
            """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TABLE IF EXISTS maintenance."NutritionDataSnapshot";
                DROP TABLE IF EXISTS maintenance."NutritionDataAudit";
            """);
        }
    }
}
