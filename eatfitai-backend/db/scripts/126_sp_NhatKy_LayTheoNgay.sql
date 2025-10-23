SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
--  Thủ tục: sp_NhatKy_LayTheoNgay
--  Mô tả  : Lấy các bản ghi nhật ký theo ngày
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_NhatKy_LayTheoNgay]
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
    FROM [dbo].[DiaryEntry] AS e WITH (NOLOCK)
    WHERE e.UserId = @UserId AND e.MealDate = @MealDate
    ORDER BY e.MealCode, e.CreatedAt;
END
GO

