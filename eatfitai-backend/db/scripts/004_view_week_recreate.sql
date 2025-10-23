SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
--  Doi tuong: View [dbo].[vw_TongHopDinhDuongTuan]
--  Mo ta   : Tong hop dinh duong theo tuan
-- =============================================
IF OBJECT_ID('dbo.vw_TongHopDinhDuongTuan', 'V') IS NOT NULL
    DROP VIEW [dbo].[vw_TongHopDinhDuongTuan];
GO
CREATE VIEW [dbo].[vw_TongHopDinhDuongTuan]
AS
WITH EntryWithWeek AS (
    SELECT
        de.UserId,
        CAST(de.MealDate AS date) AS MealDate,
        DATEADD(DAY, -((DATEPART(WEEKDAY, de.MealDate) + 5) % 7), de.MealDate) AS WeekStartDate,
        de.QuantityGrams,
        de.CaloriesKcal,
        de.ProteinGrams,
        de.CarbohydrateGrams,
        de.FatGrams
    FROM [dbo].[DiaryEntry] AS de
)
SELECT
    e.UserId,
    e.WeekStartDate,
    DATEADD(DAY, 6, e.WeekStartDate) AS WeekEndDate,
    SUM(e.QuantityGrams) AS TotalQuantityGrams,
    SUM(e.CaloriesKcal) AS TotalCaloriesKcal,
    SUM(e.ProteinGrams) AS TotalProteinGrams,
    SUM(e.CarbohydrateGrams) AS TotalCarbohydrateGrams,
    SUM(e.FatGrams) AS TotalFatGrams
FROM EntryWithWeek AS e
GROUP BY
    e.UserId,
    e.WeekStartDate;
GO

