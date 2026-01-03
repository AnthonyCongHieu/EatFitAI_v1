# 📊 ĐÁNH GIÁ TỔNG THỂ & KẾ HOẠCH CẢI TIẾN EATFITAI

> **Ngày tạo:** 03/01/2026  
> **Dựa trên:** Góp ý từ Hội đồng bảo vệ đề tài  
> **Mục đích:** Tài liệu đánh giá hiện trạng và lộ trình phát triển

---

## 📋 TÓM TẮT GÓP Ý TỪ HỘI ĐỒNG

| # | Yêu cầu | Mô tả chi tiết |
|---|---------|----------------|
| 1 | Thời gian mục tiêu macro | Đề xuất thời gian cho goal (7, 14, 30 ngày) |
| 2 | Gợi ý calo cho user chọn | Nhiều mức calo thay vì 1 con số cố định |
| 3 | Update trình bày | Cải thiện slide/báo cáo trước hội đồng |
| 4 | Thu thập dữ liệu 7 ngày | Cần đủ data trước khi đánh giá |
| 5 | Món ăn khác nhau mỗi ngày | Rotation gợi ý để tránh nhàm chán |
| 6 | Đặt mục tiêu ngay từ đầu | Slide đầu nêu rõ mục tiêu đề tài |
| 7 | Thêm duration cho macro | Giống điểm 1 |
| 8 | Chụp nguyên liệu → calo | AI detect nguyên liệu thô |
| 9 | Tra cứu calo nguyên liệu | Hiển thị calo cho nguyên liệu |
| 10 | Lịch sử + điều chỉnh lộ trình | Sau 7-10 ngày, tự động cập nhật target |

---

## 🔍 PHÂN TÍCH CHI TIẾT TỪNG YÊU CẦU

### 1️⃣ & 7️⃣ Thời Gian Mục Tiêu Macro (Duration)

**Mô tả:** Cho phép user đặt khung thời gian cụ thể cho mục tiêu (7/14/30 ngày)

#### ✅ Ưu điểm
- **Tâm lý học:** Có deadline rõ ràng tăng motivation
- **SMART Goals:** Phù hợp nguyên tắc Time-bound
- **Engagement:** Tạo milestone celebration khi đạt mục tiêu giai đoạn

#### ❌ Nhược điểm
- **Áp lực:** User có thể stress nếu không đạt đúng hạn
- **Logic phức tạp:** Cần tính toán lại TDEE/macro khi hết giai đoạn
- **Edge cases:** User bỏ cuộc giữa chừng → dữ liệu không hoàn chỉnh

#### 📊 Trạng thái hiện tại
- **Có:** `NutritionTarget` table với `EffectiveFrom`/`EffectiveTo`
- **Thiếu:** UI cho user chọn duration trên mobile

#### 💡 Đề xuất cải tiến
```typescript
// GoalSettingsScreen.tsx - Thêm duration picker
const durations = [
  { label: '7 ngày', value: 7 },
  { label: '14 ngày', value: 14 },
  { label: '30 ngày', value: 30 },
  { label: 'Linh hoạt', value: null }
];
```

---

### 2️⃣ Gợi Ý Calo Hàng Ngày Cho User Chọn

**Mô tả:** Thay vì áp đặt 1 con số calo, đưa ra nhiều lựa chọn

#### ✅ Ưu điểm
- **Cá nhân hóa:** User cảm thấy được kiểm soát
- **Linh hoạt:** Phù hợp lifestyle thay đổi
- **Giáo dục:** User hiểu mối quan hệ calo ↔ tốc độ giảm/tăng cân

#### ❌ Nhược điểm
- **Decision fatigue:** Nhiều lựa chọn gây bối rối
- **Sai lựa chọn:** User có thể chọn mức không lành mạnh
- **UX phức tạp:** Cần thêm UI elements

#### 📊 Trạng thái hiện tại
- **Có:** AI tính TDEE trong `nutrition_llm.py`
- **Thiếu:** Chỉ đưa 1 con số, không có multiple options

#### 💡 Đề xuất cải tiến
```python
# nutrition_llm.py - Return multiple options
def get_calorie_options(tdee, goal):
    if goal == "lose_weight":
        return {
            "aggressive": tdee - 500,  # Giảm nhanh (~0.5kg/tuần)
            "moderate": tdee - 300,    # Giảm vừa (~0.3kg/tuần)
            "conservative": tdee - 200 # Giảm chậm (~0.2kg/tuần)
        }
```

---

### 3️⃣ & 6️⃣ Update Cách Trình Bày Trước Hội Đồng

**Mô tả:** Cải thiện cấu trúc slide/báo cáo

#### 💡 Cấu trúc đề xuất

```
Slide 1: Tiêu đề + Thành viên
Slide 2: Đặt vấn đề (Problem Statement)
Slide 3: Mục tiêu đề tài (cụ thể, đo lường được)
  - Mục tiêu tổng quát
  - Các mục tiêu cụ thể (3-4 items)
Slide 4-5: Giải pháp & Kiến trúc hệ thống
Slide 6-9: Demo các tính năng chính
  - AI Vision
  - Voice Input
  - Nutrition Tracking
  - Recipe Suggestions
Slide 10-11: Kết quả & Đánh giá
Slide 12: Hướng phát triển
```

---

### 4️⃣ Thu Thập Dữ Liệu 7 Ngày Để Đánh Giá

**Mô tả:** Hệ thống cần ít nhất 7 ngày data trước khi đưa ra đánh giá

#### ✅ Ưu điểm
- **Độ chính xác:** Tránh kết luận vội từ 1-2 ngày data
- **Pattern recognition:** 7 ngày đủ để thấy xu hướng
- **Loại bỏ noise:** Cân nặng dao động ±1-2kg trong ngày

#### ❌ Nhược điểm
- **Engagement drop:** User mới phải chờ lâu mới có feedback
- **Thiếu linh hoạt:** Một số user cần feedback sớm hơn
- **Data gaps:** Nếu user quên log → delay thêm

#### 📊 Trạng thái hiện tại
- **Có:** `NutritionInsightService.cs` analyze 7 ngày gần nhất
- **Có:** `GetPersonalizedInsightsAsync`, `CalculateAdaptiveAdjustments`

#### 💡 Đề xuất cải tiến
```
Hybrid approach:
- Ngày 1-3: Preliminary insights ("Dựa trên 3 ngày đầu...")
- Ngày 7+: Full analysis với recommendations cụ thể
```

---

### 5️⃣ Gợi Ý Món Ăn Khác Nhau Mỗi Ngày

**Mô tả:** Tránh suggest cùng một món ăn lặp đi lặp lại

#### ✅ Ưu điểm
- **UX tốt:** Tránh nhàm chán
- **Dinh dưỡng:** Đa dạng vi chất
- **Discovery:** User khám phá món mới

#### ❌ Nhược điểm
- **Query phức tạp:** Cần check history
- **Preference conflict:** User có thể thích món A hơn món B
- **Ingredient waste:** Món khác = nguyên liệu khác = khó meal prep

#### 📊 Trạng thái hiện tại
- **Có:** `RecipeSuggestionService.cs` suggest recipes
- **Thiếu:** Rotation logic - có thể suggest cùng món nhiều ngày

#### 💡 Đề xuất cải tiến
```sql
-- RecipeSuggestionService - Thêm filter
SELECT * FROM Recipes 
WHERE RecipeId NOT IN (
  SELECT RecipeId FROM UserMealDiary 
  WHERE UserId = @userId 
  AND LoggedAt > DATEADD(day, -3, GETDATE())
)
ORDER BY NEWID() -- Random
LIMIT 5
```

---

### 8️⃣ & 9️⃣ Chụp Nguyên Liệu → Tính Calo

**Mô tả:** AI detect nguyên liệu thô và tính calo

#### ✅ Ưu điểm
- **Convenience:** Không cần tìm thủ công
- **Đổi mới:** Ít app khác có feature này
- **Pre-cooking planning:** Tính calo trước khi nấu

#### ❌ Nhược điểm (QUAN TRỌNG)
- **Độ chính xác thấp:** Không ước lượng được trọng lượng từ ảnh
- **Phương pháp chế biến:** 100g khoai tây luộc ≠ 100g khoai tây chiên
- **Multi-ingredient:** Nhiều nguyên liệu trong 1 ảnh khó segment
- **Cần training data:** YOLO cần dataset nguyên liệu riêng

#### 📊 Trạng thái hiện tại
- **Có:** AI Vision detect món ăn **đã nấu**
- **Có:** YOLO `best.pt` trained on Vietnamese food
- **Thiếu:** Mode detect nguyên liệu thô

#### 💡 Đề xuất cải tiến
```
Workflow đề xuất:
1. Chụp ảnh → AI detect loại nguyên liệu (VD: "cà chua")
2. Hiển thị kết quả → User CONFIRM hoặc SỬA
3. User NHẬP TỰ TAY trọng lượng (gram) hoặc chọn slider
4. Hệ thống tính calo = loại + trọng lượng + phương pháp nấu
```

#### ⚠️ Câu hỏi phản biện từ hội đồng
> *"Độ chính xác của việc ước lượng calo từ ảnh nguyên liệu?"*

**Trả lời gợi ý:** "Tính năng detect nguyên liệu thô đang trong roadmap. Hiện tại app hỗ trợ detect món ăn đã nấu để đảm bảo độ chính xác cao hơn. Việc estimate calo từ nguyên liệu thô cần thêm input về trọng lượng và phương pháp chế biến - đây là hybrid approach."

---

### 🔟 Lưu Lịch Sử & Điều Chỉnh Lộ Trình

**Mô tả:** Sau 7-10 ngày, hệ thống tự đánh giá và cập nhật target

#### ✅ Ưu điểm
- **Adaptive:** App "học" từ hành vi user
- **Personalization:** Mỗi người một lộ trình
- **Behavior change:** Phù hợp nguyên tắc feedback loop

#### ❌ Nhược điểm
- **Algorithm complexity:** Khi nào tăng/giảm calo?
- **False positive:** Điều chỉnh sai nếu user log không đúng
- **Medical liability:** Rủi ro pháp lý nếu ảnh hưởng sức khỏe

#### 📊 Trạng thái hiện tại
- **Có:** `BodyMetric`, `MealDiary`, `WeightHistoryScreen`
- **Có:** `CalculateAdaptiveAdjustments` trong `NutritionInsightService.cs`
- **Thiếu:** UI hiển thị đề xuất điều chỉnh rõ ràng

#### 💡 Đề xuất cải tiến
```csharp
// NutritionInsightService.cs - Logic điều chỉnh
if (actualCaloriesAvg > targetCalories * 1.1 && !weightDecreasing) {
    suggestion = "Giảm target calo 100-200 để bù đắp";
} else if (actualCaloriesAvg < targetCalories * 0.85) {
    warning = "Calo quá thấp có thể gây mệt mỏi";
} else if (weightDecreased > 1kg/week) {
    warning = "Giảm cân quá nhanh, tăng calo nhẹ";
}
```

---

## 📈 BẢNG ĐỐI CHIẾU: HIỆN TẠI vs YÊU CẦU

| # | Yêu cầu | Trạng thái | % Hoàn thành | Ghi chú |
|---|---------|------------|--------------|---------|
| 1,7 | Thời gian macro | ⚠️ Có một phần | 40% | Có DB, thiếu UI |
| 2 | Gợi ý calo chọn | ⚠️ Có một phần | 30% | Chỉ 1 option |
| 3,6 | Trình bày | ✏️ Cần làm | 0% | Chỉnh slide |
| 4 | Thu thập 7 ngày | ✅ Đã có | 80% | Logic done |
| 5 | Món khác nhau/ngày | ⚠️ Có một phần | 60% | Thiếu rotation |
| 8,9 | Chụp nguyên liệu | ⚠️ Có một phần | 30% | Chỉ detect món |
| 10 | History + adjust | ✅ Đã có | 75% | Cần UI |

**📊 Tổng trung bình: ~53%**

---

## ✅ ƯU ĐIỂM TỔNG THỂ HIỆN TẠI

| # | Ưu điểm | Chi tiết |
|---|---------|----------|
| 1 | **Full-stack hoàn chỉnh** | Backend .NET 9 + Mobile Expo + AI Provider Python |
| 2 | **AI-powered** | YOLO Vision + Ollama LLM + Voice Processing |
| 3 | **Cá nhân hóa** | UserPreference, DietaryRestrictions, mục tiêu riêng |
| 4 | **Clean Architecture** | Controllers → Services → Repositories pattern |
| 5 | **Vietnamese-focused** | Food database VN, UI tiếng Việt, Voice tiếng Việt |
| 6 | **Data-driven** | Analytics với SQL Views cho thống kê |
| 7 | **UX moderne** | Dark mode, Gamification, Chart visualization |

---

## ❌ NHƯỢC ĐIỂM CẦN CẢI THIỆN

| # | Nhược điểm | Mức độ | Giải pháp |
|---|------------|--------|-----------|
| 1 | Thiếu goal duration UI | ⚠️ Medium | Thêm picker 7/14/30 ngày |
| 2 | AI recommend cứng | ⚠️ Medium | 3 options: Nhanh/Vừa/Chậm |
| 3 | Recipe không rotate | ⚠️ Medium | Track `last_suggested_at` |
| 4 | Không detect nguyên liệu | 🔴 High | Train thêm YOLO model |
| 5 | Chưa notify khi off-track | ⚠️ Medium | Push notification |
| 6 | Chưa có onboarding | ⚠️ Low | Thêm intro screens |

---

## 🚀 KẾ HOẠCH HÀNH ĐỘNG

### 🟢 Ưu tiên CAO (Làm trước bảo vệ)

| Task | Thời gian | File cần sửa |
|------|-----------|--------------|
| Thêm UI chọn macro duration | 1-2 giờ | `GoalSettingsScreen.tsx` |
| Thêm 3 calo options | 1-2 giờ | `nutrition_llm.py`, `NutritionSettingsScreen.tsx` |
| Recipe rotation | 2-3 giờ | `RecipeSuggestionService.cs` |

### 🟡 Ưu tiên TRUNG BÌNH (Sau bảo vệ)

| Task | Thời gian | Ghi chú |
|------|-----------|---------|
| Adaptive target UI | 4-6 giờ | Hiển thị đề xuất điều chỉnh |
| Preliminary insights (3 ngày) | 3-4 giờ | Feedback sớm cho user mới |
| Push notification | 4-6 giờ | Nhắc nhở khi off-track |

### 🔴 Ưu tiên THẤP (Roadmap tương lai)

| Task | Thời gian | Ghi chú |
|------|-----------|---------|
| Detect nguyên liệu thô | 2-4 tuần | Cần training data mới |
| Weight prediction | 1-2 tuần | ML model |
| Meal prep suggestions | 1-2 tuần | Dựa trên tuần |

---

## 🛡️ CÂU HỎI PHẢN BIỆN & TRẢ LỜI GỢI Ý

### Q1: "Làm sao đảm bảo AI detect calo chính xác?"
> **A:** "AI Vision nhận diện **loại món ăn**, không ước lượng portion size. User xác nhận và điều chỉnh khẩu phần thủ công. Calo được tính từ database có nguồn từ USDA và Viện Dinh Dưỡng Việt Nam."

### Q2: "Nếu user không đạt mục tiêu sau 7-10 ngày?"
> **A:** "Hệ thống có `CalculateAdaptiveAdjustments` phân tích xu hướng và đề xuất điều chỉnh: tăng/giảm calo target, thay đổi tỷ lệ macro. User nhận được insight cá nhân hóa."

### Q3: "So với MyFitnessPal, điểm khác biệt?"
> **A:** "EatFitAI focus hoàn toàn vào **thị trường Việt Nam**: database 800+ món Việt, Voice AI tiếng Việt, recipe phù hợp khẩu vị Việt, UI/UX tiếng Việt hoàn chỉnh."

### Q4: "Nguồn dữ liệu calo từ đâu?"
> **A:** "Kết hợp từ USDA FoodData Central (chuẩn quốc tế) và Bảng Thành phần Dinh dưỡng Việt Nam (Viện Dinh Dưỡng). Có cơ chế cho user tự thêm món ăn riêng."

### Q5: "Độ chính xác của Voice AI?"
> **A:** "Sử dụng Whisper STT + Ollama LLM. Đã test với 50+ câu lệnh tiếng Việt, accuracy ~85-90%. Các lỗi phổ biến đã được fix như parse số tiếng Việt (sáu trăm = 600)."

---

## 📝 GHI CHÚ CUỐI

- **Tech stack:** .NET 9 + React Native Expo SDK 54 + Python Flask + YOLO v11 + Ollama
- **Database:** SQL Server với Entity Framework Core
- **Deployment:** Có thể deploy lên Azure/AWS hoặc self-hosted

---

*Tài liệu được tạo bởi AI Assistant dựa trên phân tích codebase thực tế.*
