-- ============================================================
-- EatFitAI PostgreSQL Schema Migration Script
-- Tạo toàn bộ database schema trên Supabase
-- Chuyển đổi từ SQL Server sang PostgreSQL
-- ============================================================

-- Bật extension cho UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- BẢNG CHÍNH: Users (core entity)
-- ============================================================
CREATE TABLE IF NOT EXISTS "Users" (
    "UserId"            UUID            NOT NULL DEFAULT gen_random_uuid(),
    "Email"             VARCHAR(256)    NOT NULL,
    "DisplayName"       VARCHAR(150)    NULL,
    "PasswordHash"      VARCHAR(256)    NULL,
    "DateOfBirth"       DATE            NULL,
    "Gender"            VARCHAR(10)     NULL,
    "AvatarUrl"         TEXT            NULL,
    "IsEmailVerified"   BOOLEAN         NOT NULL DEFAULT FALSE,
    "EmailVerificationToken" TEXT       NULL,
    "EmailVerificationExpiry" TIMESTAMP NULL,
    "CreatedAt"         TIMESTAMP(3)    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "IsActive"          BOOLEAN         NOT NULL DEFAULT TRUE,
    CONSTRAINT "PK_Users" PRIMARY KEY ("UserId")
);

CREATE UNIQUE INDEX "UQ_Users_Email" ON "Users" ("Email");

-- ============================================================
-- LOOKUP TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS "ActivityLevel" (
    "ActivityLevelId"   SERIAL          NOT NULL,
    "Name"              VARCHAR(100)    NOT NULL,
    "ActivityFactor"    DECIMAL(4,2)    NOT NULL,
    CONSTRAINT "PK_ActivityLevel" PRIMARY KEY ("ActivityLevelId")
);
CREATE UNIQUE INDEX "UQ_ActivityLevel_Name" ON "ActivityLevel" ("Name");

CREATE TABLE IF NOT EXISTS "MealType" (
    "MealTypeId"        SERIAL          NOT NULL,
    "Name"              VARCHAR(50)     NOT NULL,
    "SortOrder"         INT             NOT NULL DEFAULT 0,
    CONSTRAINT "PK_MealType" PRIMARY KEY ("MealTypeId")
);
CREATE UNIQUE INDEX "UQ_MealType_Name" ON "MealType" ("Name");

CREATE TABLE IF NOT EXISTS "ServingUnit" (
    "ServingUnitId"     SERIAL          NOT NULL,
    "Name"              VARCHAR(100)    NOT NULL,
    "Symbol"            VARCHAR(20)     NULL,
    CONSTRAINT "PK_ServingUnit" PRIMARY KEY ("ServingUnitId")
);
CREATE UNIQUE INDEX "UQ_ServingUnit_Name" ON "ServingUnit" ("Name");

-- ============================================================
-- FOOD SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS "FoodItem" (
    "FoodItemId"        SERIAL          NOT NULL,
    "FoodName"          VARCHAR(255)    NOT NULL,
    "FoodNameEn"        VARCHAR(255)    NULL,
    "FoodNameUnsigned"  VARCHAR(255)    NULL,
    "CaloriesPer100g"   DECIMAL(10,2)   NOT NULL DEFAULT 0,
    "ProteinPer100g"    DECIMAL(10,2)   NOT NULL DEFAULT 0,
    "FatPer100g"        DECIMAL(10,2)   NOT NULL DEFAULT 0,
    "CarbPer100g"       DECIMAL(10,2)   NOT NULL DEFAULT 0,
    "ThumbNail"         VARCHAR(255)    NULL,
    "IsActive"          BOOLEAN         NOT NULL DEFAULT TRUE,
    "IsDeleted"         BOOLEAN         NOT NULL DEFAULT FALSE,
    "IsVerified"        BOOLEAN         NOT NULL DEFAULT FALSE,
    "VerifiedBy"        VARCHAR(100)    NULL,
    "CredibilityScore"  INT             NOT NULL DEFAULT 50,
    "CreatedAt"         TIMESTAMP(3)    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "UpdatedAt"         TIMESTAMP(3)    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    CONSTRAINT "PK_FoodItem" PRIMARY KEY ("FoodItemId")
);
CREATE INDEX "IX_FoodItem_Name" ON "FoodItem" ("FoodName") WHERE "IsDeleted" = false;

CREATE TABLE IF NOT EXISTS "FoodServing" (
    "FoodServingId"     SERIAL          NOT NULL,
    "FoodItemId"        INT             NOT NULL,
    "ServingUnitId"     INT             NOT NULL,
    "GramsPerUnit"      DECIMAL(10,2)   NOT NULL,
    "Description"       VARCHAR(200)    NULL,
    CONSTRAINT "PK_FoodServing" PRIMARY KEY ("FoodServingId"),
    CONSTRAINT "FK_FoodServing_FoodItem" FOREIGN KEY ("FoodItemId") REFERENCES "FoodItem" ("FoodItemId"),
    CONSTRAINT "FK_FoodServing_ServingUnit" FOREIGN KEY ("ServingUnitId") REFERENCES "ServingUnit" ("ServingUnitId")
);
CREATE UNIQUE INDEX "UQ_FoodServing" ON "FoodServing" ("FoodItemId", "ServingUnitId");

-- ============================================================
-- USER DATA TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS "BodyMetric" (
    "BodyMetricId"      SERIAL          NOT NULL,
    "UserId"            UUID            NOT NULL,
    "WeightKg"          DECIMAL(5,2)    NOT NULL,
    "HeightCm"          DECIMAL(5,2)    NULL,
    "MeasuredDate"      DATE            NOT NULL,
    "Note"              VARCHAR(200)    NULL,
    CONSTRAINT "PK_BodyMetric" PRIMARY KEY ("BodyMetricId"),
    CONSTRAINT "FK_BodyMetric_User" FOREIGN KEY ("UserId") REFERENCES "Users" ("UserId")
);
CREATE INDEX "IX_BodyMetric_User_MeasuredDate" ON "BodyMetric" ("UserId", "MeasuredDate");

CREATE TABLE IF NOT EXISTS "NutritionTarget" (
    "NutritionTargetId" SERIAL          NOT NULL,
    "UserId"            UUID            NOT NULL,
    "CaloriesTarget"    INT             NOT NULL,
    "ProteinTarget"     INT             NOT NULL,
    "CarbTarget"        INT             NOT NULL,
    "FatTarget"         INT             NOT NULL,
    "ActivityLevelId"   INT             NULL,
    "EffectiveFrom"     DATE            NOT NULL,
    "EffectiveTo"       DATE            NULL,
    CONSTRAINT "PK_NutritionTarget" PRIMARY KEY ("NutritionTargetId"),
    CONSTRAINT "FK_NutritionTarget_User" FOREIGN KEY ("UserId") REFERENCES "Users" ("UserId"),
    CONSTRAINT "FK_NutritionTarget_ActivityLevel" FOREIGN KEY ("ActivityLevelId") REFERENCES "ActivityLevel" ("ActivityLevelId")
);
CREATE INDEX "IX_NutritionTarget_User_EffectiveWindow" ON "NutritionTarget" ("UserId", "EffectiveFrom", "EffectiveTo");

-- ============================================================
-- RECIPE SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS "Recipe" (
    "RecipeId"          SERIAL          NOT NULL,
    "RecipeName"        VARCHAR(255)    NOT NULL,
    "Description"       VARCHAR(500)    NULL,
    "Instructions"      TEXT            NULL,
    "VideoUrl"          TEXT            NULL,
    "CreatedAt"         TIMESTAMP(3)    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "UpdatedAt"         TIMESTAMP(3)    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    CONSTRAINT "PK_Recipe" PRIMARY KEY ("RecipeId")
);

CREATE TABLE IF NOT EXISTS "RecipeIngredient" (
    "RecipeIngredientId" SERIAL         NOT NULL,
    "RecipeId"          INT             NOT NULL,
    "FoodItemId"        INT             NOT NULL,
    "Grams"             DECIMAL(10,2)   NOT NULL,
    CONSTRAINT "PK_RecipeIngredient" PRIMARY KEY ("RecipeIngredientId"),
    CONSTRAINT "FK_RecipeIngredient_Recipe" FOREIGN KEY ("RecipeId") REFERENCES "Recipe" ("RecipeId"),
    CONSTRAINT "FK_RecipeIngredient_FoodItem" FOREIGN KEY ("FoodItemId") REFERENCES "FoodItem" ("FoodItemId")
);
CREATE INDEX "IX_RecipeIngredient_Recipe" ON "RecipeIngredient" ("RecipeId");

-- ============================================================
-- USER DISH SYSTEM (custom dishes)
-- ============================================================

CREATE TABLE IF NOT EXISTS "UserDish" (
    "UserDishId"        SERIAL          NOT NULL,
    "UserId"            UUID            NOT NULL,
    "DishName"          VARCHAR(255)    NOT NULL,
    "Description"       VARCHAR(500)    NULL,
    "IsDeleted"         BOOLEAN         NOT NULL DEFAULT FALSE,
    "CreatedAt"         TIMESTAMP(3)    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "UpdatedAt"         TIMESTAMP(3)    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    CONSTRAINT "PK_UserDish" PRIMARY KEY ("UserDishId"),
    CONSTRAINT "FK_UserDish_User" FOREIGN KEY ("UserId") REFERENCES "Users" ("UserId")
);
CREATE INDEX "IX_UserDish_UserName" ON "UserDish" ("UserId", "DishName") WHERE "IsDeleted" = false;

CREATE TABLE IF NOT EXISTS "UserDishIngredient" (
    "UserDishIngredientId" SERIAL       NOT NULL,
    "UserDishId"        INT             NOT NULL,
    "FoodItemId"        INT             NOT NULL,
    "Grams"             DECIMAL(10,2)   NOT NULL,
    CONSTRAINT "PK_UserDishIngredient" PRIMARY KEY ("UserDishIngredientId"),
    CONSTRAINT "FK_UserDishIngredient_UserDish" FOREIGN KEY ("UserDishId") REFERENCES "UserDish" ("UserDishId"),
    CONSTRAINT "FK_UserDishIngredient_FoodItem" FOREIGN KEY ("FoodItemId") REFERENCES "FoodItem" ("FoodItemId")
);

-- ============================================================
-- MEAL DIARY
-- ============================================================

CREATE TABLE IF NOT EXISTS "MealDiary" (
    "MealDiaryId"       SERIAL          NOT NULL,
    "UserId"            UUID            NOT NULL,
    "FoodItemId"        INT             NULL,
    "RecipeId"          INT             NULL,
    "UserDishId"        INT             NULL,
    "MealTypeId"        INT             NOT NULL,
    "ServingUnitId"     INT             NULL,
    "EatenDate"         DATE            NOT NULL,
    "Grams"             DECIMAL(10,2)   NOT NULL DEFAULT 0,
    "PortionQuantity"   DECIMAL(10,2)   NULL,
    "Calories"          DECIMAL(10,2)   NOT NULL DEFAULT 0,
    "Protein"           DECIMAL(10,2)   NOT NULL DEFAULT 0,
    "Fat"               DECIMAL(10,2)   NOT NULL DEFAULT 0,
    "Carb"              DECIMAL(10,2)   NOT NULL DEFAULT 0,
    "PhotoUrl"          VARCHAR(500)    NULL,
    "Note"              VARCHAR(500)    NULL,
    "SourceMethod"      VARCHAR(30)     NULL,
    "IsDeleted"         BOOLEAN         NOT NULL DEFAULT FALSE,
    "CreatedAt"         TIMESTAMP(3)    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "UpdatedAt"         TIMESTAMP(3)    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    CONSTRAINT "PK_MealDiary" PRIMARY KEY ("MealDiaryId"),
    CONSTRAINT "FK_MealDiary_User" FOREIGN KEY ("UserId") REFERENCES "Users" ("UserId"),
    CONSTRAINT "FK_MealDiary_FoodItem" FOREIGN KEY ("FoodItemId") REFERENCES "FoodItem" ("FoodItemId"),
    CONSTRAINT "FK_MealDiary_Recipe" FOREIGN KEY ("RecipeId") REFERENCES "Recipe" ("RecipeId"),
    CONSTRAINT "FK_MealDiary_UserDish" FOREIGN KEY ("UserDishId") REFERENCES "UserDish" ("UserDishId"),
    CONSTRAINT "FK_MealDiary_MealType" FOREIGN KEY ("MealTypeId") REFERENCES "MealType" ("MealTypeId"),
    CONSTRAINT "FK_MealDiary_ServingUnit" FOREIGN KEY ("ServingUnitId") REFERENCES "ServingUnit" ("ServingUnitId")
);
CREATE INDEX "IX_MealDiary_EatenDate" ON "MealDiary" ("EatenDate") WHERE "IsDeleted" = false;
CREATE INDEX "IX_MealDiary_UserDate" ON "MealDiary" ("UserId", "EatenDate") WHERE "IsDeleted" = false;

-- ============================================================
-- AI SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS "AILog" (
    "AILogId"           SERIAL          NOT NULL,
    "UserId"            UUID            NOT NULL,
    "Action"            VARCHAR(50)     NOT NULL,
    "InputData"         TEXT            NULL,
    "OutputData"        TEXT            NULL,
    "CreatedAt"         TIMESTAMP(3)    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    CONSTRAINT "PK_AILog" PRIMARY KEY ("AILogId"),
    CONSTRAINT "FK_AILog_User" FOREIGN KEY ("UserId") REFERENCES "Users" ("UserId")
);
CREATE INDEX "IX_AILog_User_Action_CreatedAt" ON "AILog" ("UserId", "Action", "CreatedAt");

CREATE TABLE IF NOT EXISTS "AISuggestion" (
    "AISuggestionId"    SERIAL          NOT NULL,
    "AILogId"           INT             NOT NULL,
    "FoodItemId"        INT             NOT NULL,
    "Confidence"        DECIMAL(5,4)    NOT NULL DEFAULT 0,
    "CreatedAt"         TIMESTAMP(3)    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    CONSTRAINT "PK_AISuggestion" PRIMARY KEY ("AISuggestionId"),
    CONSTRAINT "FK_AISuggestion_AILog" FOREIGN KEY ("AILogId") REFERENCES "AILog" ("AILogId"),
    CONSTRAINT "FK_AISuggestion_FoodItem" FOREIGN KEY ("FoodItemId") REFERENCES "FoodItem" ("FoodItemId")
);
CREATE INDEX "IX_AISuggestion_AILog" ON "AISuggestion" ("AILogId");

CREATE TABLE IF NOT EXISTS "ImageDetection" (
    "ImageDetectionId"  SERIAL          NOT NULL,
    "AILogId"           INT             NOT NULL,
    "Label"             VARCHAR(200)    NOT NULL,
    "Confidence"        DECIMAL(5,4)    NOT NULL DEFAULT 0,
    CONSTRAINT "PK_ImageDetection" PRIMARY KEY ("ImageDetectionId"),
    CONSTRAINT "FK_ImageDetection_AILog" FOREIGN KEY ("AILogId") REFERENCES "AILog" ("AILogId")
);

-- ============================================================
-- USER FAVORITES / RECENT
-- ============================================================

CREATE TABLE IF NOT EXISTS "UserFavoriteFood" (
    "UserFavoriteFoodId" SERIAL         NOT NULL,
    "UserId"            UUID            NOT NULL,
    "FoodItemId"        INT             NOT NULL,
    "CreatedAt"         TIMESTAMP(3)    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    CONSTRAINT "PK_UserFavoriteFood" PRIMARY KEY ("UserFavoriteFoodId"),
    CONSTRAINT "FK_UserFavoriteFood_User" FOREIGN KEY ("UserId") REFERENCES "Users" ("UserId"),
    CONSTRAINT "FK_UserFavoriteFood_FoodItem" FOREIGN KEY ("FoodItemId") REFERENCES "FoodItem" ("FoodItemId")
);
CREATE INDEX "IX_UserFavoriteFood_User" ON "UserFavoriteFood" ("UserId");
CREATE INDEX "IX_UserFavoriteFood_User_CreatedAt" ON "UserFavoriteFood" ("UserId", "CreatedAt");
CREATE UNIQUE INDEX "UQ_UserFavoriteFood" ON "UserFavoriteFood" ("UserId", "FoodItemId");

CREATE TABLE IF NOT EXISTS "UserRecentFood" (
    "UserRecentFoodId"  SERIAL          NOT NULL,
    "UserId"            UUID            NOT NULL,
    "FoodItemId"        INT             NOT NULL,
    "UsedCount"         INT             NOT NULL DEFAULT 1,
    "LastUsedAt"        TIMESTAMP(3)    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    CONSTRAINT "PK_UserRecentFood" PRIMARY KEY ("UserRecentFoodId"),
    CONSTRAINT "FK_UserRecentFood_User" FOREIGN KEY ("UserId") REFERENCES "Users" ("UserId"),
    CONSTRAINT "FK_UserRecentFood_FoodItem" FOREIGN KEY ("FoodItemId") REFERENCES "FoodItem" ("FoodItemId")
);
CREATE INDEX "IX_UserRecentFood_User" ON "UserRecentFood" ("UserId");
CREATE UNIQUE INDEX "UQ_UserRecentFood" ON "UserRecentFood" ("UserId", "FoodItemId");

-- ============================================================
-- USER CUSTOM FOOD ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS "UserFoodItem" (
    "UserFoodItemId"    SERIAL          NOT NULL,
    "UserId"            UUID            NOT NULL,
    "FoodName"          VARCHAR(255)    NOT NULL,
    "CaloriesPer100"    DECIMAL(10,2)   NOT NULL DEFAULT 0,
    "ProteinPer100"     DECIMAL(10,2)   NOT NULL DEFAULT 0,
    "FatPer100"         DECIMAL(10,2)   NOT NULL DEFAULT 0,
    "CarbPer100"        DECIMAL(10,2)   NOT NULL DEFAULT 0,
    "UnitType"          VARCHAR(2)      NULL,
    "IsDeleted"         BOOLEAN         NOT NULL DEFAULT FALSE,
    "ThumbnailUrl"      VARCHAR(500)    NULL,
    "CreatedAt"         TIMESTAMP(3)    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "UpdatedAt"         TIMESTAMP(3)    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    CONSTRAINT "PK_UserFoodItem" PRIMARY KEY ("UserFoodItemId"),
    CONSTRAINT "FK_UserFoodItem_User" FOREIGN KEY ("UserId") REFERENCES "Users" ("UserId")
);
CREATE UNIQUE INDEX "UQ_UserFoodItem_User_Name" ON "UserFoodItem" ("UserId", "FoodName");

-- ============================================================
-- WEEKLY CHECK-IN (ApplicationDbContext extra)  
-- ============================================================

CREATE TABLE IF NOT EXISTS "WeeklyCheckIn" (
    "WeeklyCheckInId"   SERIAL          NOT NULL,
    "UserId"            UUID            NOT NULL,
    "WeekStartDate"     DATE            NOT NULL,
    "WeekEndDate"       DATE            NOT NULL,
    "AvgCalories"       DECIMAL(10,2)   NULL,
    "AvgProtein"        DECIMAL(10,2)   NULL,
    "AvgCarbs"          DECIMAL(10,2)   NULL,
    "AvgFat"            DECIMAL(10,2)   NULL,
    "StartWeight"       DECIMAL(5,2)    NULL,
    "EndWeight"         DECIMAL(5,2)    NULL,
    "Note"              TEXT            NULL,
    "CreatedAt"         TIMESTAMP(3)    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    CONSTRAINT "PK_WeeklyCheckIn" PRIMARY KEY ("WeeklyCheckInId"),
    CONSTRAINT "FK_WeeklyCheckIn_User" FOREIGN KEY ("UserId") REFERENCES "Users" ("UserId")
);

-- ============================================================
-- USER PREFERENCE
-- ============================================================

CREATE TABLE IF NOT EXISTS "UserPreference" (
    "UserPreferenceId"  SERIAL          NOT NULL,
    "UserId"            UUID            NOT NULL,
    "Theme"             VARCHAR(20)     NULL DEFAULT 'system',
    "Language"          VARCHAR(10)     NULL DEFAULT 'vi',
    "NotificationsEnabled" BOOLEAN      NOT NULL DEFAULT TRUE,
    "MealReminderEnabled" BOOLEAN       NOT NULL DEFAULT FALSE,
    "WeightUnit"        VARCHAR(5)      NULL DEFAULT 'kg',
    "HeightUnit"        VARCHAR(5)      NULL DEFAULT 'cm',
    "CreatedAt"         TIMESTAMP(3)    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "UpdatedAt"         TIMESTAMP(3)    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    CONSTRAINT "PK_UserPreference" PRIMARY KEY ("UserPreferenceId"),
    CONSTRAINT "FK_UserPreference_User" FOREIGN KEY ("UserId") REFERENCES "Users" ("UserId")
);
CREATE UNIQUE INDEX "UQ_UserPreference_UserId" ON "UserPreference" ("UserId");

-- ============================================================
-- VIEWS (chuyển đổi từ SQL Server)
-- ============================================================

-- View: Tổng dinh dưỡng theo ngày
CREATE OR REPLACE VIEW "vw_DailyNutritionTotals" AS
SELECT
    md."UserId",
    md."EatenDate",
    SUM(md."Calories")  AS "TotalCalories",
    SUM(md."Protein")   AS "TotalProtein",
    SUM(md."Fat")       AS "TotalFat",
    SUM(md."Carb")      AS "TotalCarb"
FROM "MealDiary" md
WHERE md."IsDeleted" = false
GROUP BY md."UserId", md."EatenDate";

-- View: Tổng dinh dưỡng theo tuần
CREATE OR REPLACE VIEW "vw_WeeklyNutritionTotals" AS
SELECT
    md."UserId",
    DATE_TRUNC('week', md."EatenDate"::TIMESTAMP)::DATE AS "WeekStart",
    SUM(md."Calories")  AS "TotalCalories",
    SUM(md."Protein")   AS "TotalProtein",
    SUM(md."Fat")       AS "TotalFat",
    SUM(md."Carb")      AS "TotalCarb"
FROM "MealDiary" md
WHERE md."IsDeleted" = false
GROUP BY md."UserId", DATE_TRUNC('week', md."EatenDate"::TIMESTAMP);

-- View: Tổng dinh dưỡng theo tháng
CREATE OR REPLACE VIEW "vw_MonthlyTotals" AS
SELECT
    md."UserId",
    EXTRACT(YEAR FROM md."EatenDate")  AS "Year",
    EXTRACT(MONTH FROM md."EatenDate") AS "Month",
    SUM(md."Calories")  AS "TotalCalories",
    SUM(md."Protein")   AS "TotalProtein",
    SUM(md."Fat")       AS "TotalFat",
    SUM(md."Carb")      AS "TotalCarb"
FROM "MealDiary" md
WHERE md."IsDeleted" = false
GROUP BY md."UserId", EXTRACT(YEAR FROM md."EatenDate"), EXTRACT(MONTH FROM md."EatenDate");

-- View: Tỷ lệ macro hàng ngày
CREATE OR REPLACE VIEW "vw_DailyMacroShare" AS
SELECT
    md."UserId",
    md."EatenDate",
    SUM(md."Calories")  AS "TotalCalories",
    SUM(md."Protein")   AS "TotalProtein",
    SUM(md."Fat")       AS "TotalFat",
    SUM(md."Carb")      AS "TotalCarb",
    CASE WHEN SUM(md."Calories") > 0
        THEN ROUND(SUM(md."Protein") * 4.0 / SUM(md."Calories"), 4)
        ELSE 0
    END AS "ProteinShare",
    CASE WHEN SUM(md."Calories") > 0
        THEN ROUND(SUM(md."Fat") * 9.0 / SUM(md."Calories"), 4)
        ELSE 0
    END AS "FatShare",
    CASE WHEN SUM(md."Calories") > 0
        THEN ROUND(SUM(md."Carb") * 4.0 / SUM(md."Calories"), 4)
        ELSE 0
    END AS "CarbShare"
FROM "MealDiary" md
WHERE md."IsDeleted" = false
GROUP BY md."UserId", md."EatenDate";

-- View: Tiến độ so với mục tiêu
CREATE OR REPLACE VIEW "vw_TargetProgress" AS
SELECT
    nt."UserId",
    d."EatenDate",
    nt."CaloriesTarget",
    nt."ProteinTarget",
    nt."CarbTarget",
    nt."FatTarget",
    COALESCE(d."TotalCalories", 0)  AS "TotalCalories",
    COALESCE(d."TotalProtein", 0)   AS "TotalProtein",
    COALESCE(d."TotalFat", 0)       AS "TotalFat",
    COALESCE(d."TotalCarb", 0)      AS "TotalCarb"
FROM "NutritionTarget" nt
CROSS JOIN LATERAL (
    SELECT dt."EatenDate", dt."TotalCalories", dt."TotalProtein", dt."TotalFat", dt."TotalCarb"
    FROM "vw_DailyNutritionTotals" dt
    WHERE dt."UserId" = nt."UserId"
) d
WHERE nt."EffectiveFrom" <= d."EatenDate"
  AND (nt."EffectiveTo" IS NULL OR nt."EffectiveTo" >= d."EatenDate");

-- View: AI Food Map (label → food item mapping)
CREATE OR REPLACE VIEW "vw_AiFoodMap" AS
SELECT DISTINCT ON (id."Label")
    id."Label",
    fi."FoodItemId",
    fi."FoodName",
    fi."CaloriesPer100g",
    fi."ProteinPer100g",
    fi."FatPer100g",
    fi."CarbPer100g",
    MIN(id."Confidence") AS "MinConfidence"
FROM "ImageDetection" id
INNER JOIN "AISuggestion" ais ON ais."AILogId" = id."AILogId"
INNER JOIN "FoodItem" fi ON fi."FoodItemId" = ais."FoodItemId"
WHERE fi."IsActive" = true AND fi."IsDeleted" = false
GROUP BY id."Label", fi."FoodItemId", fi."FoodName", fi."CaloriesPer100g", fi."ProteinPer100g", fi."FatPer100g", fi."CarbPer100g"
ORDER BY id."Label", MIN(id."Confidence") DESC;

-- ============================================================
-- TRIGGER: Auto-update UpdatedAt cho UserFoodItem
-- Thay thế SQL Server trigger tr_UserFoodItem_SetUpdatedAt
-- ============================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."UpdatedAt" = NOW() AT TIME ZONE 'UTC';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_userfooditem_set_updated_at
    BEFORE UPDATE ON "UserFoodItem"
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

-- Áp dụng trigger tương tự cho các bảng khác có UpdatedAt
CREATE TRIGGER tr_fooditem_set_updated_at
    BEFORE UPDATE ON "FoodItem"
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER tr_mealdiary_set_updated_at
    BEFORE UPDATE ON "MealDiary"
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER tr_userdish_set_updated_at
    BEFORE UPDATE ON "UserDish"
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER tr_recipe_set_updated_at
    BEFORE UPDATE ON "Recipe"
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER tr_userpreference_set_updated_at
    BEFORE UPDATE ON "UserPreference"
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- DONE! Schema ready for seeding via DatabaseSeeder.cs
-- ============================================================
