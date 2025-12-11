-- Migration: Add Instructions and VideoUrl to Recipes table
-- Created: 2024-12-11
-- Purpose: Enable storing cooking instructions and video tutorial URLs for recipes

-- Add Instructions column (text for multi-line cooking steps)
ALTER TABLE Recipes ADD Instructions NVARCHAR(MAX) NULL;

-- Add VideoUrl column (YouTube embed URL)
ALTER TABLE Recipes ADD VideoUrl NVARCHAR(500) NULL;

-- Example: Insert video URL for a recipe
-- UPDATE Recipes SET VideoUrl = 'https://www.youtube.com/embed/VIDEO_ID' WHERE RecipeId = 1;

-- Example: Insert instructions for a recipe (use newlines to separate steps)
-- UPDATE Recipes SET Instructions = 'Bước 1: Rửa sạch nguyên liệu
-- Bước 2: Cắt nhỏ rau củ
-- Bước 3: Nấu chín trong 15 phút' WHERE RecipeId = 1;
