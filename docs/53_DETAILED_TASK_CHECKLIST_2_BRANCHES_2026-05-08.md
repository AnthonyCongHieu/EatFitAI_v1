# EatFitAI — Task Checklist Chi Tiết (2 Nhánh)

> Nguồn: `52_EVIDENCE_BASED_NUTRITION_APP_IMPROVEMENT_ROADMAP_2026-05-07.md`
> Nguyên tắc: **Không bịa task** — mọi item đều trace về section cụ thể trong tài liệu gốc.

---

# 🎨 NHÁNH A: UI/UX + GIAO DIỆN + LUỒNG TRẢI NGHIỆM

## A1. Activation & Onboarding (Section 6.1, 12.5 P0-A, #7)

- [ ] **A1.1** Redesign onboarding flow: cho user log bữa đầu TRƯỚC khi hoàn tất profile (Ref: §6.1 — first-log < 2 phút)
- [ ] **A1.2** Rút gọn onboarding: chỉ hỏi tối thiểu (tên, mục tiêu chính), defer profile chi tiết sau first value
- [ ] **A1.3** Hỏi notification permission SAU khi user thấy value (sau first log), không hỏi lúc onboarding
- [ ] **A1.4** Đo telemetry: `onboarding_start`, `onboarding_complete`, `time_to_first_log` (Ref: §10.3)
- [ ] **A1.5** UI animation onboarding: không tạo cảm giác "AI đang thông minh" quá mức (Ref: §20.1 — AI target 6.5)

## A2. Home Screen — 3 Câu Hỏi (Section 3.3)

- [ ] **A2.1** UI "One Job Today": hiển thị bữa thiếu / action pending / xác nhận khẩu phần
- [ ] **A2.2** UI "Day Confidence": badge Complete/Partial/Rough trên home
- [ ] **A2.3** UI "Trend": target range (không chỉ exact number) + trend 7-14 ngày
- [ ] **A2.4** Weekly action progress indicator trên home

## A3. Trust Badge & Source UI (Section 4.2, #3)

- [ ] **A3.1** Badge nhỏ trên mỗi food entry: `Đã kiểm chứng` / `Từ nhãn` / `Ước tính AI` / `Thiếu sodium` / `Cần xác nhận`
- [ ] **A3.2** Tap badge → bottom sheet: source, completeness, last reviewed, cách sửa
- [ ] **A3.3** Trust badge hiển thị trong search results (Ref: §16.3)
- [ ] **A3.4** Trust badge hiển thị trong diary entries
- [ ] **A3.5** Trang "Dữ liệu này đến từ đâu" (Ref: §11.8 — MARS trust)

## A4. Day Completeness UI (Section 6.2, #1)

- [ ] **A4.1** UI trạng thái ngày: `no-log` / `partial` / `rough` / `complete` / `skipped` / `low-confidence`
- [ ] **A4.2** Nút "Log đủ hôm nay" / "Còn thiếu bữa" / "Bỏ qua ngày này" trong diary (Ref: §16.4)
- [ ] **A4.3** Completeness badge trên calendar/diary view
- [ ] **A4.4** Rough log UI: nhập tổng quan "cơm văn phòng, nhiều thịt, ít rau" → mark low-confidence (Ref: §16.4)

## A5. AI Scan UX (Section 12.2, #2, §16.1)

- [ ] **A5.1** Kết quả scan hiển thị dạng compact meal basket, không hiển thị full detail từng món ngay màn đầu
- [ ] **A5.2** Mỗi dòng chỉ có: checkbox, tên món, khẩu phần ước tính, kcal, 1 badge nhỏ (`Đã kiểm chứng` / `Ước tính` / `Cần kiểm tra`)
- [ ] **A5.3** Mặc định chỉ show tối đa 3 món chính; món dư/không chắc gom vào nhóm "Cần kiểm tra"
- [ ] **A5.4** Trust/source/missing nutrients chỉ mở trong bottom sheet khi user tap badge, không dàn ra list scan
- [ ] **A5.5** Block auto-save khi mobile review guard yêu cầu user xác nhận
- [ ] **A5.6** Sau scan: 3 action rõ — lưu món đã chọn / sửa khẩu phần / chụp lại hoặc tìm thủ công
- [ ] **A5.7** Portion prompt theo preset Việt: tô nhỏ/vừa/lớn, chén, phần (Ref: §2.3)
- [ ] **A5.8** Ảnh không có đồ ăn → message "Không thấy món ăn" rõ ràng (Ref: §16.1)
- [ ] **A5.9** Processing > 3 giây → hint "đang nhận diện, bạn có thể nhập voice/manual"

## A6. Voice Logging UX (Section §16.2)

- [ ] **A6.1** Parse → draft → review trước save (không execute mù)
- [ ] **A6.2** Highlight số lượng/đơn vị không chắc trong draft
- [ ] **A6.3** Khi thiếu portion: hỏi nhanh nhỏ/vừa/lớn hoặc dùng recent portion
- [ ] **A6.4** Món từng ăn: "Giống lần trước không?"
- [ ] **A6.5** Offline/API fail: giữ text draft, cho user save manual

## A7. Barcode UX (Section §16.5, #3)

- [ ] **A7.1** Thiếu macro → UI badge "Thiếu protein/carb/fat" thay vì hiện 0
- [ ] **A7.2** Serving size mismatch → warning UI rõ
- [ ] **A7.3** Hỏi user dùng bao nhiêu serving (không mặc định 100g)
- [ ] **A7.4** Provider stale/unverified → hiển thị rõ trạng thái
- [ ] **A7.5** Product từng scan → badge "đã dùng gần đây"

## A8. Food Search UX (Section §16.3)

- [ ] **A8.1** 1-tap add bằng portion lần trước
- [ ] **A8.2** Search không dấu/có dấu/vùng miền
- [ ] **A8.3** Empty state: "Không thấy? Ghi voice hoặc tạo món riêng"
- [ ] **A8.4** Badge source/trust ngay trong search result

## A9. Recovery Flow UX (Section #5, §12.2)

- [ ] **A9.1** Khi mở app sau lapse → recovery banner thay vì home bình thường
- [ ] **A9.2** Tier 1 (1 ngày): "Hôm qua bỏ lỡ, log nhanh hôm nay?"
- [ ] **A9.3** Tier 2 (2-3 ngày): "Chào mừng quay lại! Bắt đầu lại nhẹ nhàng"
- [ ] **A9.4** Tier 3 (4-7 ngày): "Không sao, log 1 bữa hôm nay thôi"
- [ ] **A9.5** Tier 4 (7+ ngày): one-shot gentle re-engagement
- [ ] **A9.6** Copy không shame/guilt trong mọi tier (Ref: §9.1, §12.1)
- [ ] **A9.7** 2-minute reset flow: rough catch-up + "bắt đầu lại hôm nay"
- [ ] **A9.8** Deep link từ notification vào recovery flow

## A10. Weekly Review UX (Section #8, §16.6)

- [ ] **A10.1** Cấu trúc card: Data quality → One win → One friction → One action → Feedback
- [ ] **A10.2** UI "One Action This Week" với when/where/how
- [ ] **A10.3** Accept / Done / Snooze / Replace buttons
- [ ] **A10.4** "Gợi ý này hữu ích / không hữu ích" feedback
- [ ] **A10.5** Nếu log < 4 ngày → chỉ hiện "tuần này cố log X ngày", không kết luận macro

## A11. Notification UX (Section §16.7)

- [ ] **A11.1** Notification settings → "Bạn muốn app nhắc kiểu nào?" nhẹ/tiêu chuẩn/nghiêm túc
- [ ] **A11.2** "Bạn thường ăn lúc nào?" → set meal windows
- [ ] **A11.3** "Khi bỏ log 2 ngày, app nên làm gì?" → im lặng/nhắc nhẹ/đốc thúc
- [ ] **A11.4** Copy không phán xét trong mọi notification (Ref: §9.1)
- [ ] **A11.5** Deep link từ notification → đúng meal flow / weekly review card
- [ ] **A11.6** Android notification channels tách category

## A12. Diary UX Improvements (Section §16.4)

- [ ] **A12.1** Smart copy: copy hôm qua + hỏi "có giống khẩu phần không?"
- [ ] **A12.2** Bulk edit portion ngay trong diary
- [ ] **A12.3** Draft state nếu đang sửa nhưng app background
- [ ] **A12.4** Meal completeness per meal: breakfast/lunch/dinner logged/skipped/unknown

## A13. Adaptive Target UX (Section #6)

- [ ] **A13.1** Khi target thay đổi: explain reason UI rõ ràng
- [ ] **A13.2** Undo / Pause target adjustment buttons
- [ ] **A13.3** "Chưa đủ dữ liệu để chỉnh mục tiêu" message khi data kém
- [ ] **A13.4** Target hiển thị dạng range, không chỉ exact number

## A14. Safety & Gentle Mode UX (Section 9.1, #10)

- [ ] **A14.1** Gentle tracking mode: focus protein/rau/nước, không nhấn calorie deficit
- [ ] **A14.2** Tùy chọn ẩn calorie lớn, chỉ xem trend/quality
- [ ] **A14.3** Warning UI nếu mục tiêu giảm cân quá nhanh
- [ ] **A14.4** Copy "không dùng app thay tư vấn y tế" rõ ràng

---

# ⚙️ NHÁNH B: CẢI THIỆN LOGIC + THÔNG MINH + CLOUD + CODING

## B0. Foundation & Rollout Readiness

- [ ] **B0.1** Chốt nguồn sự thật cho schema hiện tại: `FoodItem`, `MealDiary`, `NutritionTarget`, `User`, `UserRecentFood`, `FoodServing`
- [ ] **B0.2** Lập migration/backfill plan trước khi thêm field mới: default value, nullable/non-nullable, dữ liệu cũ sẽ hiển thị thế nào
- [ ] **B0.3** Chốt quy tắc ngày theo user-local date cho day completeness, streak, lapse, weekly review, notification
- [ ] **B0.4** Chốt API contract giữa backend và mobile: DTO backend, TypeScript types, normalize mapper trong service mobile
- [ ] **B0.5** Lập test matrix theo từng flow: backend unit, backend integration, mobile Jest, smoke trên device/emulator
- [ ] **B0.6** Chốt rollout/rollback plan cho logic ảnh hưởng dữ liệu thật: feature flag, staged release, cách tắt nhanh nếu sai
- [ ] **B0.7** Kiểm tra encoding/mojibake trước và sau khi sửa các text tiếng Việt user-facing
- [ ] **B0.8** Cập nhật docs/architecture nếu contract mới thay đổi API, DB, hoặc luồng mobile-backend

## B1. Day Completeness Contract — Backend (Section #1, §13.2)

- [ ] **B1.1** Thêm enum `DayCompletenessStatus { NoLog, Partial, Complete, Rough, Skipped, LowConfidence }`
- [ ] **B1.2** Logic: ≥3 bữa chính (sáng/trưa/tối) = `Complete`, 1-2 = `Partial`
- [ ] **B1.3** API endpoint trả về day state cho từng ngày
- [ ] **B1.4** `CalculateAdaptiveAdjustments` chỉ dùng ngày `Complete`
- [ ] **B1.5** Streak logic dùng Day Completeness thay vì `calories > 0` (Ref: §12.4)
- [ ] **B1.6** Unit tests: verify ngày partial không được tính là complete

## B3. Food Trust Contract — Backend (Section #3, §13.2)

- [ ] **B3.1** Audit field trust hiện có: `FoodItem.IsVerified`, `CredibilityScore`, `FoodItemDto.Source`, `ReliabilityScore`, `MealDiary.SourceMethod`
- [ ] **B3.2** Chốt contract trust theo 2 lớp: `trustSummary` ngắn cho list UI, `trustDetails` đầy đủ cho bottom sheet/detail screen
- [ ] **B3.3** Chỉ thêm DB field mới nếu không derive được từ field hiện có: ví dụ `VerificationStatus`, `NutrientCompletenessScore`, `MissingNutrients`, `LastReviewedAt`
- [ ] **B3.4** Tính `CompletenessScore` = % calories/protein/carb/fat/sodium/fiber có data thật; missing không được xem là 0
- [ ] **B3.5** Rule: data thiếu hoặc trust thấp chỉ hiển thị warning, không dùng cho adaptive/weekly conclusion mạnh
- [ ] **B3.6** API expose trust summary trong food search/barcode/diary responses, expose trust details chỉ khi màn detail cần
- [ ] **B3.7** Migration/backfill + unit/integration tests cho trust fields và missing nutrients

## B4. Barcode Missing-vs-Zero Contract (Section §12.4, §13.2)

- [ ] **B4.1** Sửa `ParseProviderFoodItem()`: bỏ `?? 0m`, dùng nullable cho missing nutrients
- [ ] **B4.2** Provider food thiếu calories/macro → trạng thái `needs_review`
- [ ] **B4.3** Thêm `nutrientCompletenessScore` cho barcode results
- [ ] **B4.4** Unit tests: verify missing nutrient KHÔNG bao giờ thành 0
- [ ] **B4.5** Integration test: barcode lookup với provider thiếu data → returns missing flags

## B5. Notification Decision Engine — JITAI (Section #4, §13.2)

- [ ] **B5.1** Backend endpoint `/api/notifications/should-nudge`: check user đã log bữa nào hôm nay
- [ ] **B5.2** Suppress rule: IF 3 nudges bị ignore liên tiếp → suppress 24h
- [ ] **B5.3** Enforce quiet hours trong `scheduleDailyNotification()` (field có sẵn, logic thiếu)
- [ ] **B5.4** Cooldown logic: không gửi 2 notification trong < X phút
- [ ] **B5.5** Outcome tracking: `notification_sent`, `notification_suppressed`, `notification_open`, `notification_action_completed`
- [ ] **B5.6** Client-side: check local state / call API trước khi fire notification
- [ ] **B5.7** Personalized meal windows: schedule theo giờ user hay ăn

## B6. Lapse Detection + Recovery — Backend (Section #5, §13.2)

- [ ] **B6.1** `GetLapseTier(userId)`: return tier 1/2/3/4 dựa trên `(today - LastLogDate).Days`
- [ ] **B6.2** Tier 1: 1 ngày / Tier 2: 2-3 ngày / Tier 3: 4-7 ngày / Tier 4: 7+ ngày
- [ ] **B6.3** API trả tier + suggested message + suggested action
- [ ] **B6.4** Notification message khác nhau theo tier (gentle → encouraging → one-shot)
- [ ] **B6.5** Deep link cho recovery flow
- [ ] **B6.6** Telemetry: `recovery_after_lapse`, `first_recovery_log_time`

## B7. Adaptive Target Safety Gate (Section #6, §13.2)

- [ ] **B7.1** Tăng minimum data gate: `daysWithData >= 14` (hiện tại 10)
- [ ] **B7.2** Calorie floor: `Math.Max(newCal, gender == Female ? 1200 : 1500)`
- [ ] **B7.3** Calorie ceiling: cap max hợp lý
- [ ] **B7.4** Chỉ dùng "complete days" cho adaptive calculation
- [ ] **B7.5** Cap thay đổi: không quá 100-150 kcal/tuần
- [ ] **B7.6** Protein floor: không giảm protein chỉ vì user ăn thiếu
- [ ] **B7.7** Flag `user.HasEDRisk` → disable adaptive hoàn toàn
- [ ] **B7.8** Lưu `formulaVersion`, `adjustmentReason`, `inputDataQuality`
- [ ] **B7.9** Unit tests: verify calorie floor/ceiling, verify partial days excluded

## B8. Weekly Review Refactor — Backend (Section #8, §13.3)

- [ ] **B8.1** `recommendations.Take(1)` cho weekly context — single action focus
- [ ] **B8.2** Review history: persist `LastReviewDate` (hiện tại TODO)
- [ ] **B8.3** `completeDays >= 4` gate trước khi đưa nutrition conclusion
- [ ] **B8.4** Tách `daysWithAnyMeal` vs `completeDays` trong dataQuality
- [ ] **B8.5** Action contract: `accept/done/snooze/useful` endpoints
- [ ] **B8.6** Telemetry: `weekly_action_accept_rate`, `weekly_action_done_rate`

## B9. Streak Logic Fix (Section §12.4, §20.2)

- [ ] **B9.1** Sửa `StreakService`: dùng Day Completeness thay vì `lastLog == today`
- [ ] **B9.2** Separate check-in streak vs complete-day streak
- [ ] **B9.3** Streak repair/rescue: không reset về 0 ngay khi miss 1 ngày
- [ ] **B9.4** Không dùng streak cho adaptive logic
- [ ] **B9.5** Unit tests: verify streak không tính ngày chỉ log 1 snack nhỏ

## B10. Vietnamese Portion & Search (Section #9, §16.3)

- [ ] **B10.1** Mở rộng `NormalizeSearchKey()`: thêm nhiều synonym tiếng Việt (hiện chỉ 2)
- [ ] **B10.2** Portion preset Việt: `1 chén`, `1 tô`, `1 muỗng canh`, `1 ly`, `1 phần` với grams
- [ ] **B10.3** Search ranking: verified > source > local > recent > frequent
- [ ] **B10.4** Typo tolerance cho tiếng Việt không dấu
- [ ] **B10.5** Seeding data: serving presets cho top 50 món Việt phổ biến

## B11. Telemetry & Metrics (Section 8, §10.3)

- [ ] **B11.1** Event schema: đảm bảo tất cả events bắt buộc từ §10.3 đã có
- [ ] **B11.2** Funnel tracking: `onboarding → first_log → first_complete_day → day_7_retention`
- [ ] **B11.3** `time_to_log_meal` p50/p75/p95 per lane (search/AI/voice/barcode)
- [ ] **B11.4** `notification_to_log_rate`: đo lift hành vi sau notification
- [ ] **B11.5** `ai_scan_correction_rate`, `ai_scan_false_positive_rate`
- [ ] **B11.6** `complete_day_rate`, `rough_log_rate`, `partial_day_rate`
- [ ] **B11.7** Dashboard/export cho product metrics

## B12. Infrastructure & Performance (Section §16.8)

- [ ] **B12.1** Local-first diary write queue: log được khi mạng yếu, sync sau
- [ ] **B12.2** Cached recent/frequent foods: search không phụ thuộc backend cho món quen
- [ ] **B12.3** Draft recovery: app background/crash không mất meal đang nhập
- [ ] **B12.4** AI async job state: scan chậm không khóa màn hình
- [ ] **B12.5** Cost guard cho AI: không gọi Gemini/vision khi deterministic/local đủ
- [ ] **B12.6** Latency SLO: monitor p75/p95 cho search/add/voice/AI/barcode flows

## B13. AI Scan Logic Improvements (Section §12.3, §16.1)

- [ ] **B13.1** Nâng recovery threshold (hiện 0.05) hoặc bắt buộc review-only cho recovery
- [ ] **B13.2** Correction memory: lưu user correction → ưu tiên món/portion lần sau
- [ ] **B13.3** Multi-food detection: tạo compact meal basket, mặc định chọn tối đa 3 món chính và gom món không chắc vào "Cần kiểm tra"
- [ ] **B13.4** Negative benchmark: test với ảnh bàn trống, tay, bao bì, nước uống

## B14. Voice Logic Improvements (Section §16.2)

- [ ] **B14.1** Parse nhiều món trong 1 câu: "sáng phở bò, trưa cơm gà"
- [ ] **B14.2** Clarification khi thiếu portion (không execute mù)
- [ ] **B14.3** Voice correction: "đổi cơm thành 1 chén rưỡi"
- [ ] **B14.4** Offline: giữ text draft cho manual save

## B15. ED Screening & Safety Logic (Section #10)

- [ ] **B15.1** Thêm flag `User.HasEDRisk` trong user profile
- [ ] **B15.2** Nếu `HasEDRisk = true` → disable adaptive, gentle mode auto-on
- [ ] **B15.3** Warning logic nếu target giảm cân quá nhanh (> 1kg/tuần)
- [ ] **B15.4** Calorie floor enforcement trong mọi target calculation

## B16. Contract Tests — Regression Gate (Section §10.8)

- [ ] **B16.1** Test: missing nutrient không bao giờ thành true zero
- [ ] **B16.2** Test: adaptive target không chạy trên partial-heavy data
- [ ] **B16.3** Test: notification suppress nếu user đã log hoặc quiet hours
- [ ] **B16.4** Test: streak không dùng calories > 0 làm nguồn duy nhất
- [ ] **B16.5** Test: food trust fields expose đúng trong search/diary responses
- [ ] **B16.6** Test: calorie floor/ceiling enforced

---

# 📊 SPRINT PLAN ĐỀ XUẤT (Ref: §13.5)

| Sprint | Nhánh A (UI/UX) | Nhánh B (Logic/Code) |
|--------|-----------------|----------------------|
| **Sprint 1** | A9 (Recovery Flow), A14 (Safety UX) | B0 (Foundation), B6 (Lapse Recovery), B7.1-B7.2 (Quick wins: calorie floor + data gate 14) |
| **Sprint 2** | A4 (Day Completeness UI), A7 (Barcode UX) | B1 (Day Completeness), B4 (Missing-vs-Zero), B15 (ED Safety), B9 (Streak fix) |
| **Sprint 3** | A3 (Trust Badge), A10 (Weekly Review) | B3 (Food Trust), B5 (JITAI Notification), B8 (Weekly Review refactor) |
| **Sprint 4** | A1 (Onboarding), A2 (Home), A11 (Notification settings) | B10 (VN Portion), B11 (Telemetry), B12 (Infrastructure) |
| **Q3** | A6 (Voice UX), A8 (Search UX), A12 (Diary), A13 (Adaptive UX) | B13 (AI Scan logic), B14 (Voice logic), B16 (Contract tests) |

---

# ⚡ QUICK WINS — Làm trong < 1 ngày (Ref: §13.6)

- [ ] `Math.Max(newCal, 1200)` vào `CalculateAdaptiveAdjustments()` → B7.2
- [ ] `daysWithData >= 10` → `>= 14` → B7.1
- [ ] Enforce quiet hours trong `scheduleDailyNotification()` → B5.3
- [ ] `recommendations.Take(1)` cho weekly context → B8.1

---

> **3 rủi ro lớn nhất cần fix trước** (Ref: §13.7):
> 1. 🔴 Adaptive Target không có safety floor → suggest calorie < 1000 kcal
> 2. 🔴 Recovery Flow = 0 → user bỏ app = mất vĩnh viễn
> 3. 🔴 Barcode missing nutrient bị hiểu thành 0 → user tin dữ liệu dinh dưỡng sai
