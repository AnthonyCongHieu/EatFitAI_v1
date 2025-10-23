SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
--  Thủ tục: sp_MucTieuDinhDuong_LayHienTai
--  Mô tả  : Lấy mục tiêu dinh dưỡng đang hiệu lực
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_MucTieuDinhDuong_LayHienTai]
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        n.Id,
        n.UserId,
        n.EffectiveDate,
        n.CaloriesKcal,
        n.ProteinGrams,
        n.CarbohydrateGrams,
        n.FatGrams,
        n.IsActive,
        n.CreatedAt,
        n.UpdatedAt
    FROM [dbo].[NutritionTarget] AS n WITH (NOLOCK)
    WHERE n.UserId = @UserId AND n.IsActive = 1
    ORDER BY n.EffectiveDate DESC;
END
GO

