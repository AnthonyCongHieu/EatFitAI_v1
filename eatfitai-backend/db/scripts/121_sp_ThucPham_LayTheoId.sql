SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
--  Thủ tục: sp_ThucPham_LayTheoId
--  Mô tả  : Lấy chi tiết thực phẩm theo Id
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_ThucPham_LayTheoId]
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
           f.Id,
           f.Name,
           f.Description,
           f.Brand,
           f.Category,
           f.ServingSizeGrams,
           f.CaloriesKcal,
           f.ProteinGrams,
           f.CarbohydrateGrams,
           f.FatGrams,
           f.IsCustom,
           f.CreatedAt,
           f.UpdatedAt
    FROM [dbo].[Food] AS f WITH (NOLOCK)
    WHERE f.Id = @Id;
END
GO

