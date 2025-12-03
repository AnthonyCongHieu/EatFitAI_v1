-- Add columns if they don't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[FoodItem]') AND name = 'FoodNameEn')
BEGIN
    ALTER TABLE [dbo].[FoodItem] ADD [FoodNameEn] NVARCHAR(255) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[FoodItem]') AND name = 'FoodNameUnsigned')
BEGIN
    ALTER TABLE [dbo].[FoodItem] ADD [FoodNameUnsigned] NVARCHAR(255) NULL;
END
GO

-- Create function to remove diacritics if not exists
CREATE OR ALTER FUNCTION [dbo].[RemoveDiacritics] (@text NVARCHAR(MAX))
RETURNS NVARCHAR(MAX)
AS
BEGIN
    DECLARE @result NVARCHAR(MAX) = @text;
    
    SET @result = REPLACE(@result, N'á', N'a');
    SET @result = REPLACE(@result, N'à', N'a');
    SET @result = REPLACE(@result, N'ả', N'a');
    SET @result = REPLACE(@result, N'ã', N'a');
    SET @result = REPLACE(@result, N'ạ', N'a');
    SET @result = REPLACE(@result, N'ă', N'a');
    SET @result = REPLACE(@result, N'ắ', N'a');
    SET @result = REPLACE(@result, N'ằ', N'a');
    SET @result = REPLACE(@result, N'ẳ', N'a');
    SET @result = REPLACE(@result, N'ẵ', N'a');
    SET @result = REPLACE(@result, N'ặ', N'a');
    SET @result = REPLACE(@result, N'â', N'a');
    SET @result = REPLACE(@result, N'ấ', N'a');
    SET @result = REPLACE(@result, N'ầ', N'a');
    SET @result = REPLACE(@result, N'ẩ', N'a');
    SET @result = REPLACE(@result, N'ẫ', N'a');
    SET @result = REPLACE(@result, N'ậ', N'a');
    
    SET @result = REPLACE(@result, N'đ', N'd');
    
    SET @result = REPLACE(@result, N'é', N'e');
    SET @result = REPLACE(@result, N'è', N'e');
    SET @result = REPLACE(@result, N'ẻ', N'e');
    SET @result = REPLACE(@result, N'ẽ', N'e');
    SET @result = REPLACE(@result, N'ẹ', N'e');
    SET @result = REPLACE(@result, N'ê', N'e');
    SET @result = REPLACE(@result, N'ế', N'e');
    SET @result = REPLACE(@result, N'ề', N'e');
    SET @result = REPLACE(@result, N'ể', N'e');
    SET @result = REPLACE(@result, N'ễ', N'e');
    SET @result = REPLACE(@result, N'ệ', N'e');
    
    SET @result = REPLACE(@result, N'í', N'i');
    SET @result = REPLACE(@result, N'ì', N'i');
    SET @result = REPLACE(@result, N'ỉ', N'i');
    SET @result = REPLACE(@result, N'ĩ', N'i');
    SET @result = REPLACE(@result, N'ị', N'i');
    
    SET @result = REPLACE(@result, N'ó', N'o');
    SET @result = REPLACE(@result, N'ò', N'o');
    SET @result = REPLACE(@result, N'ỏ', N'o');
    SET @result = REPLACE(@result, N'õ', N'o');
    SET @result = REPLACE(@result, N'ọ', N'o');
    SET @result = REPLACE(@result, N'ô', N'o');
    SET @result = REPLACE(@result, N'ố', N'o');
    SET @result = REPLACE(@result, N'ồ', N'o');
    SET @result = REPLACE(@result, N'ổ', N'o');
    SET @result = REPLACE(@result, N'ỗ', N'o');
    SET @result = REPLACE(@result, N'ộ', N'o');
    SET @result = REPLACE(@result, N'ơ', N'o');
    SET @result = REPLACE(@result, N'ớ', N'o');
    SET @result = REPLACE(@result, N'ờ', N'o');
    SET @result = REPLACE(@result, N'ở', N'o');
    SET @result = REPLACE(@result, N'ỡ', N'o');
    SET @result = REPLACE(@result, N'ợ', N'o');
    
    SET @result = REPLACE(@result, N'ú', N'u');
    SET @result = REPLACE(@result, N'ù', N'u');
    SET @result = REPLACE(@result, N'ủ', N'u');
    SET @result = REPLACE(@result, N'ũ', N'u');
    SET @result = REPLACE(@result, N'ụ', N'u');
    SET @result = REPLACE(@result, N'ư', N'u');
    SET @result = REPLACE(@result, N'ứ', N'u');
    SET @result = REPLACE(@result, N'ừ', N'u');
    SET @result = REPLACE(@result, N'ử', N'u');
    SET @result = REPLACE(@result, N'ữ', N'u');
    SET @result = REPLACE(@result, N'ự', N'u');
    
    SET @result = REPLACE(@result, N'ý', N'y');
    SET @result = REPLACE(@result, N'ỳ', N'y');
    SET @result = REPLACE(@result, N'ỷ', N'y');
    SET @result = REPLACE(@result, N'ỹ', N'y');
    SET @result = REPLACE(@result, N'ỵ', N'y');
    
    -- Uppercase
    SET @result = REPLACE(@result, N'Á', N'A');
    SET @result = REPLACE(@result, N'À', N'A');
    SET @result = REPLACE(@result, N'Ả', N'A');
    SET @result = REPLACE(@result, N'Ã', N'A');
    SET @result = REPLACE(@result, N'Ạ', N'A');
    SET @result = REPLACE(@result, N'Ă', N'A');
    SET @result = REPLACE(@result, N'Ắ', N'A');
    SET @result = REPLACE(@result, N'Ằ', N'A');
    SET @result = REPLACE(@result, N'Ẳ', N'A');
    SET @result = REPLACE(@result, N'Ẵ', N'A');
    SET @result = REPLACE(@result, N'Ặ', N'A');
    SET @result = REPLACE(@result, N'Â', N'A');
    SET @result = REPLACE(@result, N'Ấ', N'A');
    SET @result = REPLACE(@result, N'Ầ', N'A');
    SET @result = REPLACE(@result, N'Ẩ', N'A');
    SET @result = REPLACE(@result, N'Ẫ', N'A');
    SET @result = REPLACE(@result, N'Ậ', N'A');
    
    SET @result = REPLACE(@result, N'Đ', N'D');
    
    SET @result = REPLACE(@result, N'É', N'E');
    SET @result = REPLACE(@result, N'È', N'E');
    SET @result = REPLACE(@result, N'Ẻ', N'E');
    SET @result = REPLACE(@result, N'Ẽ', N'E');
    SET @result = REPLACE(@result, N'Ẹ', N'E');
    SET @result = REPLACE(@result, N'Ê', N'E');
    SET @result = REPLACE(@result, N'Ế', N'E');
    SET @result = REPLACE(@result, N'Ề', N'E');
    SET @result = REPLACE(@result, N'Ể', N'E');
    SET @result = REPLACE(@result, N'Ễ', N'E');
    SET @result = REPLACE(@result, N'Ệ', N'E');
    
    SET @result = REPLACE(@result, N'Í', N'I');
    SET @result = REPLACE(@result, N'Ì', N'I');
    SET @result = REPLACE(@result, N'Ỉ', N'I');
    SET @result = REPLACE(@result, N'Ĩ', N'I');
    SET @result = REPLACE(@result, N'Ị', N'I');
    
    SET @result = REPLACE(@result, N'Ó', N'O');
    SET @result = REPLACE(@result, N'Ò', N'O');
    SET @result = REPLACE(@result, N'Ỏ', N'O');
    SET @result = REPLACE(@result, N'Õ', N'O');
    SET @result = REPLACE(@result, N'Ọ', N'O');
    SET @result = REPLACE(@result, N'Ô', N'O');
    SET @result = REPLACE(@result, N'Ố', N'O');
    SET @result = REPLACE(@result, N'Ồ', N'O');
    SET @result = REPLACE(@result, N'Ổ', N'O');
    SET @result = REPLACE(@result, N'Ỗ', N'O');
    SET @result = REPLACE(@result, N'Ộ', N'O');
    SET @result = REPLACE(@result, N'Ơ', N'O');
    SET @result = REPLACE(@result, N'Ớ', N'O');
    SET @result = REPLACE(@result, N'Ờ', N'O');
    SET @result = REPLACE(@result, N'Ở', N'O');
    SET @result = REPLACE(@result, N'Ỡ', N'O');
    SET @result = REPLACE(@result, N'Ợ', N'O');
    
    SET @result = REPLACE(@result, N'Ú', N'U');
    SET @result = REPLACE(@result, N'Ù', N'U');
    SET @result = REPLACE(@result, N'Ủ', N'U');
    SET @result = REPLACE(@result, N'Ũ', N'U');
    SET @result = REPLACE(@result, N'Ụ', N'U');
    SET @result = REPLACE(@result, N'Ư', N'U');
    SET @result = REPLACE(@result, N'Ứ', N'U');
    SET @result = REPLACE(@result, N'Ừ', N'U');
    SET @result = REPLACE(@result, N'Ử', N'U');
    SET @result = REPLACE(@result, N'Ữ', N'U');
    SET @result = REPLACE(@result, N'Ự', N'U');
    
    SET @result = REPLACE(@result, N'Ý', N'Y');
    SET @result = REPLACE(@result, N'Ỳ', N'Y');
    SET @result = REPLACE(@result, N'Ỷ', N'Y');
    SET @result = REPLACE(@result, N'Ỹ', N'Y');
    SET @result = REPLACE(@result, N'Ỵ', N'Y');
    
    RETURN @result;
END
GO

-- Update FoodNameUnsigned
UPDATE [dbo].[FoodItem]
SET [FoodNameUnsigned] = [dbo].[RemoveDiacritics]([FoodName]);

-- Update FoodNameEn for common items
UPDATE [dbo].[FoodItem] SET [FoodNameEn] = 'Chicken Breast (Raw)' WHERE [FoodName] LIKE N'%Ức gà sống%';
UPDATE [dbo].[FoodItem] SET [FoodNameEn] = 'White Rice (Cooked)' WHERE [FoodName] LIKE N'%Cơm trắng (chín)%';
UPDATE [dbo].[FoodItem] SET [FoodNameEn] = 'Chicken Egg' WHERE [FoodName] LIKE N'%Trứng gà%';
UPDATE [dbo].[FoodItem] SET [FoodNameEn] = 'Broccoli' WHERE [FoodName] LIKE N'%Bông cải xanh%';
UPDATE [dbo].[FoodItem] SET [FoodNameEn] = 'Apple' WHERE [FoodName] LIKE N'%Táo%';
UPDATE [dbo].[FoodItem] SET [FoodNameEn] = 'Beef' WHERE [FoodName] LIKE N'%Thịt bò%';
UPDATE [dbo].[FoodItem] SET [FoodNameEn] = 'Pork' WHERE [FoodName] LIKE N'%Thịt heo%';
UPDATE [dbo].[FoodItem] SET [FoodNameEn] = 'Fish' WHERE [FoodName] LIKE N'%Cá%';
UPDATE [dbo].[FoodItem] SET [FoodNameEn] = 'Milk' WHERE [FoodName] LIKE N'%Sữa%';
UPDATE [dbo].[FoodItem] SET [FoodNameEn] = 'Bread' WHERE [FoodName] LIKE N'%Bánh mì%';
GO
