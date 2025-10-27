-- =============================================
-- Author: EatFitAI System
-- Create date: 2024
-- Description: Đăng ký tài khoản người dùng mới
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_Auth_DangKy]
    @Email NVARCHAR(255),
    @MatKhauHash VARBINARY(256),
    @HoTen NVARCHAR(150) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Kiểm tra email đã tồn tại
    IF EXISTS (SELECT 1 FROM [dbo].[NguoiDung] WHERE [Email] = @Email)
    BEGIN
        RAISERROR('Email đã được sử dụng', 16, 1);
        RETURN;
    END

    -- Tạo user mới
    DECLARE @MaNguoiDung UNIQUEIDENTIFIER = NEWID();
    DECLARE @NgayTao DATETIME2(0) = SYSUTCDATETIME();

    INSERT INTO [dbo].[NguoiDung] (
        [MaNguoiDung],
        [Email],
        [MatKhauHash],
        [HoTen],
        [NgayTao],
        [NgayCapNhat]
    )
    VALUES (
        @MaNguoiDung,
        @Email,
        @MatKhauHash,
        @HoTen,
        @NgayTao,
        @NgayTao
    );

    -- Trả về thông tin user vừa tạo
    SELECT
        [MaNguoiDung],
        [Email],
        [HoTen],
        [GioiTinh],
        [NgaySinh],
        [NgayTao],
        [NgayCapNhat]
    FROM [dbo].[NguoiDung]
    WHERE [MaNguoiDung] = @MaNguoiDung;
END
GO
