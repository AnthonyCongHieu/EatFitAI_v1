using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EatFitAI.API.Migrations;

public partial class AddRecipeExperienceFields : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE "Recipe"
                ADD COLUMN IF NOT EXISTS "ImageUrl" varchar(500) NULL,
                ADD COLUMN IF NOT EXISTS "CookTimeMinutes" integer NULL,
                ADD COLUMN IF NOT EXISTS "Difficulty" varchar(40) NULL,
                ADD COLUMN IF NOT EXISTS "ServingCount" integer NULL,
                ADD COLUMN IF NOT EXISTS "InstructionsJson" text NULL,
                ADD COLUMN IF NOT EXISTS "VideoUrl" varchar(500) NULL,
                ADD COLUMN IF NOT EXISTS "SourceUrlsJson" text NULL,
                ADD COLUMN IF NOT EXISTS "CredibilityScore" integer NOT NULL DEFAULT 70,
                ADD COLUMN IF NOT EXISTS "EnhancedAt" timestamp(3) with time zone NULL;

            UPDATE "Recipe"
            SET "CredibilityScore" = 70
            WHERE "CredibilityScore" IS NULL;

            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'Recipe'
                      AND column_name = 'Instructions'
                ) THEN
                    UPDATE "Recipe"
                    SET "InstructionsJson" = "Instructions"
                    WHERE "InstructionsJson" IS NULL
                      AND "Instructions" IS NOT NULL
                      AND btrim("Instructions") <> '';
                END IF;
            END $$;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE "Recipe"
                DROP COLUMN IF EXISTS "EnhancedAt",
                DROP COLUMN IF EXISTS "CredibilityScore",
                DROP COLUMN IF EXISTS "SourceUrlsJson",
                DROP COLUMN IF EXISTS "InstructionsJson",
                DROP COLUMN IF EXISTS "ServingCount",
                DROP COLUMN IF EXISTS "Difficulty",
                DROP COLUMN IF EXISTS "CookTimeMinutes",
                DROP COLUMN IF EXISTS "ImageUrl";
            """);
    }
}
