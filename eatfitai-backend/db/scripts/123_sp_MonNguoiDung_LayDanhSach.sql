SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
--  Thủ tục: sp_MonNguoiDung_LayDanhSach
--  Mô tả  : Lấy danh sách món của người dùng
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_MonNguoiDung_LayDanhSach]
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT d.Id,
           d.UserId,
           d.Name,
           d.Description,
           d.PortionSizeGrams,
           d.CaloriesKcal,
           d.ProteinGrams,
           d.CarbohydrateGrams,
           d.FatGrams,
           d.CreatedAt,
           d.UpdatedAt
    FROM [dbo].[CustomDish] AS d WITH (NOLOCK)
    WHERE d.UserId = @UserId
    ORDER BY d.CreatedAt DESC;
END
GO

