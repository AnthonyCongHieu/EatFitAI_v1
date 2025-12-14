-- Migration: Add AvatarUrl column to Users table
-- Date: 2025-12-14
-- Description: Thêm cột AvatarUrl để lưu ID của preset avatar hoặc URL từ storage

-- Check if column exists before adding
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'AvatarUrl')
BEGIN
    ALTER TABLE [dbo].[Users]
    ADD [AvatarUrl] NVARCHAR(500) NULL;
    
    PRINT 'Column AvatarUrl added successfully to Users table';
END
ELSE
BEGIN
    PRINT 'Column AvatarUrl already exists in Users table';
END
GO
