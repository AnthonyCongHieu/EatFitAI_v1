-- Migration script để thêm các columns mới cho Email Verification
-- Chạy script này trong SQL Server Management Studio hoặc sqlcmd

USE EatFitAI;
GO

-- Kiểm tra và thêm column EmailVerified
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'EmailVerified')
BEGIN
    ALTER TABLE [dbo].[Users] ADD [EmailVerified] BIT NOT NULL DEFAULT 0;
    PRINT 'Added column EmailVerified';
END
GO

-- Kiểm tra và thêm column VerificationCode  
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'VerificationCode')
BEGIN
    ALTER TABLE [dbo].[Users] ADD [VerificationCode] NVARCHAR(256) NULL;
    PRINT 'Added column VerificationCode';
END
GO

-- Kiểm tra và thêm column VerificationCodeExpiry
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'VerificationCodeExpiry')
BEGIN
    ALTER TABLE [dbo].[Users] ADD [VerificationCodeExpiry] DATETIME2 NULL;
    PRINT 'Added column VerificationCodeExpiry';
END
GO

-- Kiểm tra và thêm column OnboardingCompleted
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'OnboardingCompleted')
BEGIN
    ALTER TABLE [dbo].[Users] ADD [OnboardingCompleted] BIT NOT NULL DEFAULT 0;
    PRINT 'Added column OnboardingCompleted';
END
GO

-- Xác nhận đã thêm thành công
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Users' 
AND COLUMN_NAME IN ('EmailVerified', 'VerificationCode', 'VerificationCodeExpiry', 'OnboardingCompleted');
GO
