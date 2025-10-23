SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
--  Thủ tục: sp_HoSo_Lay
--  Mô tả  : Lấy thông tin hồ sơ người dùng
--  Đầu vào: @UserId (UNIQUEIDENTIFIER)
--  Đầu ra : Thông tin hồ sơ (giữ nguyên tên cột như API đang dùng)
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_HoSo_Lay]
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
    FROM [dbo].[UserProfile] AS p WITH (NOLOCK)
    WHERE p.UserId = @UserId;
END
GO

