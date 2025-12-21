-- Migration: Tạo bảng UserPreference
-- Mô tả: Lưu trữ thông tin dietary preferences và restrictions của user

-- Kiểm tra nếu bảng chưa tồn tại thì tạo mới
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserPreference]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[UserPreference] (
        [UserPreferenceId] INT IDENTITY(1,1) NOT NULL,
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [DietaryRestrictions] NVARCHAR(MAX) NULL,
        [Allergies] NVARCHAR(MAX) NULL,
        [PreferredMealsPerDay] INT NOT NULL DEFAULT 3,
        [PreferredCuisine] NVARCHAR(100) NULL,
        [CreatedAt] DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        [UpdatedAt] DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_UserPreference] PRIMARY KEY CLUSTERED ([UserPreferenceId] ASC),
        CONSTRAINT [FK_UserPreference_User] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([UserId]),
        CONSTRAINT [UQ_UserPreference_UserId] UNIQUE ([UserId])
    );
    
    PRINT 'Đã tạo bảng UserPreference thành công!';
END
ELSE
BEGIN
    PRINT 'Bảng UserPreference đã tồn tại.';
END
GO

-- Tạo index cho UserId để tối ưu truy vấn
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_UserPreference_UserId' AND object_id = OBJECT_ID('dbo.UserPreference'))
BEGIN
    CREATE INDEX [IX_UserPreference_UserId] ON [dbo].[UserPreference] ([UserId]);
    PRINT 'Đã tạo index IX_UserPreference_UserId.';
END
GO
