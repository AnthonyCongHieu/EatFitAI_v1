CREATE OR ALTER PROCEDURE dbo.sp_Diary_Delete
    @UserId UNIQUEIDENTIFIER,
    @DiaryEntryId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.DiaryEntry
    WHERE Id = @DiaryEntryId AND UserId = @UserId;

    SELECT @@ROWCOUNT AS Affected;
END
GO

