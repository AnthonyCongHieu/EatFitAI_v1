using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EatFitAI.API.Migrations
{
    public partial class AddNutritionAdvisorIndexes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_AISuggestion_FoodItemId"
                    ON public."AISuggestion" ("FoodItemId")
                    WHERE "FoodItemId" IS NOT NULL;

                CREATE INDEX IF NOT EXISTS "IX_AiCorrectionEvent_FoodItemId"
                    ON public."AiCorrectionEvent" ("FoodItemId")
                    WHERE "FoodItemId" IS NOT NULL;

                CREATE INDEX IF NOT EXISTS "IX_FoodServing_ServingUnitId"
                    ON public."FoodServing" ("ServingUnitId");

                CREATE INDEX IF NOT EXISTS "IX_MealDiary_MealTypeId"
                    ON public."MealDiary" ("MealTypeId")
                    WHERE NOT "IsDeleted";

                CREATE INDEX IF NOT EXISTS "IX_MealDiary_ServingUnitId"
                    ON public."MealDiary" ("ServingUnitId")
                    WHERE "ServingUnitId" IS NOT NULL AND NOT "IsDeleted";

                CREATE INDEX IF NOT EXISTS "IX_MealDiary_UserDishId_Active"
                    ON public."MealDiary" ("UserDishId")
                    WHERE "UserDishId" IS NOT NULL AND NOT "IsDeleted";

                CREATE INDEX IF NOT EXISTS "IX_UserDishIngredient_FoodItemId"
                    ON public."UserDishIngredient" ("FoodItemId");

                CREATE INDEX IF NOT EXISTS "IX_UserDishIngredient_UserDishId"
                    ON public."UserDishIngredient" ("UserDishId");

                CREATE INDEX IF NOT EXISTS "IX_UserFavoriteFood_FoodItemId"
                    ON public."UserFavoriteFood" ("FoodItemId");

                CREATE INDEX IF NOT EXISTS "IX_UserRecentFood_FoodItemId"
                    ON public."UserRecentFood" ("FoodItemId");
            """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP INDEX IF EXISTS public."IX_UserRecentFood_FoodItemId";
                DROP INDEX IF EXISTS public."IX_UserFavoriteFood_FoodItemId";
                DROP INDEX IF EXISTS public."IX_UserDishIngredient_UserDishId";
                DROP INDEX IF EXISTS public."IX_UserDishIngredient_FoodItemId";
                DROP INDEX IF EXISTS public."IX_MealDiary_UserDishId_Active";
                DROP INDEX IF EXISTS public."IX_MealDiary_ServingUnitId";
                DROP INDEX IF EXISTS public."IX_MealDiary_MealTypeId";
                DROP INDEX IF EXISTS public."IX_FoodServing_ServingUnitId";
                DROP INDEX IF EXISTS public."IX_AiCorrectionEvent_FoodItemId";
                DROP INDEX IF EXISTS public."IX_AISuggestion_FoodItemId";
            """);
        }
    }
}
