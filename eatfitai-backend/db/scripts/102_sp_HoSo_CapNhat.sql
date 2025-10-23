SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
--  Thủ tục: sp_HoSo_CapNhat
--  Mô tả  : Cập nhật/thêm mới hồ sơ người dùng
--  Đầu vào: Giữ tên tham số như API đang dùng
--  Đầu ra : Trả về hồ sơ đã cập nhật/thêm mới
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_HoSo_CapNhat]
    @UserId UNIQUEIDENTIFIER,
    @FullName NVARCHAR(200) = NULL,
    @Gender NVARCHAR(50) = NULL,
    @DateOfBirth DATE = NULL,
    @HeightCm DECIMAL(9,2) = NULL,
    @TargetWeightKg DECIMAL(9,2) = NULL,
    @ActivityLevel NVARCHAR(50) = NULL,
    @Goal NVARCHAR(100) = NULL,
    @AvatarUrl NVARCHAR(400) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    MERGE [dbo].[UserProfile] AS tgt
    USING (SELECT @UserId AS UserId) AS src
    ON tgt.UserId = src.UserId
    WHEN MATCHED THEN
        UPDATE SET
          FullName = @FullName,
          Gender = @Gender,
          DateOfBirth = @DateOfBirth,
          HeightCm = @HeightCm,
          TargetWeightKg = @TargetWeightKg,
          ActivityLevel = @ActivityLevel,
          Goal = @Goal,
          AvatarUrl = @AvatarUrl,
          UpdatedAt = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
        INSERT (UserId, FullName, Gender, DateOfBirth, HeightCm, TargetWeightKg, ActivityLevel, Goal, AvatarUrl, CreatedAt)
        VALUES (@UserId, @FullName, @Gender, @DateOfBirth, @HeightCm, @TargetWeightKg, @ActivityLevel, @Goal, @AvatarUrl, SYSUTCDATETIME());

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
    FROM [dbo].[UserProfile] AS p WITH (NOLOCK)
    WHERE p.UserId = @UserId;
END
GO

