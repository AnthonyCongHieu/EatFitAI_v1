# CHANGELOG - Deep Audit Session (2025-12-05)

## Tổng quan
Phiên audit toàn diện dự án EatFitAI, tập trung vào việc cải thiện **Internationalization (i18n)** cho Mobile App và kiểm tra **Logging/Error Handling** cho Backend.

---

## 📱 Mobile App Changes

### 1. File: `src/i18n/vi.ts`
**Mục đích:** Thêm translation keys cho các màn hình chính.

**Thay đổi:**
- Thêm namespace `nutrition_insights` với 20+ keys cho màn hình Phân tích dinh dưỡng
- Thêm namespace `nutrition_settings` với 25+ keys cho màn hình Cài đặt dinh dưỡng
- Thêm namespace `food_search` với 20+ keys cho màn hình Tìm kiếm món ăn

**Keys được thêm:**
```typescript
// nutrition_insights
title, subtitle, loading, error_title, retry, adherence_score, adherence_desc,
trend_improving, trend_declining, trend_stable, recommendations_title,
no_recommendations, meal_timing_title, meal_timing_avg, meals_per_day,
adaptive_title, ai_suggestion, current, suggested, apply_change, confidence,
apply_success, apply_error

// nutrition_settings
title, subtitle, current_target, edit, cancel, save, calories_label,
protein_label, carbs_label, fat_label, ai_section_title, ai_section_subtitle,
ai_desc, analyze_btn, new_suggestion, change_label, skip, apply,
update_body_info, success_title, success_message, error_suggest,
error_suggest_msg, validation_calories, validation_protein, validation_carbs,
validation_fat

// food_search
title, subtitle, tab_search, tab_favorites, placeholder, btn_search,
empty_search, empty_search_hint, added_favorite, removed_favorite,
quick_add_success, loading_search, loading_favorites, no_results,
no_favorites, no_results_hint, no_favorites_hint, total_results,
total_favorites, view_details
```

---

### 2. File: `src/app/screens/ai/NutritionInsightsScreen.tsx`
**Mục đích:** Thay thế hardcoded Vietnamese strings bằng i18n keys.

**Thay đổi chi tiết:**
| Dòng | Trước | Sau |
|------|-------|-----|
| 25-26 | N/A | `import { t } from '../../../i18n/vi';` |
| 116 | `"Phân tích dinh dưỡng"` | `t('nutrition_insights.title')` |
| 130 | `"Đang tải dữ liệu..."` | `t('nutrition_insights.loading')` |
| 264-265 | `"Có lỗi xảy ra"` | `t('nutrition_insights.error_title')` |
| 275 | `"Thử lại"` | `t('nutrition_insights.retry')` |
| 288-289 | `"Điểm tuân thủ"` | `t('nutrition_insights.adherence_score')` |
| 305 | `"Đang cải thiện"` | `t('nutrition_insights.trend_improving')` |
| 312 | `"Cần cố gắng hơn"` | `t('nutrition_insights.trend_declining')` |
| 334-337 | `"Ổn định"` | `t('nutrition_insights.trend_stable')` |
| 344 | `"Đề xuất cho bạn"` | `t('nutrition_insights.recommendations_title')` |
| 360 | `"Tuyệt vời!..."` | `t('nutrition_insights.no_recommendations')` |
| 369 | `"Thói quen ăn uống"` | `t('nutrition_insights.meal_timing_title')` |
| 386 | `"Trung bình"` | `t('nutrition_insights.meal_timing_avg')` |
| 390 | `"bữa/ngày"` | `t('nutrition_insights.meals_per_day')` |
| 417 | `"Gợi ý điều chỉnh..."` | `t('nutrition_insights.adaptive_title')` |
| 429 | `"AI đề xuất thay đổi"` | `t('nutrition_insights.ai_suggestion')` |
| 439 | `"HIỆN TẠI"` | `t('nutrition_insights.current')` |
| 469 | `"ĐỀ XUẤT"` | `t('nutrition_insights.suggested')` |
| 498 | `"Áp dụng thay đổi"` | `t('nutrition_insights.apply_change')` |

---

### 3. File: `src/app/screens/ai/NutritionSettingsScreen.tsx`
**Mục đích:** Thay thế hardcoded Vietnamese strings bằng i18n keys.

**Thay đổi chi tiết:**
| Vị trí | Trước | Sau |
|--------|-------|-----|
| Import | N/A | `import { t } from '../../../i18n/vi';` |
| Zod Schema | `'Calories phải từ 500 - 10000'` | `t('nutrition_settings.validation_calories')` |
| Zod Schema | `'Protein phải từ 10 - 1000'` | `t('nutrition_settings.validation_protein')` |
| Zod Schema | `'Carbs phải từ 10 - 1000'` | `t('nutrition_settings.validation_carbs')` |
| Zod Schema | `'Fat phải từ 10 - 1000'` | `t('nutrition_settings.validation_fat')` |
| onError | `'Không thể tạo gợi ý'` | `t('nutrition_settings.error_suggest')` |
| onError | `'Vui lòng thử lại sau'` | `t('nutrition_settings.error_suggest_msg')` |
| Alert | `'Thành công'` | `t('nutrition_settings.success_title')` |
| Alert | `'Đã cập nhật mục tiêu...'` | `t('nutrition_settings.success_message')` |
| Header | `'Cài đặt dinh dưỡng'` | `t('nutrition_settings.title')` |
| Header | `'Quản lý mục tiêu...'` | `t('nutrition_settings.subtitle')` |
| Section | `'Mục tiêu hiện tại'` | `t('nutrition_settings.current_target')` |
| Button | `'Chỉnh sửa'` | `t('nutrition_settings.edit')` |
| Input | `'Tổng Calories (kcal)'` | `t('nutrition_settings.calories_label')` |
| Input | `'Protein (g)'` | `t('nutrition_settings.protein_label')` |
| Input | `'Carbs (g)'` | `t('nutrition_settings.carbs_label')` |
| Input | `'Fat (g)'` | `t('nutrition_settings.fat_label')` |
| Button | `'Hủy'` | `t('nutrition_settings.cancel')` |
| Button | `'Lưu thay đổi'` | `t('nutrition_settings.save')` |
| Section | `'AI Đề xuất (Adaptive)'` | `t('nutrition_settings.ai_section_title')` |
| Section | `'Tự động tính toán...'` | `t('nutrition_settings.ai_section_subtitle')` |
| Body | `'AI sẽ phân tích...'` | `t('nutrition_settings.ai_desc')` |
| Button | `'Phân tích & Đề xuất lại'` | `t('nutrition_settings.analyze_btn')` |
| Title | `'✨ Đề xuất mới'` | `t('nutrition_settings.new_suggestion')` |
| Label | `'Thay đổi'` | `t('nutrition_settings.change_label')` |
| Button | `'Bỏ qua'` | `t('nutrition_settings.skip')` |
| Button | `'Áp dụng'` | `t('nutrition_settings.apply')` |
| Button | `'Cập nhật thông tin cơ thể...'` | `t('nutrition_settings.update_body_info')` |

---

### 4. File: `src/app/screens/diary/FoodSearchScreen.tsx`
**Mục đích:** Thay thế hardcoded Vietnamese strings bằng i18n keys.

**Thay đổi chi tiết:**
| Vị trí | Trước | Sau |
|--------|-------|-----|
| Import | N/A | `import { t } from '../../../i18n/vi';` |
| Toast | `'Đã thêm vào yêu thích'` | `t('food_search.added_favorite')` |
| Toast | `'Đã xóa khỏi yêu thích'` | `t('food_search.removed_favorite')` |
| Toast | `'Đã thêm nhanh'` | `t('food_search.quick_add_success')` |
| Toast | `'Vui lòng nhập từ khóa...'` | `t('food_search.empty_search')` |
| Toast | `'Ví dụ: gà, cơm, salad...'` | `t('food_search.empty_search_hint')` |
| Button | `'Xem'` | `t('food_search.view_details')` |
| Header | `'Tìm kiếm món ăn'` | `t('food_search.title')` |
| Header | `'Tìm và thêm món ăn...'` | `t('food_search.subtitle')` |
| Tab | `'Tìm kiếm'` | `t('food_search.tab_search')` |
| Tab | `'Yêu thích'` | `t('food_search.tab_favorites')` |
| Input | `'Nhập từ khóa tìm kiếm...'` | `t('food_search.placeholder')` |
| Button | `'Tìm'` | `t('food_search.btn_search')` |
| Loading | `'Đang tìm kiếm...'` | `t('food_search.loading_search')` |
| Loading | `'Đang tải danh sách yêu thích...'` | `t('food_search.loading_favorites')` |
| Empty | `'🍽️ Không tìm thấy kết quả'` | `t('food_search.no_results')` |
| Empty | `'❤️ Chưa có món yêu thích'` | `t('food_search.no_favorites')` |
| Empty | `'Thử tìm kiếm với từ khóa khác...'` | `t('food_search.no_results_hint')` |
| Empty | `'Hãy thả tim các món ăn...'` | `t('food_search.no_favorites_hint')` |
| Footer | `'Tổng kết quả: '` | `t('food_search.total_results')` |
| Footer | `'Tổng món yêu thích: '` | `t('food_search.total_favorites')` |

---

## 🔧 Backend Audit Findings (Không có code changes)

### Các Controllers đã kiểm tra:
- `FoodController.cs`
- `UserFoodItemsController.cs`
- `MealDiaryController.cs`
- `NutritionController.cs`
- `UserController.cs`

### Phát hiện:
1. **Generic Error Handling:** Tất cả controllers sử dụng pattern `StatusCode(500, ...)` cho unhandled exceptions.
2. **Code Duplication:** Method `GetUserIdFromToken()` bị duplicate ở nhiều controllers.
3. **Hardcoded Strings:** `AuthService.cs` và `NutritionInsightService.cs` chứa Vietnamese messages (acceptable cho target audience).

### Recommendations:
- Implement Global Exception Handler Middleware
- Refactor `GetUserIdFromToken()` vào `BaseController` hoặc `ICurrentUserService`
- Cân nhắc structured logging với Serilog

---

## 📊 Statistics

| Metric | Value |
|--------|-------|
| Files Modified | 4 |
| Translation Keys Added | ~70 |
| Hardcoded Strings Replaced | ~50 |
| Backend Controllers Audited | 5 |
| Backend Services Reviewed | 3 |

---

## ✅ Kết luận
Dự án đã được cải thiện đáng kể về mặt maintainability và production-readiness:
- Mobile app giờ đã có hệ thống i18n tập trung
- Dễ dàng thêm ngôn ngữ mới trong tương lai
- Backend functional nhưng cần refactoring trong các sprint tiếp theo
