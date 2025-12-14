-- Create WeeklyCheckIns table for weekly check-in feature
-- Run this script in SQL Server Management Studio against EatFitAI database

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WeeklyCheckIns' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[WeeklyCheckIns] (
        [WeeklyCheckInId] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [WeekNumber] INT NOT NULL,
        [WeekStartDate] DATE NOT NULL,
        [WeekEndDate] DATE NOT NULL,
        [WeightKg] DECIMAL(5,2) NOT NULL,
        [WeightChange] DECIMAL(5,2) NULL,
        [AvgCalories] DECIMAL(10,2) NULL,
        [TargetCalories] DECIMAL(10,2) NULL,
        [AvgProtein] DECIMAL(10,2) NULL,
        [AvgCarbs] DECIMAL(10,2) NULL,
        [AvgFat] DECIMAL(10,2) NULL,
        [DaysLogged] INT NOT NULL DEFAULT 0,
        [Goal] NVARCHAR(50) NOT NULL DEFAULT 'maintain',
        [AiSuggestion] NVARCHAR(MAX) NULL,
        [IsOnTrack] BIT NOT NULL DEFAULT 0,
        [SuggestedCalories] DECIMAL(10,2) NULL,
        [Notes] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        
        CONSTRAINT [FK_WeeklyCheckIns_Users] FOREIGN KEY ([UserId]) 
            REFERENCES [dbo].[Users]([UserId]) ON DELETE CASCADE
    );

    -- Create index for faster queries
    CREATE INDEX [IX_WeeklyCheckIns_UserId_WeekStartDate] 
        ON [dbo].[WeeklyCheckIns] ([UserId], [WeekStartDate]);

    PRINT 'Table WeeklyCheckIns created successfully!';
END
ELSE
BEGIN
    PRINT 'Table WeeklyCheckIns already exists.';
END
