using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EatFitAI.API.Migrations
{
    public partial class BranchBContracts : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "FoodItem"
                    ADD COLUMN IF NOT EXISTS "Barcode" character varying(64),
                    ADD COLUMN IF NOT EXISTS "IsVerified" boolean NOT NULL DEFAULT false,
                    ADD COLUMN IF NOT EXISTS "VerifiedBy" character varying(100),
                    ADD COLUMN IF NOT EXISTS "CredibilityScore" integer NOT NULL DEFAULT 50,
                    ADD COLUMN IF NOT EXISTS "VerificationStatus" character varying(50),
                    ADD COLUMN IF NOT EXISTS "NutrientCompletenessScore" numeric(5,2) NOT NULL DEFAULT 100,
                    ADD COLUMN IF NOT EXISTS "MissingNutrients" character varying(120),
                    ADD COLUMN IF NOT EXISTS "LastReviewedAt" timestamp(3) with time zone;

                ALTER TABLE "Users"
                    ADD COLUMN IF NOT EXISTS "HasEDRisk" boolean NOT NULL DEFAULT false,
                    ADD COLUMN IF NOT EXISTS "LastReviewDate" timestamp(3) with time zone;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "FoodItem"
                    DROP COLUMN IF EXISTS "VerificationStatus",
                    DROP COLUMN IF EXISTS "NutrientCompletenessScore",
                    DROP COLUMN IF EXISTS "MissingNutrients",
                    DROP COLUMN IF EXISTS "LastReviewedAt";

                ALTER TABLE "Users"
                    DROP COLUMN IF EXISTS "HasEDRisk",
                    DROP COLUMN IF EXISTS "LastReviewDate";
                """);
        }
    }
}
