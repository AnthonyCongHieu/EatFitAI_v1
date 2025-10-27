-- =============================================
-- Author: EatFitAI System
-- Create date: 2024
-- Description: Đăng nhập tài khoản người dùng
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_Auth_DangNhap]
    @Email NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    -- Lấy thông tin user theo email
    SELECT
        [MaNguoiDung],
        [Email],
        [MatKhauHash],
        [HoTen],
        [GioiTinh],
        [NgaySinh],
        [NgayTao],
        [NgayCapNhat]
    FROM [dbo].[NguoiDung]
    WHERE [Email] = @Email;
END
GO
