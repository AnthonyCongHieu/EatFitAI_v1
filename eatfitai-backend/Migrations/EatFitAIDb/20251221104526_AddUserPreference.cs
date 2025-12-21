using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EatFitAI.API.Migrations.EatFitAIDb
{
    /// <inheritdoc />
    public partial class AddUserPreference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AILog_Users_UserId",
                table: "AILog");

            migrationBuilder.DropForeignKey(
                name: "FK_AISuggestion_AILog_AILogId",
                table: "AISuggestion");

            migrationBuilder.DropForeignKey(
                name: "FK_AISuggestion_FoodItem_FoodItemId",
                table: "AISuggestion");

            migrationBuilder.DropForeignKey(
                name: "FK_BodyMetric_Users_UserId",
                table: "BodyMetric");

            migrationBuilder.DropForeignKey(
                name: "FK_FoodServing_FoodItem_FoodItemId",
                table: "FoodServing");

            migrationBuilder.DropForeignKey(
                name: "FK_FoodServing_ServingUnit_ServingUnitId",
                table: "FoodServing");

            migrationBuilder.DropForeignKey(
                name: "FK_ImageDetection_AILog_AILogId",
                table: "ImageDetection");

            migrationBuilder.DropForeignKey(
                name: "FK_MealDiary_FoodItem_FoodItemId",
                table: "MealDiary");

            migrationBuilder.DropForeignKey(
                name: "FK_MealDiary_MealType_MealTypeId",
                table: "MealDiary");

            migrationBuilder.DropForeignKey(
                name: "FK_MealDiary_Recipe_RecipeId",
                table: "MealDiary");

            migrationBuilder.DropForeignKey(
                name: "FK_MealDiary_ServingUnit_ServingUnitId",
                table: "MealDiary");

            migrationBuilder.DropForeignKey(
                name: "FK_MealDiary_UserDish_UserDishId",
                table: "MealDiary");

            migrationBuilder.DropForeignKey(
                name: "FK_MealDiary_Users_UserId",
                table: "MealDiary");

            migrationBuilder.DropForeignKey(
                name: "FK_NutritionTarget_ActivityLevel_ActivityLevelId",
                table: "NutritionTarget");

            migrationBuilder.DropForeignKey(
                name: "FK_NutritionTarget_Users_UserId",
                table: "NutritionTarget");

            migrationBuilder.DropForeignKey(
                name: "FK_RecipeIngredient_FoodItem_FoodItemId",
                table: "RecipeIngredient");

            migrationBuilder.DropForeignKey(
                name: "FK_RecipeIngredient_Recipe_RecipeId",
                table: "RecipeIngredient");

            migrationBuilder.DropForeignKey(
                name: "FK_UserDish_Users_UserId",
                table: "UserDish");

            migrationBuilder.DropForeignKey(
                name: "FK_UserDishIngredient_FoodItem_FoodItemId",
                table: "UserDishIngredient");

            migrationBuilder.DropForeignKey(
                name: "FK_UserDishIngredient_UserDish_UserDishId",
                table: "UserDishIngredient");

            migrationBuilder.DropForeignKey(
                name: "FK_UserFavoriteFood_FoodItem_FoodItemId",
                table: "UserFavoriteFood");

            migrationBuilder.DropForeignKey(
                name: "FK_UserFavoriteFood_Users_UserId",
                table: "UserFavoriteFood");

            migrationBuilder.DropForeignKey(
                name: "FK_UserRecentFood_FoodItem_FoodItemId",
                table: "UserRecentFood");

            migrationBuilder.DropForeignKey(
                name: "FK_UserRecentFood_Users_UserId",
                table: "UserRecentFood");

            migrationBuilder.DropCheckConstraint(
                name: "CK_UserDishIngredient_Positive",
                table: "UserDishIngredient");

            migrationBuilder.DropIndex(
                name: "IX_UserDish_UserId",
                table: "UserDish");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RecipeIngredient_Positive",
                table: "RecipeIngredient");

            migrationBuilder.DropIndex(
                name: "IX_MealDiary_UserId",
                table: "MealDiary");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MealDiary_C_NonNeg",
                table: "MealDiary");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MealDiary_Cal_NonNeg",
                table: "MealDiary");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MealDiary_F_NonNeg",
                table: "MealDiary");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MealDiary_Grams_NonNeg",
                table: "MealDiary");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MealDiary_P_NonNeg",
                table: "MealDiary");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MealDiary_Portion_Positive",
                table: "MealDiary");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ImageDetection_Conf",
                table: "ImageDetection");

            migrationBuilder.DropCheckConstraint(
                name: "CK_FoodServing_Positive",
                table: "FoodServing");

            migrationBuilder.DropCheckConstraint(
                name: "CK_FI_C_NonNeg",
                table: "FoodItem");

            migrationBuilder.DropCheckConstraint(
                name: "CK_FI_Cal_NonNeg",
                table: "FoodItem");

            migrationBuilder.DropCheckConstraint(
                name: "CK_FI_F_NonNeg",
                table: "FoodItem");

            migrationBuilder.DropCheckConstraint(
                name: "CK_FI_P_NonNeg",
                table: "FoodItem");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AISuggestion_Conf",
                table: "AISuggestion");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ActivityLevel_Positive",
                table: "ActivityLevel");

            migrationBuilder.DropColumn(
                name: "BodyFatPct",
                table: "BodyMetric");

            migrationBuilder.RenameIndex(
                name: "IX_UserRecentFood_UserId_FoodItemId",
                table: "UserRecentFood",
                newName: "UQ_UserRecentFood");

            migrationBuilder.RenameIndex(
                name: "IX_UserFavoriteFood_UserId_FoodItemId",
                table: "UserFavoriteFood",
                newName: "UQ_UserFavoriteFood");

            migrationBuilder.RenameIndex(
                name: "IX_ServingUnit_Name",
                table: "ServingUnit",
                newName: "UQ_ServingUnit_Name");

            migrationBuilder.RenameIndex(
                name: "IX_RecipeIngredient_RecipeId",
                table: "RecipeIngredient",
                newName: "IX_RecipeIngredient_Recipe");

            migrationBuilder.RenameIndex(
                name: "IX_MealType_Name",
                table: "MealType",
                newName: "UQ_MealType_Name");

            migrationBuilder.RenameIndex(
                name: "IX_FoodServing_FoodItemId_ServingUnitId",
                table: "FoodServing",
                newName: "UQ_FoodServing");

            migrationBuilder.RenameIndex(
                name: "IX_AISuggestion_AILogId",
                table: "AISuggestion",
                newName: "IX_AISuggestion_AILog");

            migrationBuilder.RenameIndex(
                name: "IX_ActivityLevel_Name",
                table: "ActivityLevel",
                newName: "UQ_ActivityLevel_Name");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Users",
                type: "datetime2(3)",
                precision: 3,
                nullable: false,
                defaultValueSql: "(sysutcdatetime())",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "Users",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "(newid())",
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<string>(
                name: "AvatarUrl",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CurrentStreak",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "EmailVerified",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastLogDate",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LongestStreak",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "OnboardingCompleted",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "TargetWeightKg",
                table: "Users",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerificationCode",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "VerificationCodeExpiry",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "UsedCount",
                table: "UserRecentFood",
                type: "int",
                nullable: false,
                defaultValue: 1,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<DateTime>(
                name: "LastUsedAt",
                table: "UserRecentFood",
                type: "datetime2(3)",
                precision: 3,
                nullable: false,
                defaultValueSql: "(sysutcdatetime())",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "UserFavoriteFood",
                type: "datetime2(3)",
                precision: 3,
                nullable: false,
                defaultValueSql: "(sysutcdatetime())",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "UserDish",
                type: "datetime2(3)",
                precision: 3,
                nullable: false,
                defaultValueSql: "(sysutcdatetime())",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "UserDish",
                type: "datetime2(3)",
                precision: 3,
                nullable: false,
                defaultValueSql: "(sysutcdatetime())",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Recipe",
                type: "datetime2(3)",
                precision: 3,
                nullable: false,
                defaultValueSql: "(sysutcdatetime())",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Recipe",
                type: "datetime2(3)",
                precision: 3,
                nullable: false,
                defaultValueSql: "(sysutcdatetime())",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<DateOnly>(
                name: "EffectiveTo",
                table: "NutritionTarget",
                type: "date",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateOnly>(
                name: "EffectiveFrom",
                table: "NutritionTarget",
                type: "date",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AddColumn<string>(
                name: "Goal",
                table: "NutritionTarget",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "MealDiary",
                type: "datetime2(3)",
                precision: 3,
                nullable: false,
                defaultValueSql: "(sysutcdatetime())",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<DateOnly>(
                name: "EatenDate",
                table: "MealDiary",
                type: "date",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "MealDiary",
                type: "datetime2(3)",
                precision: 3,
                nullable: false,
                defaultValueSql: "(sysutcdatetime())",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AddColumn<int>(
                name: "UserFoodItemId",
                table: "MealDiary",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "FoodItem",
                type: "datetime2(3)",
                precision: 3,
                nullable: false,
                defaultValueSql: "(sysutcdatetime())",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "FoodItem",
                type: "bit",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "FoodItem",
                type: "datetime2(3)",
                precision: 3,
                nullable: false,
                defaultValueSql: "(sysutcdatetime())",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AddColumn<string>(
                name: "FoodNameEn",
                table: "FoodItem",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FoodNameUnsigned",
                table: "FoodItem",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThumbNail",
                table: "FoodItem",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AlterColumn<DateOnly>(
                name: "MeasuredDate",
                table: "BodyMetric",
                type: "date",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "AISuggestion",
                type: "datetime2(3)",
                precision: 3,
                nullable: false,
                defaultValueSql: "(sysutcdatetime())",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "AILog",
                type: "datetime2(3)",
                precision: 3,
                nullable: false,
                defaultValueSql: "(sysutcdatetime())",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.CreateTable(
                name: "AiLabelMap",
                columns: table => new
                {
                    Label = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    FoodItemId = table.Column<int>(type: "int", nullable: true),
                    MinConfidence = table.Column<decimal>(type: "decimal(5,2)", nullable: false, defaultValue: 0.60m),
                    CreatedAt = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiLabelMap", x => x.Label);
                });

            migrationBuilder.CreateTable(
                name: "UserFoodItem",
                columns: table => new
                {
                    UserFoodItemId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FoodName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ThumbnailUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    UnitType = table.Column<string>(type: "char(2)", unicode: false, fixedLength: true, maxLength: 2, nullable: false),
                    CaloriesPer100 = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    ProteinPer100 = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    CarbPer100 = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    FatPer100 = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserFoodItem", x => x.UserFoodItemId);
                    table.ForeignKey(
                        name: "FK_UserFoodItem_User",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "UserPreference",
                columns: table => new
                {
                    UserPreferenceId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DietaryRestrictions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Allergies = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PreferredMealsPerDay = table.Column<int>(type: "int", nullable: false),
                    PreferredCuisine = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPreference", x => x.UserPreferenceId);
                    table.ForeignKey(
                        name: "FK_UserPreference_User",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "UQ_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserRecentFood_User",
                table: "UserRecentFood",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserFavoriteFood_User",
                table: "UserFavoriteFood",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserDish_UserName",
                table: "UserDish",
                columns: new[] { "UserId", "DishName" },
                filter: "([IsDeleted]=(0))");

            migrationBuilder.CreateIndex(
                name: "IX_MealDiary_EatenDate",
                table: "MealDiary",
                column: "EatenDate",
                filter: "([IsDeleted]=(0))");

            migrationBuilder.CreateIndex(
                name: "IX_MealDiary_UserDate",
                table: "MealDiary",
                columns: new[] { "UserId", "EatenDate" },
                filter: "([IsDeleted]=(0))");

            migrationBuilder.CreateIndex(
                name: "IX_FoodItem_Name",
                table: "FoodItem",
                column: "FoodName",
                filter: "([IsDeleted]=(0))");

            migrationBuilder.CreateIndex(
                name: "UQ_UserFoodItem_User_Name",
                table: "UserFoodItem",
                columns: new[] { "UserId", "FoodName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserPreference_UserId",
                table: "UserPreference",
                column: "UserId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_AILog_User",
                table: "AILog",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_AISuggestion_AILog",
                table: "AISuggestion",
                column: "AILogId",
                principalTable: "AILog",
                principalColumn: "AILogId");

            migrationBuilder.AddForeignKey(
                name: "FK_AISuggestion_FoodItem",
                table: "AISuggestion",
                column: "FoodItemId",
                principalTable: "FoodItem",
                principalColumn: "FoodItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_BodyMetric_User",
                table: "BodyMetric",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_FoodServing_FoodItem",
                table: "FoodServing",
                column: "FoodItemId",
                principalTable: "FoodItem",
                principalColumn: "FoodItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_FoodServing_ServingUnit",
                table: "FoodServing",
                column: "ServingUnitId",
                principalTable: "ServingUnit",
                principalColumn: "ServingUnitId");

            migrationBuilder.AddForeignKey(
                name: "FK_ImageDetection_AILog",
                table: "ImageDetection",
                column: "AILogId",
                principalTable: "AILog",
                principalColumn: "AILogId");

            migrationBuilder.AddForeignKey(
                name: "FK_MealDiary_FoodItem",
                table: "MealDiary",
                column: "FoodItemId",
                principalTable: "FoodItem",
                principalColumn: "FoodItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_MealDiary_MealType",
                table: "MealDiary",
                column: "MealTypeId",
                principalTable: "MealType",
                principalColumn: "MealTypeId");

            migrationBuilder.AddForeignKey(
                name: "FK_MealDiary_Recipe",
                table: "MealDiary",
                column: "RecipeId",
                principalTable: "Recipe",
                principalColumn: "RecipeId");

            migrationBuilder.AddForeignKey(
                name: "FK_MealDiary_ServingUnit",
                table: "MealDiary",
                column: "ServingUnitId",
                principalTable: "ServingUnit",
                principalColumn: "ServingUnitId");

            migrationBuilder.AddForeignKey(
                name: "FK_MealDiary_User",
                table: "MealDiary",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_MealDiary_UserDish",
                table: "MealDiary",
                column: "UserDishId",
                principalTable: "UserDish",
                principalColumn: "UserDishId");

            migrationBuilder.AddForeignKey(
                name: "FK_NutritionTarget_ActivityLevel",
                table: "NutritionTarget",
                column: "ActivityLevelId",
                principalTable: "ActivityLevel",
                principalColumn: "ActivityLevelId");

            migrationBuilder.AddForeignKey(
                name: "FK_NutritionTarget_User",
                table: "NutritionTarget",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_RecipeIngredient_FoodItem",
                table: "RecipeIngredient",
                column: "FoodItemId",
                principalTable: "FoodItem",
                principalColumn: "FoodItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_RecipeIngredient_Recipe",
                table: "RecipeIngredient",
                column: "RecipeId",
                principalTable: "Recipe",
                principalColumn: "RecipeId");

            migrationBuilder.AddForeignKey(
                name: "FK_UserDish_User",
                table: "UserDish",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_UserDishIngredient_FoodItem",
                table: "UserDishIngredient",
                column: "FoodItemId",
                principalTable: "FoodItem",
                principalColumn: "FoodItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_UserDishIngredient_UserDish",
                table: "UserDishIngredient",
                column: "UserDishId",
                principalTable: "UserDish",
                principalColumn: "UserDishId");

            migrationBuilder.AddForeignKey(
                name: "FK_UserFavoriteFood_FoodItem",
                table: "UserFavoriteFood",
                column: "FoodItemId",
                principalTable: "FoodItem",
                principalColumn: "FoodItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_UserFavoriteFood_User",
                table: "UserFavoriteFood",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_UserRecentFood_FoodItem",
                table: "UserRecentFood",
                column: "FoodItemId",
                principalTable: "FoodItem",
                principalColumn: "FoodItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_UserRecentFood_User",
                table: "UserRecentFood",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AILog_User",
                table: "AILog");

            migrationBuilder.DropForeignKey(
                name: "FK_AISuggestion_AILog",
                table: "AISuggestion");

            migrationBuilder.DropForeignKey(
                name: "FK_AISuggestion_FoodItem",
                table: "AISuggestion");

            migrationBuilder.DropForeignKey(
                name: "FK_BodyMetric_User",
                table: "BodyMetric");

            migrationBuilder.DropForeignKey(
                name: "FK_FoodServing_FoodItem",
                table: "FoodServing");

            migrationBuilder.DropForeignKey(
                name: "FK_FoodServing_ServingUnit",
                table: "FoodServing");

            migrationBuilder.DropForeignKey(
                name: "FK_ImageDetection_AILog",
                table: "ImageDetection");

            migrationBuilder.DropForeignKey(
                name: "FK_MealDiary_FoodItem",
                table: "MealDiary");

            migrationBuilder.DropForeignKey(
                name: "FK_MealDiary_MealType",
                table: "MealDiary");

            migrationBuilder.DropForeignKey(
                name: "FK_MealDiary_Recipe",
                table: "MealDiary");

            migrationBuilder.DropForeignKey(
                name: "FK_MealDiary_ServingUnit",
                table: "MealDiary");

            migrationBuilder.DropForeignKey(
                name: "FK_MealDiary_User",
                table: "MealDiary");

            migrationBuilder.DropForeignKey(
                name: "FK_MealDiary_UserDish",
                table: "MealDiary");

            migrationBuilder.DropForeignKey(
                name: "FK_NutritionTarget_ActivityLevel",
                table: "NutritionTarget");

            migrationBuilder.DropForeignKey(
                name: "FK_NutritionTarget_User",
                table: "NutritionTarget");

            migrationBuilder.DropForeignKey(
                name: "FK_RecipeIngredient_FoodItem",
                table: "RecipeIngredient");

            migrationBuilder.DropForeignKey(
                name: "FK_RecipeIngredient_Recipe",
                table: "RecipeIngredient");

            migrationBuilder.DropForeignKey(
                name: "FK_UserDish_User",
                table: "UserDish");

            migrationBuilder.DropForeignKey(
                name: "FK_UserDishIngredient_FoodItem",
                table: "UserDishIngredient");

            migrationBuilder.DropForeignKey(
                name: "FK_UserDishIngredient_UserDish",
                table: "UserDishIngredient");

            migrationBuilder.DropForeignKey(
                name: "FK_UserFavoriteFood_FoodItem",
                table: "UserFavoriteFood");

            migrationBuilder.DropForeignKey(
                name: "FK_UserFavoriteFood_User",
                table: "UserFavoriteFood");

            migrationBuilder.DropForeignKey(
                name: "FK_UserRecentFood_FoodItem",
                table: "UserRecentFood");

            migrationBuilder.DropForeignKey(
                name: "FK_UserRecentFood_User",
                table: "UserRecentFood");

            migrationBuilder.DropTable(
                name: "AiLabelMap");

            migrationBuilder.DropTable(
                name: "UserFoodItem");

            migrationBuilder.DropTable(
                name: "UserPreference");

            migrationBuilder.DropIndex(
                name: "UQ_Users_Email",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_UserRecentFood_User",
                table: "UserRecentFood");

            migrationBuilder.DropIndex(
                name: "IX_UserFavoriteFood_User",
                table: "UserFavoriteFood");

            migrationBuilder.DropIndex(
                name: "IX_UserDish_UserName",
                table: "UserDish");

            migrationBuilder.DropIndex(
                name: "IX_MealDiary_EatenDate",
                table: "MealDiary");

            migrationBuilder.DropIndex(
                name: "IX_MealDiary_UserDate",
                table: "MealDiary");

            migrationBuilder.DropIndex(
                name: "IX_FoodItem_Name",
                table: "FoodItem");

            migrationBuilder.DropColumn(
                name: "AvatarUrl",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CurrentStreak",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "EmailVerified",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LastLogDate",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LongestStreak",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "OnboardingCompleted",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "TargetWeightKg",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "VerificationCode",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "VerificationCodeExpiry",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Goal",
                table: "NutritionTarget");

            migrationBuilder.DropColumn(
                name: "UserFoodItemId",
                table: "MealDiary");

            migrationBuilder.DropColumn(
                name: "FoodNameEn",
                table: "FoodItem");

            migrationBuilder.DropColumn(
                name: "FoodNameUnsigned",
                table: "FoodItem");

            migrationBuilder.DropColumn(
                name: "ThumbNail",
                table: "FoodItem");

            migrationBuilder.RenameIndex(
                name: "UQ_UserRecentFood",
                table: "UserRecentFood",
                newName: "IX_UserRecentFood_UserId_FoodItemId");

            migrationBuilder.RenameIndex(
                name: "UQ_UserFavoriteFood",
                table: "UserFavoriteFood",
                newName: "IX_UserFavoriteFood_UserId_FoodItemId");

            migrationBuilder.RenameIndex(
                name: "UQ_ServingUnit_Name",
                table: "ServingUnit",
                newName: "IX_ServingUnit_Name");

            migrationBuilder.RenameIndex(
                name: "IX_RecipeIngredient_Recipe",
                table: "RecipeIngredient",
                newName: "IX_RecipeIngredient_RecipeId");

            migrationBuilder.RenameIndex(
                name: "UQ_MealType_Name",
                table: "MealType",
                newName: "IX_MealType_Name");

            migrationBuilder.RenameIndex(
                name: "UQ_FoodServing",
                table: "FoodServing",
                newName: "IX_FoodServing_FoodItemId_ServingUnitId");

            migrationBuilder.RenameIndex(
                name: "IX_AISuggestion_AILog",
                table: "AISuggestion",
                newName: "IX_AISuggestion_AILogId");

            migrationBuilder.RenameIndex(
                name: "UQ_ActivityLevel_Name",
                table: "ActivityLevel",
                newName: "IX_ActivityLevel_Name");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Users",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2(3)",
                oldPrecision: 3,
                oldDefaultValueSql: "(sysutcdatetime())");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "Users",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldDefaultValueSql: "(newid())");

            migrationBuilder.AlterColumn<int>(
                name: "UsedCount",
                table: "UserRecentFood",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldDefaultValue: 1);

            migrationBuilder.AlterColumn<DateTime>(
                name: "LastUsedAt",
                table: "UserRecentFood",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2(3)",
                oldPrecision: 3,
                oldDefaultValueSql: "(sysutcdatetime())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "UserFavoriteFood",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2(3)",
                oldPrecision: 3,
                oldDefaultValueSql: "(sysutcdatetime())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "UserDish",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2(3)",
                oldPrecision: 3,
                oldDefaultValueSql: "(sysutcdatetime())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "UserDish",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2(3)",
                oldPrecision: 3,
                oldDefaultValueSql: "(sysutcdatetime())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Recipe",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2(3)",
                oldPrecision: 3,
                oldDefaultValueSql: "(sysutcdatetime())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Recipe",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2(3)",
                oldPrecision: 3,
                oldDefaultValueSql: "(sysutcdatetime())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "EffectiveTo",
                table: "NutritionTarget",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateOnly),
                oldType: "date",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "EffectiveFrom",
                table: "NutritionTarget",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateOnly),
                oldType: "date");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "MealDiary",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2(3)",
                oldPrecision: 3,
                oldDefaultValueSql: "(sysutcdatetime())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "EatenDate",
                table: "MealDiary",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateOnly),
                oldType: "date");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "MealDiary",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2(3)",
                oldPrecision: 3,
                oldDefaultValueSql: "(sysutcdatetime())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "FoodItem",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2(3)",
                oldPrecision: 3,
                oldDefaultValueSql: "(sysutcdatetime())");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "FoodItem",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "FoodItem",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2(3)",
                oldPrecision: 3,
                oldDefaultValueSql: "(sysutcdatetime())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "MeasuredDate",
                table: "BodyMetric",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateOnly),
                oldType: "date");

            migrationBuilder.AddColumn<decimal>(
                name: "BodyFatPct",
                table: "BodyMetric",
                type: "decimal(5,2)",
                nullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "AISuggestion",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2(3)",
                oldPrecision: 3,
                oldDefaultValueSql: "(sysutcdatetime())");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "AILog",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2(3)",
                oldPrecision: 3,
                oldDefaultValueSql: "(sysutcdatetime())");

            migrationBuilder.AddCheckConstraint(
                name: "CK_UserDishIngredient_Positive",
                table: "UserDishIngredient",
                sql: "Grams >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_UserDish_UserId",
                table: "UserDish",
                column: "UserId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RecipeIngredient_Positive",
                table: "RecipeIngredient",
                sql: "Grams >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_MealDiary_UserId",
                table: "MealDiary",
                column: "UserId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MealDiary_C_NonNeg",
                table: "MealDiary",
                sql: "Carb >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MealDiary_Cal_NonNeg",
                table: "MealDiary",
                sql: "Calories >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MealDiary_F_NonNeg",
                table: "MealDiary",
                sql: "Fat >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MealDiary_Grams_NonNeg",
                table: "MealDiary",
                sql: "Grams >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MealDiary_P_NonNeg",
                table: "MealDiary",
                sql: "Protein >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MealDiary_Portion_Positive",
                table: "MealDiary",
                sql: "PortionQuantity IS NULL OR PortionQuantity > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ImageDetection_Conf",
                table: "ImageDetection",
                sql: "Confidence >= 0 AND Confidence <= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_FoodServing_Positive",
                table: "FoodServing",
                sql: "GramsPerUnit > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_FI_C_NonNeg",
                table: "FoodItem",
                sql: "CarbPer100g >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_FI_Cal_NonNeg",
                table: "FoodItem",
                sql: "CaloriesPer100g >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_FI_F_NonNeg",
                table: "FoodItem",
                sql: "FatPer100g >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_FI_P_NonNeg",
                table: "FoodItem",
                sql: "ProteinPer100g >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AISuggestion_Conf",
                table: "AISuggestion",
                sql: "Confidence >= 0 AND Confidence <= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ActivityLevel_Positive",
                table: "ActivityLevel",
                sql: "ActivityFactor > 0");

            migrationBuilder.AddForeignKey(
                name: "FK_AILog_Users_UserId",
                table: "AILog",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_AISuggestion_AILog_AILogId",
                table: "AISuggestion",
                column: "AILogId",
                principalTable: "AILog",
                principalColumn: "AILogId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_AISuggestion_FoodItem_FoodItemId",
                table: "AISuggestion",
                column: "FoodItemId",
                principalTable: "FoodItem",
                principalColumn: "FoodItemId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_BodyMetric_Users_UserId",
                table: "BodyMetric",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_FoodServing_FoodItem_FoodItemId",
                table: "FoodServing",
                column: "FoodItemId",
                principalTable: "FoodItem",
                principalColumn: "FoodItemId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_FoodServing_ServingUnit_ServingUnitId",
                table: "FoodServing",
                column: "ServingUnitId",
                principalTable: "ServingUnit",
                principalColumn: "ServingUnitId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ImageDetection_AILog_AILogId",
                table: "ImageDetection",
                column: "AILogId",
                principalTable: "AILog",
                principalColumn: "AILogId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MealDiary_FoodItem_FoodItemId",
                table: "MealDiary",
                column: "FoodItemId",
                principalTable: "FoodItem",
                principalColumn: "FoodItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_MealDiary_MealType_MealTypeId",
                table: "MealDiary",
                column: "MealTypeId",
                principalTable: "MealType",
                principalColumn: "MealTypeId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MealDiary_Recipe_RecipeId",
                table: "MealDiary",
                column: "RecipeId",
                principalTable: "Recipe",
                principalColumn: "RecipeId");

            migrationBuilder.AddForeignKey(
                name: "FK_MealDiary_ServingUnit_ServingUnitId",
                table: "MealDiary",
                column: "ServingUnitId",
                principalTable: "ServingUnit",
                principalColumn: "ServingUnitId");

            migrationBuilder.AddForeignKey(
                name: "FK_MealDiary_UserDish_UserDishId",
                table: "MealDiary",
                column: "UserDishId",
                principalTable: "UserDish",
                principalColumn: "UserDishId");

            migrationBuilder.AddForeignKey(
                name: "FK_MealDiary_Users_UserId",
                table: "MealDiary",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_NutritionTarget_ActivityLevel_ActivityLevelId",
                table: "NutritionTarget",
                column: "ActivityLevelId",
                principalTable: "ActivityLevel",
                principalColumn: "ActivityLevelId");

            migrationBuilder.AddForeignKey(
                name: "FK_NutritionTarget_Users_UserId",
                table: "NutritionTarget",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_RecipeIngredient_FoodItem_FoodItemId",
                table: "RecipeIngredient",
                column: "FoodItemId",
                principalTable: "FoodItem",
                principalColumn: "FoodItemId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_RecipeIngredient_Recipe_RecipeId",
                table: "RecipeIngredient",
                column: "RecipeId",
                principalTable: "Recipe",
                principalColumn: "RecipeId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_UserDish_Users_UserId",
                table: "UserDish",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_UserDishIngredient_FoodItem_FoodItemId",
                table: "UserDishIngredient",
                column: "FoodItemId",
                principalTable: "FoodItem",
                principalColumn: "FoodItemId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_UserDishIngredient_UserDish_UserDishId",
                table: "UserDishIngredient",
                column: "UserDishId",
                principalTable: "UserDish",
                principalColumn: "UserDishId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_UserFavoriteFood_FoodItem_FoodItemId",
                table: "UserFavoriteFood",
                column: "FoodItemId",
                principalTable: "FoodItem",
                principalColumn: "FoodItemId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_UserFavoriteFood_Users_UserId",
                table: "UserFavoriteFood",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_UserRecentFood_FoodItem_FoodItemId",
                table: "UserRecentFood",
                column: "FoodItemId",
                principalTable: "FoodItem",
                principalColumn: "FoodItemId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_UserRecentFood_Users_UserId",
                table: "UserRecentFood",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
