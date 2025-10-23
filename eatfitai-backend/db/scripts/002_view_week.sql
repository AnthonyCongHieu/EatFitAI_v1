IF OBJECT_ID('dbo.vw_TongHopDinhDuongTuan', 'V') IS NOT NULL
    DROP VIEW dbo.vw_TongHopDinhDuongTuan;
GO
CREATE VIEW dbo.vw_TongHopDinhDuongTuan
AS
WITH EntryWithWeek AS (
    SELECT
        nk.MaNguoiDung,
        nk.NgayAn,
        DATEADD(DAY, 1, DATEADD(WEEK, DATEDIFF(WEEK, 0, DATEADD(DAY, -1, nk.NgayAn)), 0)) AS TuanBatDau,
        nk.KhoiLuongGram,
        nk.Calo,
        nk.Protein,
        nk.Carb,
        nk.Fat
    FROM dbo.NhatKyAnUong AS nk
)
SELECT
    e.MaNguoiDung,
    e.TuanBatDau,
    DATEADD(DAY, 6, e.TuanBatDau) AS TuanKetThuc,
    SUM(e.KhoiLuongGram) AS TongKhoiLuongGram,
    SUM(e.Calo) AS TongCalo,
    SUM(e.Protein) AS TongProtein,
    SUM(e.Carb) AS TongCarb,
    SUM(e.Fat) AS TongFat
FROM EntryWithWeek AS e
GROUP BY
    e.MaNguoiDung,
    e.TuanBatDau;
GO
