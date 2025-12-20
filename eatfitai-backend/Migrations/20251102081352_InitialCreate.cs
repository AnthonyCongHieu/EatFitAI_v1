using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EatFitAI.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ActivityLevel",
                columns: table => new
                {
                    ActivityLevelId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ActivityFactor = table.Column<decimal>(type: "decimal(4,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActivityLevel", x => x.ActivityLevelId);
                });

            migrationBuilder.CreateTable(
                name: "FoodItem",
                columns: table => new
                {
                    FoodItemId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FoodName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CaloriesPer100g = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    ProteinPer100g = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    CarbPer100g = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    FatPer100g = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    ThumbNail = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FoodItem", x => x.FoodItemId);
                });

            migrationBuilder.CreateTable(
                name: "MealType",
                columns: table => new
                {
                    MealTypeId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MealType", x => x.MealTypeId);
                });

            migrationBuilder.CreateTable(
                name: "Recipe",
                columns: table => new
                {
                    RecipeId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RecipeName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Recipe", x => x.RecipeId);
                });

            migrationBuilder.CreateTable(
                name: "ServingUnit",
                columns: table => new
                {
                    ServingUnitId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Symbol = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    IsBaseUnit = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServingUnit", x => x.ServingUnitId);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newid())"),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    DisplayName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    EmailVerified = table.Column<bool>(type: "bit", nullable: false),
                    VerificationCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VerificationCodeExpiry = table.Column<DateTime>(type: "datetime2", nullable: true),
                    OnboardingCompleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.UserId);
                });

            migrationBuilder.CreateTable(
                name: "RecipeIngredient",
                columns: table => new
                {
                    RecipeIngredientId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RecipeId = table.Column<int>(type: "int", nullable: false),
                    FoodItemId = table.Column<int>(type: "int", nullable: false),
                    Grams = table.Column<decimal>(type: "decimal(10,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecipeIngredient", x => x.RecipeIngredientId);
                    table.ForeignKey(
                        name: "FK_RecipeIngredient_FoodItem",
                        column: x => x.FoodItemId,
                        principalTable: "FoodItem",
                        principalColumn: "FoodItemId");
                    table.ForeignKey(
                        name: "FK_RecipeIngredient_Recipe",
                        column: x => x.RecipeId,
                        principalTable: "Recipe",
                        principalColumn: "RecipeId");
                });

            migrationBuilder.CreateTable(
                name: "FoodServing",
                columns: table => new
                {
                    FoodServingId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FoodItemId = table.Column<int>(type: "int", nullable: false),
                    ServingUnitId = table.Column<int>(type: "int", nullable: false),
                    GramsPerUnit = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FoodServing", x => x.FoodServingId);
                    table.ForeignKey(
                        name: "FK_FoodServing_FoodItem",
                        column: x => x.FoodItemId,
                        principalTable: "FoodItem",
                        principalColumn: "FoodItemId");
                    table.ForeignKey(
                        name: "FK_FoodServing_ServingUnit",
                        column: x => x.ServingUnitId,
                        principalTable: "ServingUnit",
                        principalColumn: "ServingUnitId");
                });

            migrationBuilder.CreateTable(
                name: "AILog",
                columns: table => new
                {
                    AILogId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Action = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    InputJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OutputJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DurationMs = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AILog", x => x.AILogId);
                    table.ForeignKey(
                        name: "FK_AILog_User",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "BodyMetric",
                columns: table => new
                {
                    BodyMetricId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    HeightCm = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    WeightKg = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    MeasuredDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BodyMetric", x => x.BodyMetricId);
                    table.ForeignKey(
                        name: "FK_BodyMetric_User",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "NutritionTarget",
                columns: table => new
                {
                    NutritionTargetId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActivityLevelId = table.Column<int>(type: "int", nullable: true),
                    TargetCalories = table.Column<int>(type: "int", nullable: false),
                    TargetProtein = table.Column<int>(type: "int", nullable: false),
                    TargetCarb = table.Column<int>(type: "int", nullable: false),
                    TargetFat = table.Column<int>(type: "int", nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    EffectiveTo = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NutritionTarget", x => x.NutritionTargetId);
                    table.ForeignKey(
                        name: "FK_NutritionTarget_ActivityLevel",
                        column: x => x.ActivityLevelId,
                        principalTable: "ActivityLevel",
                        principalColumn: "ActivityLevelId");
                    table.ForeignKey(
                        name: "FK_NutritionTarget_User",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "UserDish",
                columns: table => new
                {
                    UserDishId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DishName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserDish", x => x.UserDishId);
                    table.ForeignKey(
                        name: "FK_UserDish_User",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "UserFavoriteFood",
                columns: table => new
                {
                    UserFavoriteFoodId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FoodItemId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserFavoriteFood", x => x.UserFavoriteFoodId);
                    table.ForeignKey(
                        name: "FK_UserFavoriteFood_FoodItem",
                        column: x => x.FoodItemId,
                        principalTable: "FoodItem",
                        principalColumn: "FoodItemId");
                    table.ForeignKey(
                        name: "FK_UserFavoriteFood_User",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
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
                name: "UserRecentFood",
                columns: table => new
                {
                    UserRecentFoodId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FoodItemId = table.Column<int>(type: "int", nullable: false),
                    LastUsedAt = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    UsedCount = table.Column<int>(type: "int", nullable: false, defaultValue: 1)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRecentFood", x => x.UserRecentFoodId);
                    table.ForeignKey(
                        name: "FK_UserRecentFood_FoodItem",
                        column: x => x.FoodItemId,
                        principalTable: "FoodItem",
                        principalColumn: "FoodItemId");
                    table.ForeignKey(
                        name: "FK_UserRecentFood_User",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "AISuggestion",
                columns: table => new
                {
                    AISuggestionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AILogId = table.Column<int>(type: "int", nullable: false),
                    FoodItemId = table.Column<int>(type: "int", nullable: false),
                    Confidence = table.Column<decimal>(type: "decimal(5,4)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AISuggestion", x => x.AISuggestionId);
                    table.ForeignKey(
                        name: "FK_AISuggestion_AILog",
                        column: x => x.AILogId,
                        principalTable: "AILog",
                        principalColumn: "AILogId");
                    table.ForeignKey(
                        name: "FK_AISuggestion_FoodItem",
                        column: x => x.FoodItemId,
                        principalTable: "FoodItem",
                        principalColumn: "FoodItemId");
                });

            migrationBuilder.CreateTable(
                name: "ImageDetection",
                columns: table => new
                {
                    ImageDetectionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AILogId = table.Column<int>(type: "int", nullable: false),
                    Label = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Confidence = table.Column<decimal>(type: "decimal(5,4)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImageDetection", x => x.ImageDetectionId);
                    table.ForeignKey(
                        name: "FK_ImageDetection_AILog",
                        column: x => x.AILogId,
                        principalTable: "AILog",
                        principalColumn: "AILogId");
                });

            migrationBuilder.CreateTable(
                name: "MealDiary",
                columns: table => new
                {
                    MealDiaryId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EatenDate = table.Column<DateOnly>(type: "date", nullable: false),
                    MealTypeId = table.Column<int>(type: "int", nullable: false),
                    FoodItemId = table.Column<int>(type: "int", nullable: true),
                    UserDishId = table.Column<int>(type: "int", nullable: true),
                    UserFoodItemId = table.Column<int>(type: "int", nullable: true),
                    RecipeId = table.Column<int>(type: "int", nullable: true),
                    ServingUnitId = table.Column<int>(type: "int", nullable: true),
                    PortionQuantity = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    Grams = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Calories = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Protein = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Carb = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Fat = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PhotoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SourceMethod = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MealDiary", x => x.MealDiaryId);
                    table.ForeignKey(
                        name: "FK_MealDiary_FoodItem",
                        column: x => x.FoodItemId,
                        principalTable: "FoodItem",
                        principalColumn: "FoodItemId");
                    table.ForeignKey(
                        name: "FK_MealDiary_MealType",
                        column: x => x.MealTypeId,
                        principalTable: "MealType",
                        principalColumn: "MealTypeId");
                    table.ForeignKey(
                        name: "FK_MealDiary_Recipe",
                        column: x => x.RecipeId,
                        principalTable: "Recipe",
                        principalColumn: "RecipeId");
                    table.ForeignKey(
                        name: "FK_MealDiary_ServingUnit",
                        column: x => x.ServingUnitId,
                        principalTable: "ServingUnit",
                        principalColumn: "ServingUnitId");
                    table.ForeignKey(
                        name: "FK_MealDiary_User",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                    table.ForeignKey(
                        name: "FK_MealDiary_UserDish",
                        column: x => x.UserDishId,
                        principalTable: "UserDish",
                        principalColumn: "UserDishId");
                });

            migrationBuilder.CreateTable(
                name: "UserDishIngredient",
                columns: table => new
                {
                    UserDishIngredientId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserDishId = table.Column<int>(type: "int", nullable: false),
                    FoodItemId = table.Column<int>(type: "int", nullable: false),
                    Grams = table.Column<decimal>(type: "decimal(10,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserDishIngredient", x => x.UserDishIngredientId);
                    table.ForeignKey(
                        name: "FK_UserDishIngredient_FoodItem",
                        column: x => x.FoodItemId,
                        principalTable: "FoodItem",
                        principalColumn: "FoodItemId");
                    table.ForeignKey(
                        name: "FK_UserDishIngredient_UserDish",
                        column: x => x.UserDishId,
                        principalTable: "UserDish",
                        principalColumn: "UserDishId");
                });

            migrationBuilder.CreateIndex(
                name: "UQ_ActivityLevel_Name",
                table: "ActivityLevel",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AILog_UserId",
                table: "AILog",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AISuggestion_AILog",
                table: "AISuggestion",
                column: "AILogId");

            migrationBuilder.CreateIndex(
                name: "IX_AISuggestion_FoodItemId",
                table: "AISuggestion",
                column: "FoodItemId");

            migrationBuilder.CreateIndex(
                name: "IX_BodyMetric_UserId",
                table: "BodyMetric",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_FoodItem_Name",
                table: "FoodItem",
                column: "FoodName",
                filter: "([IsDeleted]=(0))");

            migrationBuilder.CreateIndex(
                name: "IX_FoodServing_ServingUnitId",
                table: "FoodServing",
                column: "ServingUnitId");

            migrationBuilder.CreateIndex(
                name: "UQ_FoodServing",
                table: "FoodServing",
                columns: new[] { "FoodItemId", "ServingUnitId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ImageDetection_AILogId",
                table: "ImageDetection",
                column: "AILogId");

            migrationBuilder.CreateIndex(
                name: "IX_MealDiary_EatenDate",
                table: "MealDiary",
                column: "EatenDate",
                filter: "([IsDeleted]=(0))");

            migrationBuilder.CreateIndex(
                name: "IX_MealDiary_FoodItemId",
                table: "MealDiary",
                column: "FoodItemId");

            migrationBuilder.CreateIndex(
                name: "IX_MealDiary_MealTypeId",
                table: "MealDiary",
                column: "MealTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_MealDiary_RecipeId",
                table: "MealDiary",
                column: "RecipeId");

            migrationBuilder.CreateIndex(
                name: "IX_MealDiary_ServingUnitId",
                table: "MealDiary",
                column: "ServingUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_MealDiary_UserDate",
                table: "MealDiary",
                columns: new[] { "UserId", "EatenDate" },
                filter: "([IsDeleted]=(0))");

            migrationBuilder.CreateIndex(
                name: "IX_MealDiary_UserDishId",
                table: "MealDiary",
                column: "UserDishId");

            migrationBuilder.CreateIndex(
                name: "UQ_MealType_Name",
                table: "MealType",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NutritionTarget_ActivityLevelId",
                table: "NutritionTarget",
                column: "ActivityLevelId");

            migrationBuilder.CreateIndex(
                name: "IX_NutritionTarget_UserId",
                table: "NutritionTarget",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RecipeIngredient_FoodItemId",
                table: "RecipeIngredient",
                column: "FoodItemId");

            migrationBuilder.CreateIndex(
                name: "IX_RecipeIngredient_Recipe",
                table: "RecipeIngredient",
                column: "RecipeId");

            migrationBuilder.CreateIndex(
                name: "UQ_ServingUnit_Name",
                table: "ServingUnit",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserDish_UserName",
                table: "UserDish",
                columns: new[] { "UserId", "DishName" },
                filter: "([IsDeleted]=(0))");

            migrationBuilder.CreateIndex(
                name: "IX_UserDishIngredient_FoodItemId",
                table: "UserDishIngredient",
                column: "FoodItemId");

            migrationBuilder.CreateIndex(
                name: "IX_UserDishIngredient_UserDishId",
                table: "UserDishIngredient",
                column: "UserDishId");

            migrationBuilder.CreateIndex(
                name: "IX_UserFavoriteFood_FoodItemId",
                table: "UserFavoriteFood",
                column: "FoodItemId");

            migrationBuilder.CreateIndex(
                name: "IX_UserFavoriteFood_User",
                table: "UserFavoriteFood",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "UQ_UserFavoriteFood",
                table: "UserFavoriteFood",
                columns: new[] { "UserId", "FoodItemId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_UserFoodItem_User_Name",
                table: "UserFoodItem",
                columns: new[] { "UserId", "FoodName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserRecentFood_FoodItemId",
                table: "UserRecentFood",
                column: "FoodItemId");

            migrationBuilder.CreateIndex(
                name: "IX_UserRecentFood_User",
                table: "UserRecentFood",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "UQ_UserRecentFood",
                table: "UserRecentFood",
                columns: new[] { "UserId", "FoodItemId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);
        }


        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AISuggestion");

            migrationBuilder.DropTable(
                name: "BodyMetric");

            migrationBuilder.DropTable(
                name: "FoodServing");

            migrationBuilder.DropTable(
                name: "ImageDetection");

            migrationBuilder.DropTable(
                name: "MealDiary");

            migrationBuilder.DropTable(
                name: "NutritionTarget");

            migrationBuilder.DropTable(
                name: "RecipeIngredient");

            migrationBuilder.DropTable(
                name: "UserDishIngredient");

            migrationBuilder.DropTable(
                name: "UserFavoriteFood");

            migrationBuilder.DropTable(
                name: "UserRecentFood");

            migrationBuilder.DropTable(
                name: "AILog");

            migrationBuilder.DropTable(
                name: "MealType");

            migrationBuilder.DropTable(
                name: "ServingUnit");

            migrationBuilder.DropTable(
                name: "ActivityLevel");

            migrationBuilder.DropTable(
                name: "Recipe");

            migrationBuilder.DropTable(
                name: "UserDish");

            migrationBuilder.DropTable(
                name: "FoodItem");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
