CREATE OR ALTER PROCEDURE dbo.sp_NutritionTargets_GetCurrent
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
    FROM dbo.NutritionTarget AS n WITH (NOLOCK)
    WHERE n.UserId = @UserId AND n.IsActive = 1
    ORDER BY n.EffectiveDate DESC;
END
GO

