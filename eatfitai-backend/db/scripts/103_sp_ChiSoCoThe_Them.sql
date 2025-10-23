SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
--  Thủ tục: sp_ChiSoCoThe_Them
--  Mô tả  : Thêm bản ghi chỉ số cơ thể
--  Đầu vào: Giữ tên tham số như API đang dùng
--  Đầu ra : Trả về bản ghi vừa thêm
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_ChiSoCoThe_Them]
    @UserId UNIQUEIDENTIFIER,
    @RecordedAt DATETIME2 = NULL,
    @WeightKg DECIMAL(9,2),
    @BodyFatPercent DECIMAL(9,2) = NULL,
    @MuscleMassKg DECIMAL(9,2) = NULL,
    @WaistCm DECIMAL(9,2) = NULL,
    @HipCm DECIMAL(9,2) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @RecordedAt IS NULL SET @RecordedAt = SYSUTCDATETIME();

    DECLARE @Id UNIQUEIDENTIFIER = NEWID();

    INSERT INTO [dbo].[BodyMetric]
    (Id, UserId, RecordedAt, WeightKg, BodyFatPercent, MuscleMassKg, WaistCm, HipCm, CreatedAt)
    VALUES
    (@Id, @UserId, @RecordedAt, @WeightKg, @BodyFatPercent, @MuscleMassKg, @WaistCm, @HipCm, SYSUTCDATETIME());

    SELECT TOP (1)
        b.Id,
        b.UserId,
        b.RecordedAt,
        b.WeightKg,
        b.BodyFatPercent,
        b.MuscleMassKg,
        b.WaistCm,
        b.HipCm,
        b.CreatedAt
    FROM [dbo].[BodyMetric] AS b WITH (NOLOCK)
    WHERE b.Id = @Id;
END
GO

