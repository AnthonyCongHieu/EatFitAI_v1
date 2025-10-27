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

    -- Tạo user mới (unique constraint sẽ xử lý duplicate email)
    DECLARE @MaNguoiDung UNIQUEIDENTIFIER = NEWID();
    DECLARE @NgayTao DATETIME2(0) = SYSUTCDATETIME();

    BEGIN TRY
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
    END TRY
    BEGIN CATCH
        -- Handle unique constraint violation (duplicate email)
        IF ERROR_NUMBER() = 2627 -- Violation of UNIQUE KEY constraint
        BEGIN
            RAISERROR('Email đã được sử dụng', 16, 1);
            RETURN;
        END
        ELSE
        BEGIN
            -- Re-throw other errors
            THROW;
        END
    END CATCH

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
