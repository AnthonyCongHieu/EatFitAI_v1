IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.FoodItem')
      AND name = 'Source'
)
BEGIN
    ALTER TABLE dbo.FoodItem
    ADD Source NVARCHAR(100) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.FoodItem')
      AND name = 'IsVerified'
)
BEGIN
    ALTER TABLE dbo.FoodItem
    ADD IsVerified BIT NOT NULL
        CONSTRAINT DF_FoodItem_IsVerified DEFAULT (0);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.FoodItem')
      AND name = 'VerifiedBy'
)
BEGIN
    ALTER TABLE dbo.FoodItem
    ADD VerifiedBy NVARCHAR(100) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.FoodItem')
      AND name = 'ReliabilityScore'
)
BEGIN
    ALTER TABLE dbo.FoodItem
    ADD ReliabilityScore FLOAT NOT NULL
        CONSTRAINT DF_FoodItem_ReliabilityScore DEFAULT (0);
END
GO
