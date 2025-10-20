CREATE OR ALTER PROCEDURE dbo.sp_Profile_Get
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        p.UserId,
        p.FullName,
        p.Gender,
        p.DateOfBirth,
        p.HeightCm,
        p.TargetWeightKg,
        p.ActivityLevel,
        p.Goal,
        p.AvatarUrl,
        p.CreatedAt,
        p.UpdatedAt
    FROM dbo.UserProfile AS p WITH (NOLOCK)
    WHERE p.UserId = @UserId;
END
GO

