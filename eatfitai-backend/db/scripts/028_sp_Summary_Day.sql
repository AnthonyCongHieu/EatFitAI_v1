CREATE OR ALTER PROCEDURE dbo.sp_Summary_Day
    @UserId UNIQUEIDENTIFIER,
    @MealDate DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        @MealDate AS MealDate,
        SUM(e.QuantityGrams) AS TotalQuantityGrams,
        SUM(e.CaloriesKcal) AS TotalCaloriesKcal,
        SUM(e.ProteinGrams) AS TotalProteinGrams,
        SUM(e.CarbohydrateGrams) AS TotalCarbohydrateGrams,
        SUM(e.FatGrams) AS TotalFatGrams
    FROM dbo.DiaryEntry AS e WITH (NOLOCK)
    WHERE e.UserId = @UserId AND e.MealDate = @MealDate;
END
GO

