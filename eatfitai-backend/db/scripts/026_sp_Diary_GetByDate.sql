CREATE OR ALTER PROCEDURE dbo.sp_Diary_GetByDate
    @UserId UNIQUEIDENTIFIER,
    @MealDate DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT e.Id,
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
    WHERE e.UserId = @UserId AND e.MealDate = @MealDate
    ORDER BY e.MealCode, e.CreatedAt;
END
GO

