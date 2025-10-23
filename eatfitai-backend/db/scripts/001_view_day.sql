IF OBJECT_ID('dbo.vw_TongHopDinhDuongNgay', 'V') IS NOT NULL
    DROP VIEW dbo.vw_TongHopDinhDuongNgay;
GO
CREATE VIEW dbo.vw_TongHopDinhDuongNgay
AS
SELECT
    nk.MaNguoiDung AS MaNguoiDung,
    nk.NgayAn AS NgayAn,
    SUM(nk.KhoiLuongGram) AS TongKhoiLuongGram,
    SUM(nk.Calo) AS TongCalo,
    SUM(nk.Protein) AS TongProtein,
    SUM(nk.Carb) AS TongCarb,
    SUM(nk.Fat) AS TongFat
FROM dbo.NhatKyAnUong AS nk
GROUP BY
    nk.MaNguoiDung,
    nk.NgayAn;
GO
