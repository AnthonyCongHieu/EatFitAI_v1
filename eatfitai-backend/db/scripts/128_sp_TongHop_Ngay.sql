SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
--  Thủ tục: sp_TongHop_Ngay
--  Mô tả  : Tổng hợp dinh dưỡng theo ngày
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_TongHop_Ngay]
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
    FROM [dbo].[DiaryEntry] AS e WITH (NOLOCK)
    WHERE e.UserId = @UserId AND e.MealDate = @MealDate;
END
GO

