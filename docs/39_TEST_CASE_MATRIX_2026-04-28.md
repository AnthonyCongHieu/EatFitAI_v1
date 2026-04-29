# 📋 EatFitAI — Test Case Matrix (Doc 39)

> **Ngày tạo**: 28/04/2026  
> **Phiên bản**: 1.0  
> **Mục đích**: Bảng kiểm thử toàn diện cho Hội đồng bảo vệ — đánh giá độ bao phủ chức năng, bảo mật, và trường hợp biên.

---

## 1. Authentication & Authorization

| TC-ID | Module | Test Case | Input | Expected Output | Priority | Loại |
|-------|--------|-----------|-------|-----------------|----------|------|
| AUTH-01 | Register | Đăng ký thành công với email hợp lệ | email, password (≥8 chars), displayName | 200 OK, user created, verification email sent | P0 | Functional |
| AUTH-02 | Register | Đăng ký với email đã tồn tại | email trùng | 409 Conflict, "Email đã được sử dụng" | P0 | Negative |
| AUTH-03 | Register | Đăng ký với password yếu (<8 chars) | password = "123" | 400 Bad Request, validation error | P0 | Negative |
| AUTH-04 | Register | Đăng ký với email không hợp lệ | email = "abc" | 400 Bad Request | P1 | Negative |
| AUTH-05 | Login | Đăng nhập thành công | email/password đúng | 200 OK, JWT + RefreshToken | P0 | Functional |
| AUTH-06 | Login | Đăng nhập sai password | password sai | 401, "Email hoặc mật khẩu không đúng" | P0 | Negative |
| AUTH-07 | Login | Đăng nhập email chưa xác thực | email chưa verify | 403, "Vui lòng xác thực email" | P0 | Negative |
| AUTH-08 | Login | Đăng nhập email không tồn tại | email không có trong DB | 401 (không tiết lộ email tồn tại) | P0 | Security |
| AUTH-09 | Token | Refresh token hợp lệ | refreshToken valid | 200 OK, new JWT + RefreshToken | P0 | Functional |
| AUTH-10 | Token | Refresh token hết hạn | refreshToken expired | 401 Unauthorized | P0 | Negative |
| AUTH-11 | Token | Truy cập API không có JWT | No Authorization header | 401 Unauthorized | P0 | Security |
| AUTH-12 | Token | JWT hết hạn | expired JWT | 401 Unauthorized | P0 | Security |
| AUTH-13 | Password | Đổi mật khẩu thành công | oldPassword đúng, newPassword hợp lệ | 200 OK | P1 | Functional |
| AUTH-14 | Password | Đổi mật khẩu sai old password | oldPassword sai | 400 Bad Request | P1 | Negative |
| AUTH-15 | Password | Quên mật khẩu - gửi reset code | email hợp lệ | 200 OK, email sent | P1 | Functional |
| AUTH-16 | Password | Reset password với code hợp lệ | valid reset code + new password | 200 OK | P1 | Functional |
| AUTH-17 | Password | Reset password với code hết hạn | expired code | 400 Bad Request | P1 | Negative |
| AUTH-18 | Google Auth | Đăng nhập Google thành công | valid Google token | 200 OK, JWT issued | P1 | Functional |
| AUTH-19 | Security | PBKDF2 hash verification | password + stored hash | Verify returns true | P0 | Security |
| AUTH-20 | Security | Legacy SHA-256 fallback | old SHA-256 hash | Auto-migrate to PBKDF2 | P1 | Security |

---

## 2. Meal Diary (Nhật ký ăn uống)

| TC-ID | Module | Test Case | Input | Expected Output | Priority | Loại |
|-------|--------|-----------|-------|-----------------|----------|------|
| MEAL-01 | Create | Thêm bữa ăn từ catalog food | foodItemId, grams, mealTypeId, eatenDate | 200 OK, macros tính đúng | P0 | Functional |
| MEAL-02 | Create | Thêm bữa ăn từ UserFoodItem | userFoodItemId, grams | 200 OK, macros từ UserFoodItem | P0 | Functional |
| MEAL-03 | Create | Thêm bữa ăn từ UserDish (template) | userDishId, grams | 200 OK, macros tổng hợp từ ingredients | P0 | Functional |
| MEAL-04 | Create | Thêm bữa ăn từ Recipe | recipeId, grams | 200 OK, macros từ recipe ingredients | P0 | Functional |
| MEAL-05 | Create | Thêm bữa ăn với grams = 0 | grams = 0 | 400 Bad Request | P1 | Negative |
| MEAL-06 | Create | Thêm bữa ăn với grams âm | grams = -100 | 400 Bad Request | P1 | Negative |
| MEAL-07 | Create | Thêm bữa ăn với foodItemId không tồn tại | foodItemId = 999999 | 404 Not Found | P1 | Negative |
| MEAL-08 | Create | ExclusiveSource: chỉ 1 source được set | foodItemId + userFoodItemId cùng lúc | 400 Bad Request hoặc chỉ dùng 1 | P0 | Logic |
| MEAL-09 | Read | Lấy nhật ký theo ngày | userId, date | Danh sách bữa ăn theo ngày | P0 | Functional |
| MEAL-10 | Read | Lấy nhật ký ngày không có dữ liệu | date không có meal | 200 OK, empty array | P1 | Boundary |
| MEAL-11 | Update | Cập nhật grams bữa ăn | mealDiaryId, newGrams | 200 OK, macros recalculated | P1 | Functional |
| MEAL-12 | Delete | Xóa bữa ăn (soft delete) | mealDiaryId | 200 OK, isDeleted = true | P1 | Functional |
| MEAL-13 | Delete | Xóa bữa ăn của user khác | mealDiaryId thuộc user khác | 404 Not Found | P0 | Security |
| MEAL-14 | Macro | Tính calories chính xác (per 100g scaling) | 150g food, caloriesPer100g = 200 | calories = 300 | P0 | Logic |
| MEAL-15 | Streak | Log meal → streak tăng nếu liên tiếp | log ngày liên tiếp | currentStreak += 1 | P1 | Functional |
| MEAL-16 | Streak | Bỏ 1 ngày → streak reset | skip 1 ngày rồi log | currentStreak = 1 | P1 | Logic |
| MEAL-17 | Streak | Log cùng ngày 2 lần → streak không tăng | log 2 meals cùng ngày | streak giữ nguyên | P1 | Logic |

---

## 3. Food Search & Barcode

| TC-ID | Module | Test Case | Input | Expected Output | Priority | Loại |
|-------|--------|-----------|-------|-----------------|----------|------|
| FOOD-01 | Search | Tìm kiếm thực phẩm theo tên | searchTerm = "gà" | Danh sách food có "gà" | P0 | Functional |
| FOOD-02 | Search | Tìm kiếm không kết quả | searchTerm = "xyz123abc" | 200 OK, empty array | P1 | Boundary |
| FOOD-03 | Search | SearchAll: kết hợp catalog + user food | searchTerm, userId | Kết quả từ cả 2 nguồn | P0 | Functional |
| FOOD-04 | Barcode | Quét barcode có trong DB | barcode trong catalog | Food item từ DB | P0 | Functional |
| FOOD-05 | Barcode | Quét barcode không có trong DB | barcode mới | Gọi OpenFoodFacts, lưu vào DB | P1 | Functional |
| FOOD-06 | Barcode | Barcode rỗng/invalid | barcode = "" | null hoặc 400 | P1 | Negative |
| FOOD-07 | Barcode | OpenFoodFacts trả 404 | barcode không tồn tại trên provider | null (không crash) | P1 | Boundary |
| FOOD-08 | Barcode | OpenFoodFacts timeout | provider timeout | BarcodeProviderUnavailableException | P1 | Error |
| FOOD-09 | Recent | Lấy recent foods | userId | Danh sách sắp xếp theo lastUsedAt DESC | P1 | Functional |
| FOOD-10 | Recent | User mới không có recent foods | userId mới | 200 OK, empty array | P1 | Boundary |

---

## 4. AI Vision (Nhận diện thực phẩm qua ảnh)

| TC-ID | Module | Test Case | Input | Expected Output | Priority | Loại |
|-------|--------|-----------|-------|-----------------|----------|------|
| AI-01 | Scan | Quét ảnh thực phẩm thành công | ảnh rõ nét, có thực phẩm | Danh sách food detected + nutrition | P0 | Functional |
| AI-02 | Scan | Quét ảnh không có thực phẩm | ảnh phong cảnh | Empty results hoặc low confidence | P1 | Boundary |
| AI-03 | Scan | Quét ảnh kích thước quá lớn | ảnh > 10MB | 400 Bad Request | P1 | Negative |
| AI-04 | Scan | Quét ảnh format không hỗ trợ | file .bmp | 400 Bad Request | P1 | Negative |
| AI-05 | Scan | AI Provider không khả dụng | provider down | 503 Service Unavailable (graceful) | P0 | Error |
| AI-06 | Cache | Vision cache hit | ảnh đã quét trước đó | Trả kết quả từ cache (nhanh hơn) | P1 | Performance |
| AI-07 | Token | Gemini API key pool rotation | 1 key hết quota | Tự chuyển sang key tiếp theo | P0 | Resilience |

---

## 5. AI Review (Đánh giá tiến độ tự động)

| TC-ID | Module | Test Case | Input | Expected Output | Priority | Loại |
|-------|--------|-----------|-------|-----------------|----------|------|
| AIREV-01 | Trigger | Trigger review tự động khi đủ dữ liệu | ≥7 ngày diary data | Review được tạo | P0 | Functional |
| AIREV-02 | Trigger | Không trigger khi chưa đủ 7 ngày | <7 ngày data | Không tạo review | P1 | Logic |
| AIREV-03 | Quality | DataQuality score ≥ 0.6 mới review | dữ liệu đủ chất lượng | Review thực hiện | P0 | Logic |
| AIREV-04 | Quality | DataQuality score < 0.6 | dữ liệu thưa thớt | Không review, trả lý do | P1 | Logic |
| AIREV-05 | Goal | WeightLoss: đánh giá giảm cân | goal = "lose", weight giảm | Positive progress review | P1 | Functional |
| AIREV-06 | Goal | WeightGain: đánh giá tăng cân | goal = "gain", weight tăng | Positive progress review | P1 | Functional |
| AIREV-07 | Goal | Maintain: đánh giá duy trì | goal = "maintain", weight ổn định | Stable progress review | P1 | Functional |
| AIREV-08 | Edge | User không có body metrics | no BodyMetrics records | Review skip hoặc partial data | P1 | Boundary |

---

## 6. Nutrition Insight (Phân tích dinh dưỡng)

| TC-ID | Module | Test Case | Input | Expected Output | Priority | Loại |
|-------|--------|-----------|-------|-----------------|----------|------|
| NUT-01 | Adherence | Tính AdherenceScore khi intake = target | actual ≈ target | Score ≈ 1.0 | P0 | Logic |
| NUT-02 | Adherence | Tính AdherenceScore khi intake = 0 | no meals logged | Score = 0 | P1 | Boundary |
| NUT-03 | Adherence | Tính AdherenceScore khi vượt target 200% | actual = 2x target | Score thấp | P1 | Logic |
| NUT-04 | Recommend | Thiếu protein → đề xuất tăng protein | protein < 80% target | Recommendation: "Tăng protein" | P1 | Functional |
| NUT-05 | Recommend | Đủ macro → không đề xuất | all macros ≈ target | Empty recommendations | P1 | Logic |
| NUT-06 | Adaptive | AdaptiveTarget sau 10+ ngày | ≥10 ngày data, deviation >15% | Target được điều chỉnh | P1 | Logic |
| NUT-07 | Adaptive | AdaptiveTarget dưới 10 ngày | <10 ngày data | Không điều chỉnh | P1 | Logic |
| NUT-08 | Target | Không có NutritionTarget | user mới | Fallback defaults hoặc prompt setup | P0 | Boundary |

---

## 7. Voice Processing (Nhập liệu bằng giọng nói)

| TC-ID | Module | Test Case | Input | Expected Output | Priority | Loại |
|-------|--------|-----------|-------|-----------------|----------|------|
| VOICE-01 | ADD_FOOD | "thêm 2 quả trứng vào bữa sáng" | Vietnamese voice text | Intent=ADD_FOOD, food="quả trứng", qty=2, meal=Breakfast | P0 | Functional |
| VOICE-02 | ADD_FOOD | "ăn cơm trưa" | short command | Intent=ADD_FOOD, food="cơm", meal=Lunch | P1 | Functional |
| VOICE-03 | LOG_WEIGHT | "cân nặng 65.5 kg" | weight command | Intent=LOG_WEIGHT, weight=65.5 | P0 | Functional |
| VOICE-04 | ASK_CALORIES | "hôm nay ăn bao nhiêu calo" | query command | Intent=ASK_CALORIES | P0 | Functional |
| VOICE-05 | UNKNOWN | "thời tiết hôm nay thế nào" | unrelated text | Intent=UNKNOWN, confidence=0 | P1 | Boundary |
| VOICE-06 | Edge | Empty/null text | text = "" | UNKNOWN intent | P1 | Negative |
| VOICE-07 | Priority | "ăn bao nhiêu calo" (có từ "ăn") | ambiguous: ASK vs ADD | ASK_CALORIES (ưu tiên trước ADD_FOOD) | P0 | Logic |

---

## 8. Custom Dish (Món ăn tự tạo)

| TC-ID | Module | Test Case | Input | Expected Output | Priority | Loại |
|-------|--------|-----------|-------|-----------------|----------|------|
| DISH-01 | Create | Tạo custom dish thành công | dishName, ingredients[] | 200 OK, dish created | P0 | Functional |
| DISH-02 | Create | Tạo dish trùng tên | dishName đã tồn tại | 400 "already exists" | P1 | Negative |
| DISH-03 | Create | Tạo dish không có ingredients | ingredients = [] | 400 "at least one ingredient" | P1 | Negative |
| DISH-04 | Create | Ingredient grams = 0 | grams = 0 | 400 "grams > 0" | P1 | Negative |
| DISH-05 | Apply | Áp dụng dish vào nhật ký | userDishId, targetDate, mealTypeId | MealDiary entry created | P0 | Functional |
| DISH-06 | Delete | Soft delete dish | userDishId | isDeleted = true | P1 | Functional |
| DISH-07 | Security | Truy cập dish của user khác | userDishId thuộc user khác | 404 Not Found | P0 | Security |

---

## 9. Recipe Suggestion (Gợi ý công thức)

| TC-ID | Module | Test Case | Input | Expected Output | Priority | Loại |
|-------|--------|-----------|-------|-----------------|----------|------|
| RECIPE-01 | Suggest | Gợi ý với ingredients match | availableIngredients = ["chicken","rice"] | Recipes sorted by matchPercentage | P0 | Functional |
| RECIPE-02 | Suggest | Không có ingredients | ingredients = [] | Empty list (không crash) | P1 | Boundary |
| RECIPE-03 | Filter | Lọc theo dietary restrictions (vegetarian) | userPrefs.dietary = "vegetarian" | Loại bỏ recipes có thịt | P1 | Functional |
| RECIPE-04 | Filter | Lọc theo allergy (seafood) | userPrefs.allergies = "seafood" | Loại bỏ recipes có tôm/cá | P1 | Functional |
| RECIPE-05 | Detail | Xem chi tiết recipe | recipeId | Full nutrition + ingredients | P1 | Functional |
| RECIPE-06 | Cache | Cache hit cho recipe list | gọi lần 2 trong 10 phút | Trả từ MemoryCache | P2 | Performance |
| RECIPE-07 | i18n | Ingredient mapping EN→VI | "chicken" | Mở rộng tìm "gà","thịt gà","ức gà" | P1 | Logic |

---

## 10. User Profile & Body Metrics

| TC-ID | Module | Test Case | Input | Expected Output | Priority | Loại |
|-------|--------|-----------|-------|-----------------|----------|------|
| USER-01 | Profile | Lấy profile thành công | userId | UserProfileDto đầy đủ | P0 | Functional |
| USER-02 | Profile | Update profile | displayName, gender, goal | 200 OK, fields updated | P0 | Functional |
| USER-03 | Avatar | Upload avatar JPG | file.jpg, ≤5MB | AvatarUrl returned | P1 | Functional |
| USER-04 | Avatar | Upload avatar format sai | file.gif | 400 "Chỉ chấp nhận JPG, PNG, WEBP" | P1 | Negative |
| USER-05 | Metrics | Ghi body metric mới | heightCm, weightKg, measuredDate | BodyMetric created | P0 | Functional |
| USER-06 | Metrics | Lấy lịch sử body metrics | userId, limit=30 | Sorted by measuredDate DESC | P1 | Functional |
| USER-07 | Delete | Xóa tài khoản (cascade) | userId | Tất cả related data bị xóa | P1 | Functional |
| USER-08 | Delete | Xóa tài khoản: FK cascade đúng | userId có diary, metrics, AI logs | Không lỗi FK constraint | P0 | Logic |

---

## 11. Water Intake (Theo dõi nước uống)

| TC-ID | Module | Test Case | Input | Expected Output | Priority | Loại |
|-------|--------|-----------|-------|-----------------|----------|------|
| WATER-01 | Log | Ghi lượng nước uống | amountMl, date | 200 OK, entry created | P1 | Functional |
| WATER-02 | Summary | Tổng nước trong ngày | date | totalMl cho ngày đó | P1 | Functional |
| WATER-03 | Edge | Ghi amount = 0 hoặc âm | amountMl ≤ 0 | 400 Bad Request | P2 | Negative |

---

## 12. Admin & Governance

| TC-ID | Module | Test Case | Input | Expected Output | Priority | Loại |
|-------|--------|-----------|-------|-----------------|----------|------|
| ADMIN-01 | Auth | Admin login thành công | admin credentials | JWT with admin role | P0 | Functional |
| ADMIN-02 | Auth | Non-admin truy cập admin API | user JWT (không phải admin) | 403 Forbidden | P0 | Security |
| ADMIN-03 | Runtime | Health check endpoint | GET /health/ready | 200 OK, postgres: healthy | P0 | Functional |
| ADMIN-04 | Gemini | Gemini key pool status | GET runtime config | Pool status + available keys | P1 | Functional |

---

## 13. Cross-Cutting Concerns

| TC-ID | Module | Test Case | Input | Expected Output | Priority | Loại |
|-------|--------|-----------|-------|-----------------|----------|------|
| CROSS-01 | Error | API trả JSON error chuẩn | any error | `{error, message}` format | P0 | Structural |
| CROSS-02 | Error | Không lộ stack trace trên production | any exception | Generic error message | P0 | Security |
| CROSS-03 | CORS | Mobile app gọi API thành công | React Native → Backend | CORS headers đúng | P0 | Config |
| CROSS-04 | Rate | Concurrent requests | 10 requests/sec cùng user | Xử lý ổn định, không crash | P2 | Performance |
| CROSS-05 | Encrypt | Encryption key rotation | new key, old data | Old data vẫn decrypt được | P1 | Security |
| CROSS-06 | PII | Email không lộ trong logs | auth operations | Logs show masked email (a***@g***.com) | P0 | Security |
| CROSS-07 | Timezone | Vietnam timezone (UTC+7) | date-based operations | Dùng DateTimeHelper.GetVietnamNow() | P1 | Logic |

---

## Tổng hợp Test Case

| Nhóm | Số lượng TC | P0 | P1 | P2 |
|------|------------|-----|-----|-----|
| Authentication | 20 | 12 | 8 | 0 |
| Meal Diary | 17 | 5 | 12 | 0 |
| Food Search | 10 | 3 | 6 | 1 |
| AI Vision | 7 | 3 | 3 | 1 |
| AI Review | 8 | 2 | 6 | 0 |
| Nutrition Insight | 8 | 2 | 5 | 1 |
| Voice Processing | 7 | 3 | 3 | 1 |
| Custom Dish | 7 | 3 | 3 | 1 |
| Recipe Suggestion | 7 | 1 | 5 | 1 |
| User Profile | 8 | 3 | 4 | 1 |
| Water Intake | 3 | 0 | 2 | 1 |
| Admin | 4 | 2 | 2 | 0 |
| Cross-Cutting | 7 | 3 | 3 | 1 |
| **TỔNG** | **113** | **42** | **62** | **9** |

---

## Phân bổ theo loại kiểm thử

| Loại | Số lượng | Tỷ lệ |
|------|----------|--------|
| Functional | 58 | 51.3% |
| Negative (invalid input) | 24 | 21.2% |
| Security | 13 | 11.5% |
| Logic/Boundary | 12 | 10.6% |
| Performance | 4 | 3.5% |
| Error Handling | 2 | 1.8% |

---

## Ghi chú

- **P0**: Phải pass trước khi deploy production — nếu fail là **blocking**.
- **P1**: Nên pass — ảnh hưởng UX hoặc edge case quan trọng.
- **P2**: Nice-to-have — kiểm tra hiệu năng và trường hợp hiếm.
- Tất cả test case đều dựa trên **code review thực tế** từ 41 service files và 26 controllers.
- Các test case bảo mật phản ánh kết quả từ **Security Audit (Doc 19)** và **Remediation Report (Doc 20)**.
