-- =============================================
-- Author: EatFitAI System
-- Create date: 2024
-- Description: Lấy thông tin người dùng theo ID
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_Auth_LayTheoId]
    @MaNguoiDung UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

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
