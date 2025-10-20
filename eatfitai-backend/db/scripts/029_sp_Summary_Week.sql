CREATE OR ALTER PROCEDURE dbo.sp_Summary_Week
    @UserId UNIQUEIDENTIFIER,
    @EndDate DATE -- inclusive; 7-day window EndDate-6 .. EndDate
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @StartDate DATE = DATEADD(DAY, -6, @EndDate);

    SELECT
        e.MealDate,
        SUM(e.QuantityGrams) AS TotalQuantityGrams,
        SUM(e.CaloriesKcal) AS TotalCaloriesKcal,
        SUM(e.ProteinGrams) AS TotalProteinGrams,
        SUM(e.CarbohydrateGrams) AS TotalCarbohydrateGrams,
        SUM(e.FatGrams) AS TotalFatGrams
    FROM dbo.DiaryEntry AS e WITH (NOLOCK)
    WHERE e.UserId = @UserId AND e.MealDate BETWEEN @StartDate AND @EndDate
    GROUP BY e.MealDate
    ORDER BY e.MealDate;
END
GO

