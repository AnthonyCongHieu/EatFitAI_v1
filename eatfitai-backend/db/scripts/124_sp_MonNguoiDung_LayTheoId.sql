SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
--  Thủ tục: sp_MonNguoiDung_LayTheoId
--  Mô tả  : Lấy chi tiết món người dùng theo Id
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_MonNguoiDung_LayTheoId]
    @UserId UNIQUEIDENTIFIER,
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    -- Header
    SELECT TOP (1)
        d.Id,
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
    WHERE d.Id = @Id AND d.UserId = @UserId;

    -- Ingredients
    SELECT i.Id,
           i.CustomDishId,
           i.FoodId,
           i.Name,
           i.QuantityGrams,
           i.CaloriesKcal,
           i.ProteinGrams,
           i.CarbohydrateGrams,
           i.FatGrams
    FROM [dbo].[CustomDishIngredient] AS i WITH (NOLOCK)
    WHERE i.CustomDishId = @Id;
END
GO

