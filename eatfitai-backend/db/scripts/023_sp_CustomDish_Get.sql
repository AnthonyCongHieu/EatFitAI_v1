CREATE OR ALTER PROCEDURE dbo.sp_CustomDish_Get
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
    FROM dbo.CustomDish AS d WITH (NOLOCK)
    WHERE d.UserId = @UserId
    ORDER BY d.CreatedAt DESC;
END
GO

