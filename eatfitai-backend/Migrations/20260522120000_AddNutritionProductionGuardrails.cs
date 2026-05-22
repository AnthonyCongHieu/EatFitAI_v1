using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EatFitAI.API.Migrations
{
    public partial class AddNutritionProductionGuardrails : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE UNIQUE INDEX IF NOT EXISTS "UX_FoodItem_Active_Barcode"
                    ON public."FoodItem" (lower(btrim("Barcode")))
                    WHERE "IsActive"
                      AND NOT "IsDeleted"
                      AND nullif(btrim(coalesce("Barcode", '')), '') IS NOT NULL;

                CREATE UNIQUE INDEX IF NOT EXISTS "UX_FoodItem_Active_Name_NoBarcode"
                    ON public."FoodItem" (lower(btrim("FoodName")))
                    WHERE "IsActive"
                      AND NOT "IsDeleted"
                      AND nullif(btrim(coalesce("Barcode", '')), '') IS NULL;

                CREATE INDEX IF NOT EXISTS "IX_AiLabelMap_FoodItemId"
                    ON public."AiLabelMap" ("FoodItemId")
                    WHERE "FoodItemId" IS NOT NULL;

                CREATE INDEX IF NOT EXISTS "IX_RecipeIngredient_FoodItemId"
                    ON public."RecipeIngredient" ("FoodItemId");

                CREATE INDEX IF NOT EXISTS "IX_MealDiary_FoodItemId_Active"
                    ON public."MealDiary" ("FoodItemId")
                    WHERE "FoodItemId" IS NOT NULL AND NOT "IsDeleted";

                CREATE INDEX IF NOT EXISTS "IX_MealDiary_RecipeId_Active"
                    ON public."MealDiary" ("RecipeId")
                    WHERE "RecipeId" IS NOT NULL AND NOT "IsDeleted";

                CREATE INDEX IF NOT EXISTS "IX_MealDiary_UserFoodItemId_Active"
                    ON public."MealDiary" ("UserFoodItemId")
                    WHERE "UserFoodItemId" IS NOT NULL AND NOT "IsDeleted";

                CREATE INDEX IF NOT EXISTS "IX_FoodServing_FoodItemId"
                    ON public."FoodServing" ("FoodItemId");

                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'CK_FoodItem_Macros_NonNegative'
                          AND conrelid = 'public."FoodItem"'::regclass
                    ) THEN
                        ALTER TABLE public."FoodItem"
                            ADD CONSTRAINT "CK_FoodItem_Macros_NonNegative"
                            CHECK (
                                "CaloriesPer100g" >= 0
                                AND "ProteinPer100g" >= 0
                                AND "CarbPer100g" >= 0
                                AND "FatPer100g" >= 0
                            ) NOT VALID;
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'CK_FoodItem_Per100g_ReasonableRange'
                          AND conrelid = 'public."FoodItem"'::regclass
                    ) THEN
                        ALTER TABLE public."FoodItem"
                            ADD CONSTRAINT "CK_FoodItem_Per100g_ReasonableRange"
                            CHECK (
                                "CaloriesPer100g" <= 1000
                                AND "ProteinPer100g" <= 100
                                AND "CarbPer100g" <= 100
                                AND "FatPer100g" <= 100
                                AND "NutrientCompletenessScore" BETWEEN 0 AND 100
                                AND "CredibilityScore" BETWEEN 0 AND 100
                            ) NOT VALID;
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'CK_FoodItem_Active_ReviewContract'
                          AND conrelid = 'public."FoodItem"'::regclass
                    ) THEN
                        ALTER TABLE public."FoodItem"
                            ADD CONSTRAINT "CK_FoodItem_Active_ReviewContract"
                            CHECK (
                                NOT ("IsActive" AND NOT "IsDeleted")
                                OR (
                                    nullif(btrim(coalesce("VerificationStatus", '')), '') IS NOT NULL
                                    AND "CredibilityScore" BETWEEN 0 AND 100
                                    AND "NutrientCompletenessScore" BETWEEN 0 AND 100
                                    AND "LastReviewedAt" IS NOT NULL
                                )
                            ) NOT VALID;
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'CK_FoodItem_Active_TrueZeroWhitelist'
                          AND conrelid = 'public."FoodItem"'::regclass
                    ) THEN
                        ALTER TABLE public."FoodItem"
                            ADD CONSTRAINT "CK_FoodItem_Active_TrueZeroWhitelist"
                            CHECK (
                                NOT ("IsActive" AND NOT "IsDeleted")
                                OR "CaloriesPer100g" > 0
                                OR "ProteinPer100g" > 0
                                OR "CarbPer100g" > 0
                                OR "FatPer100g" > 0
                                OR lower(btrim("FoodName")) IN ('muối ăn (nacl)', 'muối', 'nước', 'water')
                            ) NOT VALID;
                    END IF;
                END $$;

                ALTER TABLE public."FoodItem" VALIDATE CONSTRAINT "CK_FoodItem_Macros_NonNegative";
                ALTER TABLE public."FoodItem" VALIDATE CONSTRAINT "CK_FoodItem_Per100g_ReasonableRange";
                ALTER TABLE public."FoodItem" VALIDATE CONSTRAINT "CK_FoodItem_Active_ReviewContract";
                ALTER TABLE public."FoodItem" VALIDATE CONSTRAINT "CK_FoodItem_Active_TrueZeroWhitelist";
            """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE public."FoodItem" DROP CONSTRAINT IF EXISTS "CK_FoodItem_Active_TrueZeroWhitelist";
                ALTER TABLE public."FoodItem" DROP CONSTRAINT IF EXISTS "CK_FoodItem_Active_ReviewContract";
                ALTER TABLE public."FoodItem" DROP CONSTRAINT IF EXISTS "CK_FoodItem_Per100g_ReasonableRange";
                ALTER TABLE public."FoodItem" DROP CONSTRAINT IF EXISTS "CK_FoodItem_Macros_NonNegative";

                DROP INDEX IF EXISTS public."IX_FoodServing_FoodItemId";
                DROP INDEX IF EXISTS public."IX_MealDiary_UserFoodItemId_Active";
                DROP INDEX IF EXISTS public."IX_MealDiary_RecipeId_Active";
                DROP INDEX IF EXISTS public."IX_MealDiary_FoodItemId_Active";
                DROP INDEX IF EXISTS public."IX_RecipeIngredient_FoodItemId";
                DROP INDEX IF EXISTS public."IX_AiLabelMap_FoodItemId";
                DROP INDEX IF EXISTS public."UX_FoodItem_Active_Name_NoBarcode";
                DROP INDEX IF EXISTS public."UX_FoodItem_Active_Barcode";
            """);
        }
    }
}
