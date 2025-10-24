USE [EatFitAI]
GO

/*=========================
  EatFitAI — DDL chuẩn hoá Việt hoá (PascalCase, ngắn gọn)
  Ghi chú:
  - Giữ các thuật ngữ chuyên biệt: RefreshToken, Token, v.v. theo yêu cầu.
  - Đã Việt hoá các cột/bảng còn lại cho nhất quán.
  - File này là phiên bản "đầy đủ" sau chỉnh sửa, có thể chạy trên DB trống.
=========================*/

/*--------------------------------------
  0) Bảng lịch sử áp dụng script
--------------------------------------*/
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LichSuCapNhat]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[LichSuCapNhat](
        [TenFile]          [nvarchar](255)  NOT NULL,
        [ThoiGianApDung]   [datetime2](0)  NOT NULL,
        CONSTRAINT [PK_LichSuCapNhat] PRIMARY KEY CLUSTERED ([TenFile] ASC)
    ) ON [PRIMARY];
    
    ALTER TABLE [dbo].[LichSuCapNhat]
    ADD CONSTRAINT [DF_LichSuCapNhat_ThoiGianApDung] DEFAULT (SYSUTCDATETIME()) FOR [ThoiGianApDung];
END
GO

/*--------------------------------------
  1) Bảng lõi
--------------------------------------*/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 1.1 Người dùng
IF OBJECT_ID(N'[dbo].[NguoiDung]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[NguoiDung](
        [MaNguoiDung]   [uniqueidentifier] NOT NULL,
        [Email]         [nvarchar](255)    NOT NULL,
        [MatKhauHash]   [varbinary](256)   NOT NULL,
        [HoTen]         [nvarchar](150)    NULL,
        [GioiTinh]      [char](1)          NULL,
        [NgaySinh]      [date]             NULL,
        [NgayTao]       [datetime2](0)     NOT NULL,
        [NgayCapNhat]   [datetime2](0)     NOT NULL,
        CONSTRAINT [PK_NguoiDung] PRIMARY KEY CLUSTERED ([MaNguoiDung] ASC),
        CONSTRAINT [UQ_NguoiDung_Email] UNIQUE NONCLUSTERED ([Email] ASC)
    ) ON [PRIMARY];
END
GO

-- 1.2 Mức độ vận động
IF OBJECT_ID(N'[dbo].[MucDoVanDong]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MucDoVanDong](
        [MaMucDo]   [varchar](20)    NOT NULL,
        [TenMucDo]  [nvarchar](100)  NOT NULL,
        [MoTa]      [nvarchar](200)  NULL,
        [HeSoTDEE]  [decimal](5,3)   NOT NULL,
        CONSTRAINT [PK_MucDoVanDong] PRIMARY KEY CLUSTERED ([MaMucDo] ASC)
    ) ON [PRIMARY];
END
GO

-- 1.3 Mục tiêu
IF OBJECT_ID(N'[dbo].[MucTieu]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MucTieu](
        [MaMucTieu]  [varchar](20)    NOT NULL,
        [TenMucTieu] [nvarchar](100)  NOT NULL,
        [MoTa]       [nvarchar](200)  NULL,
        CONSTRAINT [PK_MucTieu] PRIMARY KEY CLUSTERED ([MaMucTieu] ASC)
    ) ON [PRIMARY];
END
GO

-- 1.4 Thực phẩm (đã đổi PhanLoai -> NhomThucPham)
IF OBJECT_ID(N'[dbo].[ThucPham]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ThucPham](
        [MaThucPham]     [bigint] IDENTITY(1,1) NOT NULL,
        [TenThucPham]    [nvarchar](200)       NOT NULL,
        [NhomThucPham]   [nvarchar](100)       NULL,
        [MoTaKhauPhan]   [nvarchar](100)       NULL,
        [Calo100g]       [decimal](8,2)        NOT NULL,
        [Protein100g]    [decimal](8,2)        NOT NULL,
        [Carb100g]       [decimal](8,2)        NOT NULL,
        [Fat100g]        [decimal](8,2)        NOT NULL,
        [HinhAnh]        [nvarchar](400)       NULL,
        [TrangThai]      [bit]                 NOT NULL,
        CONSTRAINT [PK_ThucPham] PRIMARY KEY CLUSTERED ([MaThucPham] ASC)
    ) ON [PRIMARY];
END
GO

-- 1.5 Công thức (đã đổi LoaiAmThuc -> LoaiMon, HuongDan -> HuongDanCheBien)
IF OBJECT_ID(N'[dbo].[CongThuc]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[CongThuc](
        [MaCongThuc]           [bigint] IDENTITY(1,1) NOT NULL,
        [TenCongThuc]          [nvarchar](200)        NOT NULL,
        [LoaiMon]              [nvarchar](100)        NULL,
        [ThoiGianUocTinhPhut]  [int]                  NULL,
        [HuongDanCheBien]      [nvarchar](max)        NULL,
        [HinhAnh]              [nvarchar](400)        NULL,
        [TrangThai]            [bit]                  NOT NULL,
        CONSTRAINT [PK_CongThuc] PRIMARY KEY CLUSTERED ([MaCongThuc] ASC)
    ) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY];
END
GO

-- 1.6 Loại bữa ăn
IF OBJECT_ID(N'[dbo].[LoaiBuaAn]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[LoaiBuaAn](
        [MaBuaAn]  [varchar](20)   NOT NULL,
        [TenBuaAn] [nvarchar](50)  NOT NULL,
        CONSTRAINT [PK_LoaiBuaAn] PRIMARY KEY CLUSTERED ([MaBuaAn] ASC)
    ) ON [PRIMARY];
END
GO

-- 1.7 Món người dùng
IF OBJECT_ID(N'[dbo].[MonNguoiDung]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MonNguoiDung](
        [MaMonNguoiDung] [bigint] IDENTITY(1,1) NOT NULL,
        [MaNguoiDung]    [uniqueidentifier]     NOT NULL,
        [TenMon]         [nvarchar](200)        NOT NULL,
        [Calo100g]       [decimal](8,2)         NOT NULL,
        [Protein100g]    [decimal](8,2)         NOT NULL,
        [Carb100g]       [decimal](8,2)         NOT NULL,
        [Fat100g]        [decimal](8,2)         NOT NULL,
        [GhiChu]         [nvarchar](200)        NULL,
        [NgayTao]        [datetime2](0)         NOT NULL,
        CONSTRAINT [PK_MonNguoiDung] PRIMARY KEY CLUSTERED ([MaMonNguoiDung] ASC)
    ) ON [PRIMARY];
END
GO

-- 1.8 Mục tiêu dinh dưỡng
IF OBJECT_ID(N'[dbo].[MucTieuDinhDuong]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MucTieuDinhDuong](
        [MaMucTieuDD]  [bigint] IDENTITY(1,1) NOT NULL,
        [MaNguoiDung]  [uniqueidentifier]     NOT NULL,
        [HieuLucTuNgay][datetime2](0)         NOT NULL,
        [CaloKcal]     [int]                  NOT NULL,
        [ProteinG]     [decimal](8,2)         NOT NULL,
        [CarbG]        [decimal](8,2)         NOT NULL,
        [FatG]         [decimal](8,2)         NOT NULL,
        [Nguon]        [varchar](20)          NOT NULL,
        [LyDo]         [nvarchar](200)        NULL,
        [NgayTao]      [datetime2](0)         NOT NULL,
        CONSTRAINT [PK_MucTieuDinhDuong] PRIMARY KEY CLUSTERED ([MaMucTieuDD] ASC)
    ) ON [PRIMARY];
END
GO

-- 1.9 Chỉ số cơ thể
IF OBJECT_ID(N'[dbo].[ChiSoCoThe]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ChiSoCoThe](
        [MaChiSo]      [bigint] IDENTITY(1,1) NOT NULL,
        [MaNguoiDung]  [uniqueidentifier]     NOT NULL,
        [ChieuCaoCm]   [decimal](6,2)         NULL,
        [CanNangKg]    [decimal](6,2)         NULL,
        [MaMucDo]      [varchar](20)          NULL,
        [MaMucTieu]    [varchar](20)          NULL,
        [NgayCapNhat]  [datetime2](0)         NOT NULL,
        [GhiChu]       [nvarchar](200)        NULL,
        CONSTRAINT [PK_ChiSoCoThe] PRIMARY KEY CLUSTERED ([MaChiSo] ASC)
    ) ON [PRIMARY];
END
GO

-- 1.10 Hồ sơ người dùng (đã đổi MucDoHoatDong -> MucDoVanDong)
IF OBJECT_ID(N'[dbo].[HoSoNguoiDung]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[HoSoNguoiDung](
        [MaNguoiDung]        [uniqueidentifier] NOT NULL,
        [MucDoVanDong]       [nvarchar](4000)   NULL,
        [AnhDaiDienUrl]      [nvarchar](4000)   NULL,
        [NgaySinh]           [date]             NULL,
        [HoTen]              [nvarchar](4000)   NULL,
        [GioiTinh]           [nvarchar](4000)   NULL,
        [MucTieu]            [nvarchar](4000)   NULL,
        [ChieuCaoCm]         [decimal](9,2)     NULL,
        [CanNangMucTieuKg]   [decimal](9,2)     NULL,
        [NgayCapNhat]        [datetime2](0)     NOT NULL,
        [NgayTao]            [datetime2](0)     NOT NULL,
        CONSTRAINT [PK_HoSoNguoiDung] PRIMARY KEY CLUSTERED ([MaNguoiDung] ASC)
    ) ON [PRIMARY];
END
GO

-- 1.11 Nhật ký AI (đã đổi LoaiGoiY -> LoaiDeXuat)
IF OBJECT_ID(N'[dbo].[NhatKyAI]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[NhatKyAI](
        [MaGoiYAI]         [bigint] IDENTITY(1,1) NOT NULL,
        [MaNguoiDung]      [uniqueidentifier]     NULL,
        [LoaiDeXuat]       [varchar](20)          NOT NULL,
        [DuLieuDauVao]     [nvarchar](max)        NOT NULL,
        [KetQuaAI]         [nvarchar](max)        NULL,
        [ThoiGianTao]      [datetime2](0)         NOT NULL,
        [ThoiLuongXuLyMs]  [int]                  NULL,
        CONSTRAINT [PK_NhatKyAI] PRIMARY KEY CLUSTERED ([MaGoiYAI] ASC)
    ) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY];
END
GO

-- 1.12 Nguyên liệu công thức
IF OBJECT_ID(N'[dbo].[NguyenLieuCongThuc]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[NguyenLieuCongThuc](
        [MaNguyenLieu]  [bigint] IDENTITY(1,1) NOT NULL,
        [MaCongThuc]    [bigint]               NOT NULL,
        [MaThucPham]    [bigint]               NOT NULL,
        [KhoiLuongGram] [decimal](10,2)        NOT NULL,
        CONSTRAINT [PK_NguyenLieuCongThuc] PRIMARY KEY CLUSTERED ([MaNguyenLieu] ASC)
    ) ON [PRIMARY];
END
GO

-- 1.13 Nhận diện ảnh
IF OBJECT_ID(N'[dbo].[NhanDienAnh]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[NhanDienAnh](
        [MaNhanDien] [bigint] IDENTITY(1,1) NOT NULL,
        [MaGoiYAI]   [bigint]               NOT NULL,
        [Nhan]       [nvarchar](200)        NOT NULL,
        [DoTinCay]   [decimal](5,4)         NULL,
        CONSTRAINT [PK_NhanDienAnh] PRIMARY KEY CLUSTERED ([MaNhanDien] ASC)
    ) ON [PRIMARY];
END
GO

-- 1.14 RefreshToken (giữ nguyên thuật ngữ chuyên biệt)
IF OBJECT_ID(N'[dbo].[RefreshToken]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RefreshToken](
        [MaRefreshToken]   [uniqueidentifier] NOT NULL,
        [NgayTao]          [datetime2](0)     NOT NULL,
        [TaoBoiIP]         [nvarchar](45)     NULL,
        [HetHanVao]        [datetime2](0)     NOT NULL,
        [LyDoThuHoi]       [nvarchar](4000)   NULL,
        [ThayTheBangToken] [nvarchar](450)    NULL,
        [ThuHoiVao]        [datetime2](0)     NULL,
        [ThuHoiBoiIP]      [nvarchar](45)     NULL,
        [Token]            [nvarchar](450)    NOT NULL,
        [MaNguoiDung]      [uniqueidentifier] NOT NULL,
        CONSTRAINT [PK_RefreshToken] PRIMARY KEY CLUSTERED ([MaRefreshToken] ASC)
    ) ON [PRIMARY];
END
GO

-- 1.15 Nhật ký ăn uống (đã đổi MaCongThucAI -> MaCongThuc)
IF OBJECT_ID(N'[dbo].[NhatKyAnUong]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[NhatKyAnUong](
        [MaNhatKy]      [bigint] IDENTITY(1,1) NOT NULL,
        [MaNguoiDung]   [uniqueidentifier]     NOT NULL,
        [NgayAn]        [date]                 NOT NULL,
        [MaBuaAn]       [varchar](20)          NOT NULL,
        [MaThucPham]    [bigint]               NULL,
        [MaMonNguoiDung][bigint]               NULL,
        [MaCongThuc]    [bigint]               NULL,
        [KhoiLuongGram] [decimal](10,2)        NOT NULL,
        [Calo]          [decimal](10,2)        NOT NULL,
        [Protein]       [decimal](10,2)        NOT NULL,
        [Carb]          [decimal](10,2)        NOT NULL,
        [Fat]           [decimal](10,2)        NOT NULL,
        [NgayTao]       [datetime2](0)         NOT NULL,
        CONSTRAINT [PK_NhatKyAnUong] PRIMARY KEY CLUSTERED ([MaNhatKy] ASC)
    ) ON [PRIMARY];
END
GO

/*--------------------------------------
  2) VIEW tổng hợp (giữ tên)
--------------------------------------*/
IF OBJECT_ID(N'[dbo].[VwTongHopDinhDuongNgay]', N'V') IS NOT NULL
    DROP VIEW [dbo].[VwTongHopDinhDuongNgay];
GO
CREATE VIEW [dbo].[VwTongHopDinhDuongNgay]
AS
SELECT
    MaNguoiDung,
    NgayAn,
    SUM(Calo)    AS TongCalo,
    SUM(Protein) AS TongProtein,
    SUM(Carb)    AS TongCarb,
    SUM(Fat)     AS TongFat
FROM dbo.NhatKyAnUong
GROUP BY MaNguoiDung, NgayAn;
GO

IF OBJECT_ID(N'[dbo].[VwTongHopDinhDuongTuan]', N'V') IS NOT NULL
    DROP VIEW [dbo].[VwTongHopDinhDuongTuan];
GO
CREATE VIEW [dbo].[VwTongHopDinhDuongTuan]
AS
SELECT
    MaNguoiDung,
    DATEADD(DAY, 1, DATEADD(WEEK, DATEDIFF(WEEK, 0, DATEADD(DAY, -1, NgayAn)), 0)) AS TuanBatDau,
    DATEADD(DAY, 6, DATEADD(DAY, 1, DATEADD(WEEK, DATEDIFF(WEEK, 0, DATEADD(DAY, -1, NgayAn)), 0)))       AS TuanKetThuc,
    SUM(Calo)    AS TongCalo,
    SUM(Protein) AS TongProtein,
    SUM(Carb)    AS TongCarb,
    SUM(Fat)     AS TongFat
FROM dbo.NhatKyAnUong
GROUP BY MaNguoiDung,
         DATEADD(DAY, 1, DATEADD(WEEK, DATEDIFF(WEEK, 0, DATEADD(DAY, -1, NgayAn)), 0));
GO

/*--------------------------------------
  3) DEFAULT constraints
--------------------------------------*/
ALTER TABLE [dbo].[ChiSoCoThe]       ADD CONSTRAINT [DF_ChiSoCoThe_NgayCapNhat]          DEFAULT (sysdatetime()) FOR [NgayCapNhat];
ALTER TABLE [dbo].[CongThuc]         ADD CONSTRAINT [DF_CongThuc_TrangThai]              DEFAULT ((1))          FOR [TrangThai];
ALTER TABLE [dbo].[MonNguoiDung]     ADD CONSTRAINT [DF_MonNguoiDung_NgayTao]            DEFAULT (sysdatetime()) FOR [NgayTao];
ALTER TABLE [dbo].[MucTieuDinhDuong] ADD CONSTRAINT [DF_MucTieuDinhDuong_HieuLucTuNgay]  DEFAULT (sysdatetime()) FOR [HieuLucTuNgay];
ALTER TABLE [dbo].[MucTieuDinhDuong] ADD CONSTRAINT [DF_MucTieuDinhDuong_NgayTao]        DEFAULT (sysdatetime()) FOR [NgayTao];
ALTER TABLE [dbo].[NguoiDung]        ADD CONSTRAINT [DF_NguoiDung_MaNguoiDung]           DEFAULT (newid())      FOR [MaNguoiDung];
ALTER TABLE [dbo].[NguoiDung]        ADD CONSTRAINT [DF_NguoiDung_NgayTao]               DEFAULT (sysdatetime()) FOR [NgayTao];
ALTER TABLE [dbo].[NguoiDung]        ADD CONSTRAINT [DF_NguoiDung_NgayCapNhat]           DEFAULT (sysdatetime()) FOR [NgayCapNhat];
ALTER TABLE [dbo].[NhatKyAI]         ADD CONSTRAINT [DF_NhatKyAI_ThoiGianTao]            DEFAULT (sysdatetime()) FOR [ThoiGianTao];
ALTER TABLE [dbo].[NhatKyAnUong]     ADD CONSTRAINT [DF_NhatKyAnUong_NgayTao]            DEFAULT (sysdatetime()) FOR [NgayTao];
ALTER TABLE [dbo].[ThucPham]         ADD CONSTRAINT [DF_ThucPham_TrangThai]              DEFAULT ((1))          FOR [TrangThai];
GO

/*--------------------------------------
  4) FOREIGN KEY constraints
--------------------------------------*/
ALTER TABLE [dbo].[ChiSoCoThe]        WITH CHECK ADD CONSTRAINT [FK_ChiSoCoThe_MucDo]          FOREIGN KEY([MaMucDo])    REFERENCES [dbo].[MucDoVanDong] ([MaMucDo]);
ALTER TABLE [dbo].[ChiSoCoThe]        CHECK CONSTRAINT [FK_ChiSoCoThe_MucDo];

ALTER TABLE [dbo].[ChiSoCoThe]        WITH CHECK ADD CONSTRAINT [FK_ChiSoCoThe_MucTieu]        FOREIGN KEY([MaMucTieu])  REFERENCES [dbo].[MucTieu] ([MaMucTieu]);
ALTER TABLE [dbo].[ChiSoCoThe]        CHECK CONSTRAINT [FK_ChiSoCoThe_MucTieu];

ALTER TABLE [dbo].[ChiSoCoThe]        WITH CHECK ADD CONSTRAINT [FK_ChiSoCoThe_NguoiDung]      FOREIGN KEY([MaNguoiDung]) REFERENCES [dbo].[NguoiDung] ([MaNguoiDung]);
ALTER TABLE [dbo].[ChiSoCoThe]        CHECK CONSTRAINT [FK_ChiSoCoThe_NguoiDung];

ALTER TABLE [dbo].[MonNguoiDung]      WITH CHECK ADD CONSTRAINT [FK_MonNguoiDung_NguoiDung]    FOREIGN KEY([MaNguoiDung]) REFERENCES [dbo].[NguoiDung] ([MaNguoiDung]);
ALTER TABLE [dbo].[MonNguoiDung]      CHECK CONSTRAINT [FK_MonNguoiDung_NguoiDung];

ALTER TABLE [dbo].[MucTieuDinhDuong]  WITH CHECK ADD CONSTRAINT [FK_MucTieuDD_NguoiDung]       FOREIGN KEY([MaNguoiDung]) REFERENCES [dbo].[NguoiDung] ([MaNguoiDung]);
ALTER TABLE [dbo].[MucTieuDinhDuong]  CHECK CONSTRAINT [FK_MucTieuDD_NguoiDung];

ALTER TABLE [dbo].[NguyenLieuCongThuc] WITH CHECK ADD CONSTRAINT [FK_NguyenLieuCongThuc_CongThuc] FOREIGN KEY([MaCongThuc]) REFERENCES [dbo].[CongThuc] ([MaCongThuc]) ON DELETE CASCADE;
ALTER TABLE [dbo].[NguyenLieuCongThuc] CHECK CONSTRAINT [FK_NguyenLieuCongThuc_CongThuc];

ALTER TABLE [dbo].[NguyenLieuCongThuc] WITH CHECK ADD CONSTRAINT [FK_NguyenLieuCongThuc_ThucPham] FOREIGN KEY([MaThucPham]) REFERENCES [dbo].[ThucPham] ([MaThucPham]);
ALTER TABLE [dbo].[NguyenLieuCongThuc] CHECK CONSTRAINT [FK_NguyenLieuCongThuc_ThucPham];

ALTER TABLE [dbo].[NhanDienAnh]      WITH CHECK ADD CONSTRAINT [FK_NhanDienAnh_NhatKyAI]      FOREIGN KEY([MaGoiYAI])    REFERENCES [dbo].[NhatKyAI] ([MaGoiYAI]) ON DELETE CASCADE;
ALTER TABLE [dbo].[NhanDienAnh]      CHECK CONSTRAINT [FK_NhanDienAnh_NhatKyAI];

ALTER TABLE [dbo].[NhatKyAI]         WITH CHECK ADD CONSTRAINT [FK_NhatKyAI_NguoiDung]        FOREIGN KEY([MaNguoiDung]) REFERENCES [dbo].[NguoiDung] ([MaNguoiDung]);
ALTER TABLE [dbo].[NhatKyAI]         CHECK CONSTRAINT [FK_NhatKyAI_NguoiDung];

ALTER TABLE [dbo].[NhatKyAnUong]     WITH CHECK ADD CONSTRAINT [FK_NhatKyAnUong_BuaAn]        FOREIGN KEY([MaBuaAn])     REFERENCES [dbo].[LoaiBuaAn] ([MaBuaAn]);
ALTER TABLE [dbo].[NhatKyAnUong]     CHECK CONSTRAINT [FK_NhatKyAnUong_BuaAn];

ALTER TABLE [dbo].[NhatKyAnUong]     WITH CHECK ADD CONSTRAINT [FK_NhatKyAnUong_CongThuc]     FOREIGN KEY([MaCongThuc])  REFERENCES [dbo].[CongThuc] ([MaCongThuc]);
ALTER TABLE [dbo].[NhatKyAnUong]     CHECK CONSTRAINT [FK_NhatKyAnUong_CongThuc];

ALTER TABLE [dbo].[NhatKyAnUong]     WITH CHECK ADD CONSTRAINT [FK_NhatKyAnUong_MonNguoiDung] FOREIGN KEY([MaMonNguoiDung]) REFERENCES [dbo].[MonNguoiDung] ([MaMonNguoiDung]);
ALTER TABLE [dbo].[NhatKyAnUong]     CHECK CONSTRAINT [FK_NhatKyAnUong_MonNguoiDung];

ALTER TABLE [dbo].[NhatKyAnUong]     WITH CHECK ADD CONSTRAINT [FK_NhatKyAnUong_NguoiDung]    FOREIGN KEY([MaNguoiDung])  REFERENCES [dbo].[NguoiDung] ([MaNguoiDung]);
ALTER TABLE [dbo].[NhatKyAnUong]     CHECK CONSTRAINT [FK_NhatKyAnUong_NguoiDung];

ALTER TABLE [dbo].[NhatKyAnUong]     WITH CHECK ADD CONSTRAINT [FK_NhatKyAnUong_ThucPham]     FOREIGN KEY([MaThucPham])   REFERENCES [dbo].[ThucPham] ([MaThucPham]);
ALTER TABLE [dbo].[NhatKyAnUong]     CHECK CONSTRAINT [FK_NhatKyAnUong_ThucPham];

ALTER TABLE [dbo].[RefreshToken]     WITH CHECK ADD CONSTRAINT [FK_RefreshToken_NguoiDung]    FOREIGN KEY([MaNguoiDung])  REFERENCES [dbo].[NguoiDung] ([MaNguoiDung]);
ALTER TABLE [dbo].[RefreshToken]     CHECK CONSTRAINT [FK_RefreshToken_NguoiDung];

ALTER TABLE [dbo].[HoSoNguoiDung]    WITH CHECK ADD CONSTRAINT [FK_HoSoNguoiDung_NguoiDung]   FOREIGN KEY([MaNguoiDung])  REFERENCES [dbo].[NguoiDung] ([MaNguoiDung]);
ALTER TABLE [dbo].[HoSoNguoiDung]    CHECK CONSTRAINT [FK_HoSoNguoiDung_NguoiDung];
GO

/*--------------------------------------
  5) CHECK constraints
--------------------------------------*/
-- Nguồn thiết lập Mục tiêu dinh dưỡng
IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_MucTieuDinhDuong_Nguon'
)
BEGIN
    ALTER TABLE [dbo].[MucTieuDinhDuong] WITH CHECK
    ADD CONSTRAINT [CK_MucTieuDinhDuong_Nguon]
    CHECK ([Nguon] IN (N'ThuCong', N'AI'));
    ALTER TABLE [dbo].[MucTieuDinhDuong] CHECK CONSTRAINT [CK_MucTieuDinhDuong_Nguon];
END

-- Giới tính người dùng
IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_NguoiDung_GioiTinh'
)
BEGIN
    ALTER TABLE [dbo].[NguoiDung] WITH CHECK
    ADD CONSTRAINT [CK_NguoiDung_GioiTinh]
    CHECK ([GioiTinh] IN ('F','M'));
    ALTER TABLE [dbo].[NguoiDung] CHECK CONSTRAINT [CK_NguoiDung_GioiTinh];
END

-- Loại đề xuất trong Nhật ký AI
IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_NhatKyAI_LoaiDeXuat'
)
BEGIN
    ALTER TABLE [dbo].[NhatKyAI] WITH CHECK
    ADD CONSTRAINT [CK_NhatKyAI_LoaiDeXuat]
    CHECK ([LoaiDeXuat] IN (N'MonAn', N'DinhDuong'));
    ALTER TABLE [dbo].[NhatKyAI] CHECK CONSTRAINT [CK_NhatKyAI_LoaiDeXuat];
END

-- Nhật ký ăn uống: đúng 1 nguồn (ThucPham / MonNguoiDung / CongThuc)
IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_NhatKyAnUong_ChiMotNguon'
)
BEGIN
    ALTER TABLE [dbo].[NhatKyAnUong] WITH CHECK
    ADD CONSTRAINT [CK_NhatKyAnUong_ChiMotNguon]
    CHECK ( (
        (CASE WHEN [MaThucPham]     IS NULL THEN 0 ELSE 1 END)
      + (CASE WHEN [MaMonNguoiDung] IS NULL THEN 0 ELSE 1 END)
      + (CASE WHEN [MaCongThuc]     IS NULL THEN 0 ELSE 1 END)
    ) = 1 );
    ALTER TABLE [dbo].[NhatKyAnUong] CHECK CONSTRAINT [CK_NhatKyAnUong_ChiMotNguon];
END
GO
