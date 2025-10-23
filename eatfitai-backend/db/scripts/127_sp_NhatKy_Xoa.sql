SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
--  Thủ tục: sp_NhatKy_Xoa
--  Mô tả  : Xóa bản ghi nhật ký theo Id
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_NhatKy_Xoa]
    @UserId UNIQUEIDENTIFIER,
    @DiaryEntryId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM [dbo].[DiaryEntry]
    WHERE Id = @DiaryEntryId AND UserId = @UserId;

    SELECT @@ROWCOUNT AS Affected;
END
GO

