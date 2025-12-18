-- ============================================
-- THÊM FOODITEMS TIẾNG VIỆT CHO 63 INGREDIENTS
-- EatFitAI - SQL Server
-- ============================================

-- Chỉ INSERT nếu chưa có (dựa trên FoodNameEn)
-- Nutrition data từ USDA

INSERT INTO FoodItem (FoodName, FoodNameEn, FoodNameUnsigned, CaloriesPer100g, ProteinPer100g, CarbPer100g, FatPer100g, IsActive, CreatedAt, UpdatedAt, IsDeleted)
SELECT * FROM (VALUES
    (N'Táo', 'apple', 'Tao', 52, 0.3, 14, 0.2, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Bơ (quả)', 'avocado', 'Bo (qua)', 160, 2, 9, 15, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Chuối', 'banana', 'Chuoi', 89, 1.1, 23, 0.3, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Lá nguyệt quế', 'bayleaf', 'La nguyet que', 313, 8, 75, 8, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Đậu', 'beans', 'Dau', 347, 21, 63, 1.2, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Thịt bò', 'beef', 'Thit bo', 250, 26, 0, 15, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Củ dền', 'beet', 'Cu den', 43, 1.6, 10, 0.2, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Ớt chuông', 'bell_pepper', 'Ot chuong', 31, 1, 6, 0.3, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Việt quất', 'blueberry', 'Viet quat', 57, 0.7, 14, 0.3, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Bông cải xanh', 'broccoli', 'Bong cai xanh', 34, 2.8, 7, 0.4, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Bắp cải', 'cabbage', 'Bap cai', 25, 1.3, 6, 0.1, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Cà rốt', 'carrot', 'Ca rot', 41, 0.9, 10, 0.2, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Súp lơ trắng', 'cauliflower', 'Sup lo trang', 25, 2, 5, 0.1, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Cần tây', 'celery', 'Can tay', 16, 0.7, 3, 0.2, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Anh đào', 'cherry', 'Anh dao', 50, 1, 12, 0.3, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Thịt gà', 'chicken', 'Thit ga', 239, 27, 0, 14, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Đậu gà', 'chickpeas', 'Dau ga', 164, 9, 27, 2.6, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Đinh hương', 'cloves', 'Dinh huong', 274, 6, 66, 13, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Rau mùi', 'coriander', 'Rau mui', 23, 2.1, 4, 0.5, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Bắp ngô', 'corn', 'Bap ngo', 96, 3.4, 21, 1.5, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Nam việt quất', 'cranberry', 'Nam viet quat', 46, 0.4, 12, 0.1, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Dưa chuột', 'cucumber', 'Dua chuot', 16, 0.7, 4, 0.1, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Bột cà ri', 'curry_powder', 'Bot ca ri', 325, 14, 58, 14, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Trứng gà', 'egg', 'Trung ga', 155, 13, 1.1, 11, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Cà tím', 'eggplant', 'Ca tim', 25, 1, 6, 0.2, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Cá', 'fish', 'Ca', 206, 22, 0, 12, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Tỏi', 'garlic', 'Toi', 149, 6.4, 33, 0.5, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Gừng', 'ginger', 'Gung', 80, 1.8, 18, 0.8, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Lý gai', 'gooseberry', 'Ly gai', 44, 0.9, 10, 0.6, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Nho', 'grape', 'Nho', 69, 0.7, 18, 0.2, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Ổi', 'guava', 'Oi', 68, 2.6, 14, 1, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Quất', 'kumquat', 'Quat', 71, 1.9, 16, 0.9, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Thịt cừu', 'lamb', 'Thit cuu', 294, 25, 0, 21, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Tỏi tây', 'leek', 'Toi tay', 61, 1.5, 14, 0.3, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Chanh', 'lemon', 'Chanh', 29, 1.1, 9, 0.3, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Xà lách', 'lettuce', 'Xa lach', 15, 1.4, 3, 0.2, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Xoài', 'mango', 'Xoai', 60, 0.8, 15, 0.4, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Bí đao', 'marrow', 'Bi dao', 17, 1, 3, 0.2, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Dâu tằm', 'mulberry', 'Dau tam', 43, 1.4, 10, 0.4, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Đậu bắp', 'okra', 'Dau bap', 33, 1.9, 7, 0.2, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Hành tây', 'onion', 'Hanh tay', 40, 1.1, 9, 0.1, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Cam', 'orange', 'Cam', 47, 0.9, 12, 0.1, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Đu đủ', 'papaya', 'Du du', 43, 0.5, 11, 0.3, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Đậu phộng', 'peanut', 'Dau phong', 567, 26, 16, 49, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Lê', 'pear', 'Le', 57, 0.4, 15, 0.1, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Đậu Hà Lan', 'peas', 'Dau Ha Lan', 81, 5, 14, 0.4, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Tiêu', 'pepper', 'Tieu', 40, 1.9, 10, 0.4, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Dứa', 'pineapple', 'Dua', 50, 0.5, 13, 0.1, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Thịt heo', 'pork', 'Thit heo', 242, 27, 0, 14, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Khoai tây', 'potato', 'Khoai tay', 77, 2, 17, 0.1, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Bí đỏ', 'pumpkin', 'Bi do', 26, 1, 7, 0.1, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Củ cải', 'radish', 'Cu cai', 16, 0.7, 3, 0.1, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Phúc bồn tử', 'raspberry', 'Phuc bon tu', 52, 1.2, 12, 0.7, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Gạo', 'rice', 'Gao', 130, 2.7, 28, 0.3, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Salad', 'salad', 'Salad', 20, 1.3, 4, 0.2, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Muối', 'salt', 'Muoi', 0, 0, 0, 0, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Tôm', 'shrimp', 'Tom', 99, 24, 0.2, 0.3, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Rau bina', 'spinach', 'Rau bina', 23, 2.9, 4, 0.4, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Hành lá', 'spring_onion', 'Hanh la', 32, 1.8, 7, 0.2, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Bí ngòi', 'squash', 'Bi ngoi', 34, 1.2, 9, 0.2, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Dâu tây', 'strawberry', 'Dau tay', 32, 0.7, 8, 0.3, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Cà chua', 'tomato', 'Ca chua', 18, 0.9, 4, 0.2, 1, GETUTCDATE(), GETUTCDATE(), 0),
    (N'Nghệ', 'turmeric', 'Nghe', 354, 8, 65, 10, 1, GETUTCDATE(), GETUTCDATE(), 0)
) AS NewFoods (FoodName, FoodNameEn, FoodNameUnsigned, CaloriesPer100g, ProteinPer100g, CarbPer100g, FatPer100g, IsActive, CreatedAt, UpdatedAt, IsDeleted)
WHERE NOT EXISTS (
    SELECT 1 FROM FoodItem f WHERE f.FoodNameEn = NewFoods.FoodNameEn
);

-- Verify
SELECT FoodItemId, FoodName, FoodNameEn, CaloriesPer100g FROM FoodItem WHERE FoodNameEn IS NOT NULL ORDER BY FoodNameEn;
PRINT 'Vietnamese FoodItems inserted!';
GO
