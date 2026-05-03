# Hướng Dẫn Seed Nutrition Data Cho Class Mới

> **Mục đích**: Khi train YOLO11 với class mới, cần seed data vào DB để mapping hoạt động.
> **Quan trọng**: Không seed = YOLO detect ra nhưng trả `null` nutrition → user thấy 0 kcal.

---

## Kiến Trúc Mapping (Hiểu trước khi seed)

```
YOLO detect "fried_chicken" (confidence 0.85)
    ↓
AiFoodMapService.MapDetectionsAsync()
    ↓
Layer 1: AiLabelMap table (exact match: "fried_chicken" → FoodItemId = 150)
    ↓ (nếu không tìm thấy)
Layer 2: FoodItem catalog (fuzzy match: FoodNameEn CONTAINS "fried chicken")
    ↓ (nếu vẫn không tìm thấy)
Trả về: label + confidence + bbox, nhưng nutrition = null
```

**Layer 1 (AiLabelMap)** nhanh và chính xác → ưu tiên seed bảng này.
**Layer 2 (Catalog)** chậm hơn, fuzzy match có thể sai → dùng làm fallback.

---

## Template SQL — Copy và sửa

### Bước 1: Seed FoodItem (nutrition data)

```sql
-- ============================================
-- SEED FOOD ITEMS CHO CLASS MỚI
-- Thay đổi giá trị nutrition cho phù hợp
-- Nguồn tham khảo: https://fdc.nal.usda.gov/ (USDA FoodData Central)
-- ============================================

INSERT INTO "FoodItems" (
    "FoodName",           -- Tên tiếng Việt
    "FoodNameEn",         -- Tên tiếng Anh (KHỚP VỚI YOLO CLASS NAME, thay _ bằng space)
    "FoodNameUnsigned",   -- Tên không dấu (cho search)
    "CaloriesPer100g",
    "ProteinPer100g",
    "CarbPer100g",
    "FatPer100g",
    "IsActive",
    "IsVerified",
    "CredibilityScore",
    "CreatedAt",
    "UpdatedAt",
    "IsDeleted"
) VALUES
-- === THỊT & HẢI SẢN ===
('Gà chiên',      'fried chicken',    'ga chien',      246, 26.0, 10.0, 12.0, true, true, 80, NOW(), NOW(), false),
('Gà nướng',      'grilled chicken',  'ga nuong',      190, 29.0,  0.5,  7.0, true, true, 80, NOW(), NOW(), false),
('Gà luộc',       'boiled chicken',   'ga luoc',       215, 27.0,  0.0,  11.0, true, true, 80, NOW(), NOW(), false),
('Cá hồi',        'salmon',           'ca hoi',        208, 20.0,  0.0,  13.0, true, true, 80, NOW(), NOW(), false),
('Tôm chiên',     'fried shrimp',     'tom chien',     242, 18.0, 11.0, 14.0, true, true, 80, NOW(), NOW(), false),

-- === CƠM & MÌ ===
('Cơm chiên',     'fried rice',       'com chien',     163, 4.0,  24.0,  5.5, true, true, 80, NOW(), NOW(), false),
('Phở bò',        'pho',              'pho bo',         45, 4.0,   4.0,  1.5, true, true, 80, NOW(), NOW(), false),
('Bún bò Huế',    'bun bo hue',       'bun bo hue',     42, 3.5,   4.5,  1.2, true, true, 80, NOW(), NOW(), false),
('Mì xào',        'stir fried noodles','mi xao',       180, 5.0,  26.0,  6.0, true, true, 80, NOW(), NOW(), false),

-- === TRÁI CÂY (ví dụ thêm) ===
('Dưa hấu',       'watermelon',       'dua hau',       30,  0.6,  7.6,  0.2, true, true, 80, NOW(), NOW(), false),
('Xoài',          'mango',            'xoai',           60,  0.8, 15.0,  0.4, true, true, 80, NOW(), NOW(), false)

-- THÊM CLASS MỚI Ở ĐÂY...
-- ('Tên VN', 'yolo_class_name thay _ bằng space', 'ten khong dau', cal, pro, carb, fat, true, true, 80, NOW(), NOW(), false),
;
```

### Bước 2: Seed AiLabelMap (mapping YOLO label → FoodItemId)

```sql
-- ============================================
-- SEED AI LABEL MAP
-- Label PHẢI KHỚP CHÍNH XÁC với YOLO class name (lowercase, underscore)
-- FoodItemId lấy từ bước 1
-- ============================================

-- Lấy FoodItemId từ FoodNameEn
INSERT INTO "AiLabelMaps" ("Label", "FoodItemId", "MinConfidence", "CreatedAt")
SELECT 
    LOWER(REPLACE("FoodNameEn", ' ', '_')),  -- 'fried chicken' → 'fried_chicken'
    "FoodItemId",
    0.50,  -- Min confidence threshold (0.5 = chỉ map khi YOLO >= 50% confident)
    NOW()
FROM "FoodItems"
WHERE "FoodNameEn" IN (
    'fried chicken',
    'grilled chicken',
    'boiled chicken',
    'salmon',
    'fried shrimp',
    'fried rice',
    'pho',
    'bun bo hue',
    'stir fried noodles',
    'watermelon',
    'mango'
    -- THÊM TÊN MỚI Ở ĐÂY...
)
AND NOT EXISTS (
    SELECT 1 FROM "AiLabelMaps" 
    WHERE "Label" = LOWER(REPLACE("FoodItems"."FoodNameEn", ' ', '_'))
);
```

### Bước 3: Seed FoodServing (serving size — tùy chọn)

```sql
-- ============================================
-- SEED SERVING SIZES
-- ServingUnitId phổ biến: 1 = gram, 2 = chén, 3 = tô, 4 = miếng, 5 = quả
-- Kiểm tra bảng ServingUnits trước để lấy ID chính xác
-- ============================================

-- Ví dụ: thêm serving "1 chén" = 200g cho cơm chiên
INSERT INTO "FoodServings" ("FoodItemId", "ServingUnitId", "GramsPerUnit", "Description")
SELECT fi."FoodItemId", 2, 200, '1 chén cơm chiên'
FROM "FoodItems" fi
WHERE fi."FoodNameEn" = 'fried rice'
AND NOT EXISTS (
    SELECT 1 FROM "FoodServings" 
    WHERE "FoodItemId" = fi."FoodItemId" AND "ServingUnitId" = 2
);

-- Ví dụ: thêm serving "1 tô" = 350g cho phở
INSERT INTO "FoodServings" ("FoodItemId", "ServingUnitId", "GramsPerUnit", "Description")
SELECT fi."FoodItemId", 3, 350, '1 tô phở'
FROM "FoodItems" fi
WHERE fi."FoodNameEn" = 'pho'
AND NOT EXISTS (
    SELECT 1 FROM "FoodServings" 
    WHERE "FoodItemId" = fi."FoodItemId" AND "ServingUnitId" = 3
);
```

---

## Quy Trình Seed (Từng Bước)

1. **Xác định class list** — lấy từ `data.yaml` sau khi train xong
2. **Tra nutrition** — vào [USDA FoodData Central](https://fdc.nal.usda.gov/) tra từng item
3. **Viết SQL** — dùng template trên, thay giá trị
4. **Chạy migration** — `dotnet ef migrations add SeedNewFoodClasses`
5. **Test** — quét ảnh → kiểm tra nutrition có trả về đúng không

---

## NormalizeSearchKey Mapping (Quan trọng)

`AiFoodMapService.NormalizeSearchKey()` có hardcode mapping:
```csharp
"beef" or "raw beef" or "beef meat" => "thit bo"
"chicken" or "raw chicken" or "chicken meat" => "thit ga"
```

**Khi thêm class mới dạng tiếng Anh**, cần:
- Thêm mapping vào `NormalizeSearchKey()` nếu class có nhiều alias
- HOẶC đảm bảo `FoodNameEn` trong DB khớp chính xác với YOLO label

---

## Checklist Seed Data

- [ ] Mỗi YOLO class có tối thiểu 1 `FoodItem` với nutrition > 0
- [ ] Mỗi YOLO class có 1 row trong `AiLabelMap` (exact match)
- [ ] `FoodNameEn` = YOLO class name nhưng **thay _ bằng space**
- [ ] `FoodNameUnsigned` = tên VN không dấu (cho search tiếng Việt)
- [ ] Nutrition values lấy từ USDA hoặc nguồn đáng tin cậy
- [ ] Serving sizes có ít nhất 1 unit phổ biến (chén, tô, miếng...)
- [ ] Test: detect ảnh → API trả nutrition đúng
