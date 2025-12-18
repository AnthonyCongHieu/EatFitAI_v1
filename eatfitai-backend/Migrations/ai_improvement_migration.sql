-- ============================================
-- AI IMPROVEMENT MIGRATION SCRIPT
-- EatFitAI - SQL Server
-- ============================================

-- ============================================
-- PART 1: AI LABEL MAPPING (63 ingredients)
-- Match YOLO labels với FoodItems bằng FoodNameEn
-- ============================================

-- Tạo temp table để map labels
DECLARE @LabelMappings TABLE (
    YoloLabel NVARCHAR(50),
    FoodNameEnPattern NVARCHAR(100)
);

INSERT INTO @LabelMappings VALUES
('apple', '%apple%'),
('avocado', '%avocado%'),
('banana', '%banana%'),
('bayleaf', '%bay%leaf%'),
('beans', '%bean%'),
('beef', '%beef%'),
('beet', '%beet%'),
('bell_pepper', '%bell%pepper%'),
('blueberry', '%blueberry%'),
('broccoli', '%broccoli%'),
('cabbage', '%cabbage%'),
('carrot', '%carrot%'),
('cauliflower', '%cauliflower%'),
('celery', '%celery%'),
('cherry', '%cherry%'),
('chicken', '%chicken%'),
('chickpeas', '%chickpea%'),
('cloves', '%clove%'),
('coriander', '%coriander%'),
('corn', '%corn%'),
('cranberry', '%cranberry%'),
('cucumber', '%cucumber%'),
('curry_powder', '%curry%'),
('egg', '%egg%'),
('eggplant', '%eggplant%'),
('fish', '%fish%'),
('garlic', '%garlic%'),
('ginger', '%ginger%'),
('gooseberry', '%gooseberry%'),
('grape', '%grape%'),
('guava', '%guava%'),
('kumquat', '%kumquat%'),
('lamb', '%lamb%'),
('leek', '%leek%'),
('lemon', '%lemon%'),
('lettuce', '%lettuce%'),
('mango', '%mango%'),
('marrow', '%marrow%'),
('mulberry', '%mulberry%'),
('okra', '%okra%'),
('onion', '%onion%'),
('orange', '%orange%'),
('papaya', '%papaya%'),
('peanut', '%peanut%'),
('pear', '%pear%'),
('peas', '%pea%'),
('pepper', '%pepper%'),
('pineapple', '%pineapple%'),
('pork', '%pork%'),
('potato', '%potato%'),
('pumpkin', '%pumpkin%'),
('radish', '%radish%'),
('raspberry', '%raspberry%'),
('rice', '%rice%'),
('salad', '%salad%'),
('salt', '%salt%'),
('shrimp', '%shrimp%'),
('spinach', '%spinach%'),
('spring_onion', '%spring%onion%'),
('squash', '%squash%'),
('strawberry', '%strawberry%'),
('tomato', '%tomato%'),
('turmeric', '%turmeric%');

-- Insert mappings cho labels có FoodItem match
INSERT INTO AiLabelMap (Label, FoodItemId, MinConfidence, CreatedAt)
SELECT DISTINCT 
    lm.YoloLabel,
    (SELECT TOP 1 f.FoodItemId 
     FROM FoodItem f 
     WHERE (f.FoodNameEn LIKE lm.FoodNameEnPattern OR f.FoodName LIKE lm.FoodNameEnPattern)
       AND f.IsDeleted = 0
     ORDER BY f.FoodItemId),
    0.50,
    GETUTCDATE()
FROM @LabelMappings lm
WHERE EXISTS (
    SELECT 1 FROM FoodItem f 
    WHERE (f.FoodNameEn LIKE lm.FoodNameEnPattern OR f.FoodName LIKE lm.FoodNameEnPattern)
      AND f.IsDeleted = 0
)
AND NOT EXISTS (
    SELECT 1 FROM AiLabelMap a WHERE a.Label = lm.YoloLabel
);

-- Kiểm tra labels nào chưa match (cần thêm FoodItem)
SELECT lm.YoloLabel as 'Unmapped Labels'
FROM @LabelMappings lm
WHERE NOT EXISTS (
    SELECT 1 FROM FoodItem f 
    WHERE (f.FoodNameEn LIKE lm.FoodNameEnPattern OR f.FoodName LIKE lm.FoodNameEnPattern)
      AND f.IsDeleted = 0
);

GO

-- ============================================
-- PART 2: USER PREFERENCE TABLE (Dietary Restrictions)
-- ============================================

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UserPreferences' AND xtype='U')
BEGIN
    CREATE TABLE UserPreferences (
        UserPreferenceId INT IDENTITY(1,1) PRIMARY KEY,
        UserId UNIQUEIDENTIFIER NOT NULL,
        -- Dietary restrictions (JSON array)
        DietaryRestrictions NVARCHAR(500) NULL, -- ["vegetarian", "halal", "no-pork"]
        -- Allergies
        Allergies NVARCHAR(500) NULL, -- ["seafood", "peanut", "dairy"]
        -- Preferences
        PreferredMealsPerDay INT DEFAULT 3,
        PreferredCuisine NVARCHAR(100) NULL, -- "vietnamese", "western", "asian"
        -- Timestamps
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
        
        CONSTRAINT FK_UserPreferences_Users FOREIGN KEY (UserId) REFERENCES Users(UserId)
    );
    
    CREATE INDEX IX_UserPreferences_UserId ON UserPreferences(UserId);
    
    PRINT 'Created UserPreferences table successfully';
END
GO

-- ============================================
-- PART 3: ADD GOAL TO NUTRITION TARGET (optional)
-- ============================================

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('NutritionTarget') AND name = 'Goal')
BEGIN
    ALTER TABLE NutritionTarget ADD Goal NVARCHAR(20) DEFAULT 'maintain';
    PRINT 'Added Goal column to NutritionTarget';
END
GO

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Count AiLabelMap entries
SELECT 'AiLabelMap count' as Info, COUNT(*) as Count FROM AiLabelMap;

-- Count FoodItem
SELECT 'FoodItem count' as Info, COUNT(*) as Count FROM FoodItem WHERE IsDeleted = 0;

-- Show mapped labels
SELECT Label, FoodItemId FROM AiLabelMap ORDER BY Label;

PRINT 'Migration completed!';
GO
