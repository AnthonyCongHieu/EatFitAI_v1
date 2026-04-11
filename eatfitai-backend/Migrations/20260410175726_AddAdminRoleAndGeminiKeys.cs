using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace EatFitAI.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminRoleAndGeminiKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ActivityLevel",
                columns: table => new
                {
                    ActivityLevelId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ActivityFactor = table.Column<decimal>(type: "numeric(4,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActivityLevel", x => x.ActivityLevelId);
                });

            migrationBuilder.CreateTable(
                name: "AiLabelMap",
                columns: table => new
                {
                    Label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FoodItemId = table.Column<int>(type: "integer", nullable: true),
                    MinConfidence = table.Column<decimal>(type: "numeric(5,2)", nullable: false, defaultValue: 0.60m),
                    CreatedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiLabelMap", x => x.Label);
                });

            migrationBuilder.CreateTable(
                name: "FoodItem",
                columns: table => new
                {
                    FoodItemId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FoodName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    FoodNameEn = table.Column<string>(type: "text", nullable: true),
                    FoodNameUnsigned = table.Column<string>(type: "text", nullable: true),
                    CaloriesPer100g = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    ProteinPer100g = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    CarbPer100g = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    FatPer100g = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    ThumbNail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'"),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FoodItem", x => x.FoodItemId);
                });

            migrationBuilder.CreateTable(
                name: "GeminiKeys",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    KeyName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EncryptedApiKey = table.Column<string>(type: "text", nullable: false),
                    DailyRequestsUsed = table.Column<int>(type: "integer", nullable: false),
                    TotalRequestsUsed = table.Column<int>(type: "integer", nullable: false),
                    LastUsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GeminiKeys", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MealType",
                columns: table => new
                {
                    MealTypeId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MealType", x => x.MealTypeId);
                });

            migrationBuilder.CreateTable(
                name: "Recipe",
                columns: table => new
                {
                    RecipeId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RecipeName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Recipe", x => x.RecipeId);
                });

            migrationBuilder.CreateTable(
                name: "ServingUnit",
                columns: table => new
                {
                    ServingUnitId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Symbol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    IsBaseUnit = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServingUnit", x => x.ServingUnitId);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    DisplayName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    AvatarUrl = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'"),
                    IsEmailVerified = table.Column<bool>(type: "boolean", nullable: false),
                    EmailVerificationToken = table.Column<string>(type: "text", nullable: true),
                    EmailVerificationExpiry = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: true),
                    OnboardingCompleted = table.Column<bool>(type: "boolean", nullable: false),
                    Role = table.Column<string>(type: "text", nullable: false),
                    TargetWeightKg = table.Column<decimal>(type: "numeric", nullable: true),
                    CurrentStreak = table.Column<int>(type: "integer", nullable: false),
                    LongestStreak = table.Column<int>(type: "integer", nullable: false),
                    LastLogDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.UserId);
                });

            migrationBuilder.CreateTable(
                name: "RecipeIngredient",
                columns: table => new
                {
                    RecipeIngredientId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RecipeId = table.Column<int>(type: "integer", nullable: false),
                    FoodItemId = table.Column<int>(type: "integer", nullable: false),
                    Grams = table.Column<decimal>(type: "numeric(10,2)", nullable: false)
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
                    FoodServingId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FoodItemId = table.Column<int>(type: "integer", nullable: false),
                    ServingUnitId = table.Column<int>(type: "integer", nullable: false),
                    GramsPerUnit = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    Description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
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
                name: "AiCorrectionEvent",
                columns: table => new
                {
                    AiCorrectionEventId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FoodItemId = table.Column<int>(type: "integer", nullable: true),
                    SelectedFoodName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    DetectedConfidence = table.Column<decimal>(type: "numeric(5,4)", nullable: true),
                    Source = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ClientTimestamp = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiCorrectionEvent", x => x.AiCorrectionEventId);
                    table.ForeignKey(
                        name: "FK_AiCorrectionEvent_User",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "AILog",
                columns: table => new
                {
                    AILogId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Action = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    InputJson = table.Column<string>(type: "text", nullable: true),
                    OutputJson = table.Column<string>(type: "text", nullable: true),
                    DurationMs = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'")
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
                    BodyMetricId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    HeightCm = table.Column<decimal>(type: "numeric(5,2)", nullable: true),
                    WeightKg = table.Column<decimal>(type: "numeric(5,2)", nullable: true),
                    MeasuredDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Note = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
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
                    NutritionTargetId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActivityLevelId = table.Column<int>(type: "integer", nullable: true),
                    CaloriesTarget = table.Column<int>(type: "integer", nullable: false),
                    ProteinTarget = table.Column<int>(type: "integer", nullable: false),
                    CarbTarget = table.Column<int>(type: "integer", nullable: false),
                    FatTarget = table.Column<int>(type: "integer", nullable: false),
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
                    UserDishId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    DishName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'"),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
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
                    UserFavoriteFoodId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FoodItemId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'")
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
                    UserFoodItemId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FoodName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ThumbnailUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    UnitType = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    CaloriesPer100 = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    ProteinPer100 = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    CarbPer100 = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    FatPer100 = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'")
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
                    UserPreferenceId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    DietaryRestrictions = table.Column<string>(type: "text", nullable: true),
                    Allergies = table.Column<string>(type: "text", nullable: true),
                    PreferredMealsPerDay = table.Column<int>(type: "integer", nullable: false),
                    PreferredCuisine = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'")
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

            migrationBuilder.CreateTable(
                name: "UserRecentFood",
                columns: table => new
                {
                    UserRecentFoodId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FoodItemId = table.Column<int>(type: "integer", nullable: false),
                    LastUsedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'"),
                    UsedCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 1)
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
                    AISuggestionId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AILogId = table.Column<int>(type: "integer", nullable: false),
                    FoodItemId = table.Column<int>(type: "integer", nullable: false),
                    Confidence = table.Column<decimal>(type: "numeric(5,4)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'")
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
                    ImageDetectionId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AILogId = table.Column<int>(type: "integer", nullable: false),
                    Label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Confidence = table.Column<decimal>(type: "numeric(5,4)", nullable: false)
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
                    MealDiaryId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    EatenDate = table.Column<DateOnly>(type: "date", nullable: false),
                    MealTypeId = table.Column<int>(type: "integer", nullable: false),
                    FoodItemId = table.Column<int>(type: "integer", nullable: true),
                    UserDishId = table.Column<int>(type: "integer", nullable: true),
                    UserFoodItemId = table.Column<int>(type: "integer", nullable: true),
                    RecipeId = table.Column<int>(type: "integer", nullable: true),
                    ServingUnitId = table.Column<int>(type: "integer", nullable: true),
                    PortionQuantity = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    Grams = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    Calories = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    Protein = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    Carb = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    Fat = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PhotoUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SourceMethod = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp(3) with time zone", precision: 3, nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'"),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
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
                    UserDishIngredientId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserDishId = table.Column<int>(type: "integer", nullable: false),
                    FoodItemId = table.Column<int>(type: "integer", nullable: false),
                    Grams = table.Column<decimal>(type: "numeric(10,2)", nullable: false)
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
                name: "IX_AiCorrectionEvent_Label_CreatedAt",
                table: "AiCorrectionEvent",
                columns: new[] { "Label", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AiCorrectionEvent_Source_CreatedAt",
                table: "AiCorrectionEvent",
                columns: new[] { "Source", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AiCorrectionEvent_User_CreatedAt",
                table: "AiCorrectionEvent",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AILog_User_Action_CreatedAt",
                table: "AILog",
                columns: new[] { "UserId", "Action", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AISuggestion_AILog",
                table: "AISuggestion",
                column: "AILogId");

            migrationBuilder.CreateIndex(
                name: "IX_AISuggestion_FoodItemId",
                table: "AISuggestion",
                column: "FoodItemId");

            migrationBuilder.CreateIndex(
                name: "IX_BodyMetric_User_MeasuredDate",
                table: "BodyMetric",
                columns: new[] { "UserId", "MeasuredDate" });

            migrationBuilder.CreateIndex(
                name: "IX_FoodItem_Name",
                table: "FoodItem",
                column: "FoodName",
                filter: "\"IsDeleted\" = false");

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
                name: "UQ_GeminiKeys_KeyName",
                table: "GeminiKeys",
                column: "KeyName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ImageDetection_AILogId",
                table: "ImageDetection",
                column: "AILogId");

            migrationBuilder.CreateIndex(
                name: "IX_MealDiary_EatenDate",
                table: "MealDiary",
                column: "EatenDate",
                filter: "\"IsDeleted\" = false");

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
                filter: "\"IsDeleted\" = false");

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
                name: "IX_NutritionTarget_User_EffectiveWindow",
                table: "NutritionTarget",
                columns: new[] { "UserId", "EffectiveFrom", "EffectiveTo" });

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
                filter: "\"IsDeleted\" = false");

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
                name: "IX_UserFavoriteFood_User_CreatedAt",
                table: "UserFavoriteFood",
                columns: new[] { "UserId", "CreatedAt" });

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
                name: "IX_UserPreference_UserId",
                table: "UserPreference",
                column: "UserId",
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
                name: "AiCorrectionEvent");

            migrationBuilder.DropTable(
                name: "AiLabelMap");

            migrationBuilder.DropTable(
                name: "AISuggestion");

            migrationBuilder.DropTable(
                name: "BodyMetric");

            migrationBuilder.DropTable(
                name: "FoodServing");

            migrationBuilder.DropTable(
                name: "GeminiKeys");

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
                name: "UserFoodItem");

            migrationBuilder.DropTable(
                name: "UserPreference");

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
