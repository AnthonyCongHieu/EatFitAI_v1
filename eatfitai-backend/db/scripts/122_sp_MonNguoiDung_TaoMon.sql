SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
--  Thủ tục: sp_MonNguoiDung_TaoMon
--  Mô tả  : Tạo món người dùng (từ danh sách nguyên liệu JSON)
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_MonNguoiDung_TaoMon]
    @UserId UNIQUEIDENTIFIER,
    @Name NVARCHAR(200),
    @Description NVARCHAR(MAX) = NULL,
    @IngredientsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    -- Dinh dang JSON: [{ "foodId": "GUID|NULL", "name": "text", "quantityGrams": 100.0, "caloriesKcal": 123.45, "proteinGrams": 10.0, "carbohydrateGrams": 20.0, "fatGrams": 5.0 }]

    DECLARE @Ingredients TABLE (
        FoodId UNIQUEIDENTIFIER NULL,
        Name NVARCHAR(200) NOT NULL,
        QuantityGrams DECIMAL(9,2) NOT NULL,
        CaloriesKcal DECIMAL(10,2) NOT NULL,
        ProteinGrams DECIMAL(9,2) NOT NULL,
        CarbohydrateGrams DECIMAL(9,2) NOT NULL,
        FatGrams DECIMAL(9,2) NOT NULL
    );

    INSERT INTO @Ingredients (FoodId, Name, QuantityGrams, CaloriesKcal, ProteinGrams, CarbohydrateGrams, FatGrams)
    SELECT 
        TRY_CONVERT(UNIQUEIDENTIFIER, JSON_VALUE(j.value, '$.foodId')),
        JSON_VALUE(j.value, '$.name'),
        TRY_CONVERT(DECIMAL(9,2), JSON_VALUE(j.value, '$.quantityGrams')),
        TRY_CONVERT(DECIMAL(10,2), JSON_VALUE(j.value, '$.caloriesKcal')),
        TRY_CONVERT(DECIMAL(9,2), JSON_VALUE(j.value, '$.proteinGrams')),
        TRY_CONVERT(DECIMAL(9,2), JSON_VALUE(j.value, '$.carbohydrateGrams')),
        TRY_CONVERT(DECIMAL(9,2), JSON_VALUE(j.value, '$.fatGrams'))
    FROM OPENJSON(@IngredientsJson) AS j;

    IF NOT EXISTS (SELECT 1 FROM @Ingredients) BEGIN
        THROW 50001, 'Ingredients required', 1;
    END

    DECLARE @PortionSizeGrams DECIMAL(9,2) = (
        SELECT SUM(QuantityGrams) FROM @Ingredients
    );

    DECLARE @CaloriesKcal DECIMAL(10,2) = (
        SELECT SUM(CaloriesKcal) FROM @Ingredients
    );
    DECLARE @ProteinGrams DECIMAL(9,2) = (
        SELECT SUM(ProteinGrams) FROM @Ingredients
    );
    DECLARE @CarbohydrateGrams DECIMAL(9,2) = (
        SELECT SUM(CarbohydrateGrams) FROM @Ingredients
    );
    DECLARE @FatGrams DECIMAL(9,2) = (
        SELECT SUM(FatGrams) FROM @Ingredients
    );

    DECLARE @Id UNIQUEIDENTIFIER = NEWID();

    BEGIN TRAN;
    BEGIN TRY
        INSERT INTO [dbo].[CustomDish]
        (Id, UserId, Name, Description, PortionSizeGrams, CaloriesKcal, ProteinGrams, CarbohydrateGrams, FatGrams, CreatedAt)
        VALUES
        (@Id, @UserId, @Name, @Description, @PortionSizeGrams, @CaloriesKcal, @ProteinGrams, @CarbohydrateGrams, @FatGrams, SYSUTCDATETIME());

        INSERT INTO [dbo].[CustomDishIngredient]
        (Id, CustomDishId, FoodId, Name, QuantityGrams, CaloriesKcal, ProteinGrams, CarbohydrateGrams, FatGrams)
        SELECT NEWID(), @Id, FoodId, Name, QuantityGrams, CaloriesKcal, ProteinGrams, CarbohydrateGrams, FatGrams
        FROM @Ingredients;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        THROW;
    END CATCH

    SELECT TOP (1)
        d.Id,
        d.UserId,
        d.Name,
        d.Description,
        d.PortionSizeGrams,
        d.CaloriesKcal,
        d.ProteinGrams,
        d.CarbohydrateGrams,
        d.FatGrams,
        d.CreatedAt,
        d.UpdatedAt
    FROM [dbo].[CustomDish] AS d WITH (NOLOCK)
    WHERE d.Id = @Id;
END
GO

