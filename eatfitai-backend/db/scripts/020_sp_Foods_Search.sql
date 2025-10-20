CREATE OR ALTER PROCEDURE dbo.sp_Foods_Search
    @Query NVARCHAR(200),
    @Offset INT = 0,
    @Limit INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    IF @Limit <= 0 SET @Limit = 50;
    IF @Offset < 0 SET @Offset = 0;

    DECLARE @q NVARCHAR(202) = N'%' + ISNULL(@Query, N'') + N'%';

    SELECT f.Id,
           f.Name,
           f.Brand,
           f.Category,
           f.ServingSizeGrams,
           f.CaloriesKcal,
           f.ProteinGrams,
           f.CarbohydrateGrams,
           f.FatGrams,
           f.IsCustom
    FROM dbo.Food AS f WITH (NOLOCK)
    WHERE (@Query IS NULL OR @Query = N'' OR f.Name LIKE @q OR f.Brand LIKE @q OR f.Category LIKE @q)
    ORDER BY f.Name
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
END
GO

