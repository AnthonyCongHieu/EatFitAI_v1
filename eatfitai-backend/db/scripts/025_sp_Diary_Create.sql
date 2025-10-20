CREATE OR ALTER PROCEDURE dbo.sp_Diary_Create
    @UserId UNIQUEIDENTIFIER,
    @MealDate DATE,
    @MealCode NVARCHAR(32),
    @Source NVARCHAR(32), -- 'Food' or 'CustomDish'
    @ItemId UNIQUEIDENTIFIER,
    @QuantityGrams DECIMAL(9,2),
    @Notes NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @FoodId UNIQUEIDENTIFIER = NULL;
    DECLARE @CustomDishId UNIQUEIDENTIFIER = NULL;
    DECLARE @ItemSource NVARCHAR(32) = UPPER(@Source);

    DECLARE @PerGramCalories DECIMAL(18,10) = 0.0;
    DECLARE @PerGramProtein DECIMAL(18,10) = 0.0;
    DECLARE @PerGramCarb DECIMAL(18,10) = 0.0;
    DECLARE @PerGramFat DECIMAL(18,10) = 0.0;

    IF @ItemSource = 'FOOD'
    BEGIN
        SELECT TOP (1)
            @PerGramCalories = CASE WHEN f.ServingSizeGrams > 0 THEN f.CaloriesKcal / f.ServingSizeGrams ELSE 0 END,
            @PerGramProtein = CASE WHEN f.ServingSizeGrams > 0 THEN f.ProteinGrams / f.ServingSizeGrams ELSE 0 END,
            @PerGramCarb = CASE WHEN f.ServingSizeGrams > 0 THEN f.CarbohydrateGrams / f.ServingSizeGrams ELSE 0 END,
            @PerGramFat = CASE WHEN f.ServingSizeGrams > 0 THEN f.FatGrams / f.ServingSizeGrams ELSE 0 END,
            @FoodId = f.Id
        FROM dbo.Food AS f WITH (NOLOCK)
        WHERE f.Id = @ItemId;
        IF @FoodId IS NULL THROW 50002, 'Food not found', 1;
    END
    ELSE IF @ItemSource = 'CUSTOMDISH' OR @ItemSource = 'CUSTOM_DISH'
    BEGIN
        SELECT TOP (1)
            @PerGramCalories = CASE WHEN d.PortionSizeGrams > 0 THEN d.CaloriesKcal / d.PortionSizeGrams ELSE 0 END,
            @PerGramProtein = CASE WHEN d.PortionSizeGrams > 0 THEN d.ProteinGrams / d.PortionSizeGrams ELSE 0 END,
            @PerGramCarb = CASE WHEN d.PortionSizeGrams > 0 THEN d.CarbohydrateGrams / d.PortionSizeGrams ELSE 0 END,
            @PerGramFat = CASE WHEN d.PortionSizeGrams > 0 THEN d.FatGrams / d.PortionSizeGrams ELSE 0 END,
            @CustomDishId = d.Id
        FROM dbo.CustomDish AS d WITH (NOLOCK)
        WHERE d.Id = @ItemId AND d.UserId = @UserId;
        IF @CustomDishId IS NULL THROW 50003, 'Custom dish not found', 1;
    END
    ELSE
    BEGIN
        THROW 50004, 'Unsupported source', 1;
    END

    DECLARE @Calories DECIMAL(10,2) = @PerGramCalories * @QuantityGrams;
    DECLARE @Protein DECIMAL(9,2) = @PerGramProtein * @QuantityGrams;
    DECLARE @Carb DECIMAL(9,2) = @PerGramCarb * @QuantityGrams;
    DECLARE @Fat DECIMAL(9,2) = @PerGramFat * @QuantityGrams;

    DECLARE @Id UNIQUEIDENTIFIER = NEWID();

    INSERT INTO dbo.DiaryEntry
    (Id, UserId, MealDate, MealCode, FoodId, CustomDishId, AiRecipeId, ItemId, Source, QuantityGrams, CaloriesKcal, ProteinGrams, CarbohydrateGrams, FatGrams, Notes, CreatedAt)
    VALUES
    (@Id, @UserId, @MealDate, @MealCode, @FoodId, @CustomDishId, NULL, @ItemId, @Source, @QuantityGrams, @Calories, @Protein, @Carb, @Fat, @Notes, SYSUTCDATETIME());

    SELECT TOP (1)
        e.Id,
        e.UserId,
        e.MealDate,
        e.MealCode,
        e.FoodId,
        e.CustomDishId,
        e.AiRecipeId,
        e.ItemId,
        e.Source,
        e.QuantityGrams,
        e.CaloriesKcal,
        e.ProteinGrams,
        e.CarbohydrateGrams,
        e.FatGrams,
        e.Notes,
        e.CreatedAt,
        e.UpdatedAt
    FROM dbo.DiaryEntry AS e WITH (NOLOCK)
    WHERE e.Id = @Id;
END
GO

