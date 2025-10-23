SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
--  Doi tuong: View [dbo].[vw_TongHopDinhDuongNgay]
--  Mo ta   : Tong hop dinh duong theo ngay
-- =============================================
IF OBJECT_ID('dbo.vw_TongHopDinhDuongNgay', 'V') IS NOT NULL
    DROP VIEW [dbo].[vw_TongHopDinhDuongNgay];
GO
CREATE VIEW [dbo].[vw_TongHopDinhDuongNgay]
AS
SELECT
    de.UserId,
    de.MealDate,
    SUM(de.QuantityGrams) AS TotalQuantityGrams,
    SUM(de.CaloriesKcal) AS TotalCaloriesKcal,
    SUM(de.ProteinGrams) AS TotalProteinGrams,
    SUM(de.CarbohydrateGrams) AS TotalCarbohydrateGrams,
    SUM(de.FatGrams) AS TotalFatGrams
FROM [dbo].[DiaryEntry] AS de
GROUP BY
    de.UserId,
    de.MealDate;
GO

