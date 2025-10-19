-- Ensure database exists
IF DB_ID('EatFitAI') IS NULL
BEGIN
    EXEC ('CREATE DATABASE EatFitAI');
END;
GO

USE EatFitAI;
GO

SET NOCOUNT ON;

-- Ensure Source/ItemId columns exist for diary uniqueness
IF COL_LENGTH('dbo.NhatKyAnUong', 'Source') IS NULL
BEGIN
    ALTER TABLE dbo.NhatKyAnUong
    ADD Source VARCHAR(20) NOT NULL CONSTRAINT DF_NhatKyAnUong_Source DEFAULT 'food';
END;
GO

IF COL_LENGTH('dbo.NhatKyAnUong', 'ItemId') IS NULL
BEGIN
    ALTER TABLE dbo.NhatKyAnUong
    ADD ItemId BIGINT NULL;
END;
GO

-- Backfill Source & ItemId values and enforce NOT NULL
UPDATE nk
SET
    Source =
        CASE
            WHEN nk.MaThucPham IS NOT NULL THEN 'food'
            WHEN nk.MaMonNguoiDung IS NOT NULL THEN 'custom'
            WHEN nk.MaCongThuc IS NOT NULL THEN 'recipe'
            ELSE 'manual'
        END,
    ItemId = COALESCE(CAST(nk.MaThucPham AS BIGINT), nk.MaMonNguoiDung, nk.MaCongThuc, nk.MaNhatKy)
FROM dbo.NhatKyAnUong nk;

ALTER TABLE dbo.NhatKyAnUong
    ALTER COLUMN ItemId BIGINT NOT NULL;

IF EXISTS (
    SELECT 1 FROM sys.default_constraints
    WHERE name = 'DF_NhatKyAnUong_Source' AND parent_object_id = OBJECT_ID('dbo.NhatKyAnUong')
)
BEGIN
    ALTER TABLE dbo.NhatKyAnUong DROP CONSTRAINT DF_NhatKyAnUong_Source;
END;

-- Ensure unique index
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_NhatKyAnUong_ItemUniq'
      AND object_id = OBJECT_ID('dbo.NhatKyAnUong')
)
BEGIN
    CREATE UNIQUE INDEX UX_NhatKyAnUong_ItemUniq
    ON dbo.NhatKyAnUong (MaNguoiDung, NgayAn, MaBuaAn, ItemId, Source);
END;

-- Ensure lockout columns on NguoiDung
IF COL_LENGTH('dbo.NguoiDung', 'AccessFailedCount') IS NULL
BEGIN
    ALTER TABLE dbo.NguoiDung
    ADD AccessFailedCount INT NOT NULL CONSTRAINT DF_NguoiDung_AccessFailedCount DEFAULT 0;
END;

IF COL_LENGTH('dbo.NguoiDung', 'LockoutEnd') IS NULL
BEGIN
    ALTER TABLE dbo.NguoiDung
    ADD LockoutEnd DATETIMEOFFSET NULL;
END;

IF EXISTS (
    SELECT 1 FROM sys.default_constraints
    WHERE name = 'DF_NguoiDung_AccessFailedCount' AND parent_object_id = OBJECT_ID('dbo.NguoiDung')
)
BEGIN
    ALTER TABLE dbo.NguoiDung DROP CONSTRAINT DF_NguoiDung_AccessFailedCount;
END;

-- Create refresh token table
IF OBJECT_ID('dbo.RefreshTokens', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RefreshTokens
    (
        RefreshTokenId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_RefreshTokens PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        MaNguoiDung UNIQUEIDENTIFIER NOT NULL,
        Token NVARCHAR(256) NOT NULL,
        JwtId NVARCHAR(50) NULL,
        ExpiresAt DATETIMEOFFSET NOT NULL,
        CreatedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_RefreshTokens_CreatedAt DEFAULT SYSDATETIMEOFFSET(),
        CreatedByIp NVARCHAR(64) NULL,
        RevokedAt DATETIMEOFFSET NULL,
        RevokedByIp NVARCHAR(64) NULL,
        RevokedReason NVARCHAR(128) NULL,
        ReplacedByToken NVARCHAR(256) NULL
    );

    ALTER TABLE dbo.RefreshTokens
        ADD CONSTRAINT FK_RefreshTokens_NguoiDung FOREIGN KEY (MaNguoiDung)
        REFERENCES dbo.NguoiDung (MaNguoiDung) ON DELETE CASCADE;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UX_RefreshTokens_Token' AND object_id = OBJECT_ID('dbo.RefreshTokens')
)
BEGIN
    CREATE UNIQUE INDEX UX_RefreshTokens_Token ON dbo.RefreshTokens (Token);
END;

-- Seed LoaiBuaAn
MERGE dbo.LoaiBuaAn AS target
USING (VALUES
    ('BREAKFAST', N'Bua sang'),
    ('LUNCH', N'Bua trua'),
    ('DINNER', N'Bua toi'),
    ('SNACK', N'An vat'),
    ('SUPPER', N'Bua dem')
) AS source (MaBuaAn, TenBuaAn)
ON target.MaBuaAn = source.MaBuaAn
WHEN MATCHED THEN
    UPDATE SET TenBuaAn = source.TenBuaAn
WHEN NOT MATCHED THEN
    INSERT (MaBuaAn, TenBuaAn) VALUES (source.MaBuaAn, source.TenBuaAn);

-- Seed MucDoVanDong with HeSoTDEE
MERGE dbo.MucDoVanDong AS target
USING (VALUES
    ('SEDENTARY', N'It van dong', 1.200),
    ('LIGHT', N'Van dong nhe', 1.375),
    ('MODERATE', N'Van dong vua', 1.550),
    ('ACTIVE', N'Van dong nhieu', 1.725),
    ('VERY_ACTIVE', N'Rat van dong', 1.900)
) AS source (MaMucDo, TenMucDo, HeSoTdee)
ON target.MaMucDo = source.MaMucDo
WHEN MATCHED THEN
    UPDATE SET TenMucDo = source.TenMucDo, HeSoTdee = source.HeSoTdee
WHEN NOT MATCHED THEN
    INSERT (MaMucDo, TenMucDo, HeSoTdee) VALUES (source.MaMucDo, source.TenMucDo, source.HeSoTdee);

-- Seed MucTieu
MERGE dbo.MucTieu AS target
USING (VALUES
    ('MAINTAIN', N'Duy tri can nang'),
    ('LOSS', N'Giam can lanh manh'),
    ('GAIN', N'Tang can lanh manh'),
    ('RECOMP', N'Tang co giam mo')
) AS source (MaMucTieu, TenMucTieu)
ON target.MaMucTieu = source.MaMucTieu
WHEN MATCHED THEN
    UPDATE SET TenMucTieu = source.TenMucTieu
WHEN NOT MATCHED THEN
    INSERT (MaMucTieu, TenMucTieu) VALUES (source.MaMucTieu, source.TenMucTieu);

-- Seed ThucPham (>= 15 items)
MERGE dbo.ThucPham AS target
USING (VALUES
    (N'Com trang', N'Ngu coc', N'1 bat (150g)', 130.00, 2.70, 28.20, 0.30),
    (N'Pho bo', N'Mon Viet', N'1 to (250g)', 180.00, 12.00, 28.00, 4.00),
    (N'Bun cha', N'Mon Viet', N'1 phan (300g)', 420.00, 25.00, 45.00, 16.00),
    (N'Goi cuon tom thit', N'Mon Viet', N'2 cuon (120g)', 165.00, 12.00, 18.00, 5.00),
    (N'Ca hoi nuong', N'Hai san', N'1 mieng (120g)', 208.00, 22.00, 0.00, 13.00),
    (N'Ua bap', N'Trai cay', N'1 trai (90g)', 72.00, 1.00, 19.00, 0.50),
    (N'Sua chua khong duong', N'San pham sua', N'1 hop (100g)', 59.00, 3.80, 4.70, 3.30),
    (N'Oi', N'Trai cay', N'1 qua (110g)', 68.00, 2.60, 14.30, 0.90),
    (N'Trung ga luoc', N'Dam', N'1 qua (50g)', 73.00, 6.30, 0.40, 4.90),
    (N'Dau hu chien', N'Thuc vat', N'1 mieng (100g)', 271.00, 16.00, 8.00, 20.00),
    (N'Ca ngot luoc', N'Mon Viet', N'1 khuc (100g)', 160.00, 20.00, 3.00, 7.00),
    (N'Rau muong luoc', N'Rau cu', N'1 dia (100g)', 34.00, 2.80, 6.00, 0.50),
    (N'Khoai lang luoc', N'Thoi quen an', N'1 cua (130g)', 112.00, 2.00, 26.00, 0.10),
    (N'Ban mi trung', N'An sang', N'1 phan (150g)', 320.00, 12.00, 35.00, 14.00),
    (N'Che dau xanh', N'Trang mieng', N'1 chen (180g)', 280.00, 8.00, 52.00, 5.00),
    (N'Nuoc mia', N'Thuc uong', N'1 coc (200ml)', 180.00, 0.00, 47.00, 0.00),
    (N'Banh trang tron', N'An vat', N'1 phan (200g)', 460.00, 15.00, 55.00, 18.00)
) AS source (TenThucPham, PhanLoai, MoTaKhauPhan, Calo100g, Protein100g, Carb100g, Fat100g)
ON target.TenThucPham = source.TenThucPham
WHEN MATCHED THEN
    UPDATE SET
        target.PhanLoai = source.PhanLoai,
        target.MoTaKhauPhan = source.MoTaKhauPhan,
        target.Calo100g = source.Calo100g,
        target.Protein100g = source.Protein100g,
        target.Carb100g = source.Carb100g,
        target.Fat100g = source.Fat100g,
        target.TrangThai = 1
WHEN NOT MATCHED THEN
    INSERT (TenThucPham, PhanLoai, MoTaKhauPhan, Calo100g, Protein100g, Carb100g, Fat100g, TrangThai)
    VALUES (source.TenThucPham, source.PhanLoai, source.MoTaKhauPhan, source.Calo100g, source.Protein100g, source.Carb100g, source.Fat100g, 1);

-- Drop and recreate nutrition aggregate views
IF OBJECT_ID('dbo.vw_TongHopDinhDuongNgay', 'V') IS NOT NULL
BEGIN
    DROP VIEW dbo.vw_TongHopDinhDuongNgay;
END;
GO

CREATE VIEW dbo.vw_TongHopDinhDuongNgay
AS
SELECT
    nk.MaNguoiDung,
    nk.NgayAn,
    SUM(nk.Calo) AS TongCalo,
    SUM(nk.Protein) AS TongProtein,
    SUM(nk.Carb) AS TongCarb,
    SUM(nk.Fat) AS TongFat
FROM dbo.NhatKyAnUong AS nk
GROUP BY nk.MaNguoiDung, nk.NgayAn;
GO

IF OBJECT_ID('dbo.vw_TongHopDinhDuongTuan', 'V') IS NOT NULL
BEGIN
    DROP VIEW dbo.vw_TongHopDinhDuongTuan;
END;
GO

CREATE VIEW dbo.vw_TongHopDinhDuongTuan
AS
WITH DiaryWithWeek AS (
    SELECT
        nk.MaNguoiDung,
        nk.Calo,
        nk.Protein,
        nk.Carb,
        nk.Fat,
        nk.NgayAn,
        CAST(nk.NgayAn AS DATETIME2(0)) AS NgayAnDateTime,
        DATEADD(DAY, -((DATEPART(WEEKDAY, CAST(nk.NgayAn AS DATETIME)) + 5) % 7), CAST(nk.NgayAn AS DATETIME)) AS WeekStartDate
    FROM dbo.NhatKyAnUong AS nk
)
SELECT
    d.MaNguoiDung,
    CAST(d.WeekStartDate AS DATE) AS TuanBatDau,
    CAST(DATEADD(DAY, 6, d.WeekStartDate) AS DATE) AS TuanKetThuc,
    SUM(d.Calo) AS TongCalo,
    SUM(d.Protein) AS TongProtein,
    SUM(d.Carb) AS TongCarb,
    SUM(d.Fat) AS TongFat
FROM DiaryWithWeek AS d
GROUP BY d.MaNguoiDung, d.WeekStartDate;
GO
