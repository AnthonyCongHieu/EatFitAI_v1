CREATE OR ALTER PROCEDURE dbo.sp_NutritionTargets_Upsert
    @UserId UNIQUEIDENTIFIER,
    @CaloriesKcal DECIMAL(10,2),
    @ProteinGrams DECIMAL(9,2),
    @CarbohydrateGrams DECIMAL(9,2),
    @FatGrams DECIMAL(9,2),
    @EffectiveDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @EffectiveDate IS NULL SET @EffectiveDate = CAST(SYSUTCDATETIME() AS DATE);

    BEGIN TRAN;
    BEGIN TRY
        UPDATE dbo.NutritionTarget
        SET IsActive = 0,
            UpdatedAt = SYSUTCDATETIME()
        WHERE UserId = @UserId AND IsActive = 1;

        DECLARE @Id UNIQUEIDENTIFIER = NEWID();
        INSERT INTO dbo.NutritionTarget
        (Id, UserId, EffectiveDate, CaloriesKcal, ProteinGrams, CarbohydrateGrams, FatGrams, IsActive, CreatedAt)
        VALUES
        (@Id, @UserId, @EffectiveDate, @CaloriesKcal, @ProteinGrams, @CarbohydrateGrams, @FatGrams, 1, SYSUTCDATETIME());

        COMMIT TRAN;

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
        WHERE n.Id = @Id;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        THROW;
    END CATCH
END
GO

