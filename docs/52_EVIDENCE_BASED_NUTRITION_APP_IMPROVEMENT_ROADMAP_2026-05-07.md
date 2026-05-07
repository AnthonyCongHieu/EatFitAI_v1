# EatFitAI Evidence-Based Nutrition App Improvement Roadmap

Cập nhật: `2026-05-07`

Phạm vi: tài liệu này hệ thống hóa lại roadmap cải thiện app dinh dưỡng EatFitAI dựa trên research khoa học, audit code hiện có, benchmark app chuyên nghiệp, UX/habit research, và đánh giá chất lượng từng chức năng. Tài liệu này **không thay đổi code**.

Tài liệu này bổ sung cho `COMPREHENSIVE_AUDIT_AND_ROADMAP_2026.md`. Các phần chi tiết từ nhiều vòng research trước được giữ lại trong Appendix để không mất evidence và reasoning gốc.

Lưu ý an toàn: EatFitAI là app hỗ trợ tự theo dõi dinh dưỡng, không phải công cụ chẩn đoán hoặc điều trị y tế. Mọi gợi ý liên quan giảm cân, tăng cân, bệnh nền, rối loạn ăn uống, thai kỳ, trẻ em, vận động viên chuyên nghiệp hoặc điều kiện y khoa cần guardrail và khuyến nghị tham khảo chuyên gia.

---

## Cách đọc tài liệu

- **Phần 0-12** là bản canonical: dùng để ra quyết định sản phẩm, roadmap, validation, và chuyển sang PRD/sprint.
- **Phần 13** là Code Alignment Audit: đối chiếu 14 đề xuất với code thực tế, xác định gap cụ thể và sprint plan.
- **Appendix A-C** giữ lại toàn bộ phần phân tích chi tiết đã bổ sung qua nhiều vòng: feature audit, evidence, research trace, scorecard, và quyết định roadmap cũ.
- **Sources** giữ toàn bộ nguồn đã research (99 nguồn gốc + 14 nguồn bổ sung từ deep research).

Thứ tự đọc khuyến nghị:

1. Executive Summary.
2. Product Strategy.
3. User Experience và Trust Architecture.
4. Feature Quality Audit.
5. P0 Contracts và Roadmap.
6. Confidence Upgrade Protocol, High-Assurance Validation Stack, và Capability Upgrade Blueprint.
7. **Code Alignment Audit (Section 13)** — đối chiếu roadmap vs code thực tế, sprint plan.
8. Appendix khi cần kiểm chứng chi tiết.

---

## 0. Executive Summary

EatFitAI đang đi đúng hướng: app có diary, search, AI scan, barcode, voice, common meals, weekly review, adaptive target, notification, telemetry và admin/data curation. Vấn đề chính không phải thiếu feature, mà là nhiều feature đã có **bề mặt chức năng** nhưng chưa có **contract chất lượng** đủ chuẩn chuyên nghiệp.

Kết luận sản phẩm sau nhiều vòng research:

> EatFitAI nên thắng bằng logging nhanh hơn, dữ liệu đáng tin hơn, feedback ít nhưng đúng lúc hơn, và khả năng kéo user quay lại sau khi họ bỏ lỡ vài ngày. Không nên cố thắng bằng cách thêm nhiều AI hơn.

Mô hình hiệu quả của app phải đi theo chuỗi:

`adherence` -> `data quality` -> `feedback quality` -> `behavior change`

Nếu user không log đều, dữ liệu yếu. Nếu dữ liệu yếu, review/adaptive target sẽ dễ sai. Nếu feedback sai hoặc quá chung chung, user không thay đổi hành vi. Vì vậy P0 cần tập trung vào trust, completeness, reminder decision, và one-action coaching.

**Overall quality của roadmap hiện tại:** 8.8/10 như product/UX/evidence roadmap. Tài liệu đã đủ mạnh để chuyển thành PRD P0 và validation protocol, nhưng chưa được xem là bằng chứng 90%+ về hiệu quả thực tế của app cho đến khi chạy telemetry, benchmark, usability test và expert review.

**Code Alignment Audit (Section 13):** Sau khi đối chiếu 14 đề xuất với 4 file code chính (`NutritionInsightService.cs`, `AiFoodMapService.cs`, `StreakService.cs`, `notificationService.ts`), kết quả cho thấy **86% đề xuất** cần code mới hoặc sửa logic đáng kể. 3 rủi ro kỹ thuật lớn nhất: (1) Adaptive Target không có safety floor, (2) Recovery Flow hoàn toàn vắng mặt, (3) AI Confidence không phân tier. 5 quick wins có thể fix trong <1 ngày dev đã được xác định.

---

## 1. Product Strategy

### 1.1 Mục tiêu chính

Mục tiêu chính của EatFitAI là giúp người dùng Việt Nam:

- Ghi nhận bữa ăn nhanh hơn.
- Hiểu năng lượng, macro và một số chỉ số dinh dưỡng quan trọng.
- Theo dõi mục tiêu mà không bị quá tải.
- Tin được dữ liệu đang xem.
- Được nhắc đúng lúc khi bỏ quên.
- Nhận một hành động nhỏ, thực tế, có thể làm trong tuần.

### 1.2 North Star

**Reliable Vietnamese Nutrition Coach**

EatFitAI nên được định vị là app dinh dưỡng Việt Nam đáng tin: log nhanh bằng AI/voice/barcode, nhưng mọi con số đều có nguồn, độ chắc, và cách sửa.

Câu hỏi kiểm tra sản phẩm:

> User có thể quay lại sau một ngày tệ, log lại trong dưới 60 giây, và nhận một bước kế tiếp có ích mà không thấy bị phán xét không?

### 1.3 Nguyên tắc sản phẩm

- Trust trước automation.
- Rough log tốt hơn bỏ cuộc, nhưng rough log không được dùng để kết luận mạnh.
- AI là assistant có kiểm soát, không phải oracle.
- Notification phải là decision engine, không phải lịch cố định cho mọi người.
- Weekly review phải tạo một hành động nhỏ, không chỉ báo cáo số liệu.
- Adaptive target chỉ chạy khi dữ liệu đủ chắc.
- Không dùng shame/guilt/streak pressure để ép user.

---

## 2. Evidence-Based Principles

### 2.1 Bằng chứng chính

| Chủ đề | Kết luận thực tế cho EatFitAI |
|---|---|
| Self-monitoring | Có bằng chứng hỗ trợ cải thiện hành vi/weight outcome, nhưng phụ thuộc adherence. App phải giảm friction trước khi tăng độ thông minh. |
| Feedback | Feedback có ích khi cụ thể, cá nhân hóa, dựa trên dữ liệu đủ tin, và dẫn tới hành động nhỏ. |
| Photo/AI logging | Giảm công nhập liệu nhưng recognition/portion vẫn sai; phải có confidence, review và correction. |
| Barcode/database | Database quyết định trust; missing nutrient, duplicate, serving mismatch là rủi ro lớn. |
| Reminder | Nhắc hiệu quả nhất khi đúng lúc, đúng bối cảnh, có suppress/cooldown và đo outcome. |
| Behavior change | Cần goal setting, self-monitoring, feedback, prompts/cues, reward phù hợp và support opt-in. |
| Safety | Calorie tracking có thể gây áp lực ở nhóm nhạy cảm; phải có gentle mode và guardrail. |

### 2.2 Chức năng thật sự đáng làm tốt

Các chức năng có evidence fit và impact cao nhất:

- Logging nhanh: recent/frequent, copy, rough log, voice, barcode, AI scan review.
- Day completeness: no-log, partial, rough, complete, skipped, low-confidence.
- Food trust: source, verified state, completeness, missing-vs-zero.
- Smart reminder: personalized meal windows, suppress, quiet hours, cooldown, deep link.
- Weekly one-action coach: data quality -> win -> bottleneck -> one action -> follow-up.
- Adaptive target safety: complete-day + weight trend + explain + undo/pause.

---

## 3. End-to-End User Experience

### 3.1 North-star user flow

1. User vào app.
2. App hỏi rất ít để bắt đầu.
3. User log được bữa đầu trong dưới 2 phút.
4. App hiện giá trị ngay: calories/macros cơ bản + một điều cần để ý.
5. App giải thích dữ liệu đến từ đâu và chắc đến mức nào.
6. Nếu user quên, app nhắc đúng bữa thiếu, đúng giờ user hay ăn, có deep link mở thẳng logging lane.
7. Nếu user bỏ 1-3 ngày, app mở lại bằng rescue flow, không phạt.
8. Cuối tuần, app chỉ kết luận nếu đủ dữ liệu.
9. Khi target thay đổi, app giải thích lý do và cho user pause/adjust.

### 3.2 5 vòng lặp sản phẩm

| Loop | Mục tiêu | Feature cần phục vụ |
|---|---|---|
| Activation loop | User có aha moment trước khi bị hỏi quá nhiều | Minimal onboarding, first log, first feedback, notification permission after value |
| Logging loop | User log được trong nhiều bối cảnh | Recent/frequent, barcode, voice, AI scan, rough log, day recovery |
| Trust loop | User hiểu số nào chắc, số nào ước tính | Source badge, completeness, confidence, correction memory |
| Reminder loop | Theo dõi liên tục nhưng không phiền | JITAI decision engine, cooldown, quiet hours, deep link, outcome tracking |
| Coaching loop | Dữ liệu biến thành hành động nhỏ | Weekly review, one action, accept/done/snooze, useful feedback |

### 3.3 Home phải trả lời 3 câu hỏi

1. **Hôm nay tôi cần làm gì tiếp?**
   - One Job Today.
   - Bữa thiếu/action pending.
   - Xác nhận khẩu phần món đã scan.

2. **Dữ liệu hôm nay có đáng tin không?**
   - Day confidence.
   - Complete/partial/rough.
   - Source/completeness badge.

3. **Tôi có đang đi đúng hướng không?**
   - Target range thay vì chỉ exact number.
   - Trend 7-14 ngày.
   - Weekly action progress.

---

## 4. Trust Architecture và Nutrition Data

### 4.1 Food/diary entry phải có hộ chiếu dữ liệu

| Field | Ý nghĩa |
|---|---|
| `source_type` | Official/lab, curated Vietnamese DB, provider barcode, user custom, AI estimate |
| `source_name` | FAO/INFOODS Vietnam, USDA, provider, brand label, user correction |
| `verified_state` | Verified, curated, unverified, private, needs_review |
| `last_reviewed_at` | Dữ liệu có cũ không |
| `nutrient_completeness` | Có đủ calories/protein/carb/fat/sodium/fiber không |
| `missing_fields` | Thiếu gì; không được biến missing thành 0 |
| `confidence_score` | App chắc đến đâu |
| `user_confirmed` | User đã xác nhận khẩu phần chưa |
| `correction_history` | Đã từng bị sửa không |

### 4.2 UI trust nên có 3 lớp

1. Badge nhỏ: `Đã kiểm chứng`, `Từ nhãn`, `Ước tính AI`, `Thiếu sodium`, `Cần xác nhận`.
2. Tap badge -> bottom sheet giải thích source, completeness, last reviewed, cách sửa.
3. Weekly/adaptive target dùng trust score ngầm để quyết định có nên kết luận mạnh không.

### 4.3 Thông tin dinh dưỡng theo 4 tầng

| Tầng | User | Nội dung |
|---|---|---|
| Level 1 - Everyday | Mọi user | Calories, protein, carb, fat, meal progress |
| Level 2 - Health quality | User đã quen/có mục tiêu | Fiber, sodium, added sugar, saturated fat, water, fruit/veg/protein pattern |
| Level 3 - Trust detail | Khi tap badge/review | Source, verified state, missing fields, confidence, last reviewed |
| Level 4 - Advanced | Power user | Micronutrients, custom targets, export, trend sâu |

Không show micronutrient như sự thật nếu database thiếu nhiều. Điều đó tạo ảo giác chính xác.

---

## 5. Feature Quality Audit

### 5.1 Kết luận nhanh

Các chức năng đã có nền tốt:

- Diary core.
- AI scan mobile guard.
- Voice review threshold.
- Barcode DB-first/provider-second.
- Telemetry coverage.
- Admin credibility/verified fields.
- Onboarding telemetry.

Các điểm rủi ro nhất nếu đánh chuẩn chuyên nghiệp:

1. Adaptive target điều chỉnh theo average logged intake.
2. Missing nutrient bị biến thành 0 trong barcode/provider food.
3. Streak dựa vào calories > 0 hoặc bất kỳ meal log.
4. Notification fixed-time không biết user đã làm gì.
5. Weekly review tự tin khi data quality chưa đủ sâu.
6. AI scan recovery threshold quá thấp nếu coi là feature chính.
7. Nutrition insight quá calorie/macro-centric.

### 5.2 Điểm pro-readiness tổng quan

| Nhóm | Điểm hiện tại | Nhận định |
|---|---:|---|
| Diary/logging core | 7.0 | Nền tốt, thiếu day completeness/rough state |
| AI scan | 7.0 | Guard tốt, thiếu benchmark/correction/portion confidence |
| Voice | 6.5 | Review tốt, intent còn hẹp, cần conversational repair |
| Food search | 6.5 | Chạy được, cần ranking cá nhân/source badge |
| Barcode | 5.5 | Có flow, nhưng missing-vs-zero là lỗi trust lớn |
| Weekly review | 5.5 | Có khung, thiếu review history/action outcome/complete-day gate |
| Adaptive target | 4.5 | Rủi ro cao nhất; chưa đủ data-quality guard |
| Notification | 4.5 | Có settings, chưa là decision engine |
| Streak/gamification | 4.0 | Có bề mặt, logic thưởng hành vi chưa đúng |

Chi tiết scorecard đầy đủ được giữ ở Appendix A.

---

## 6. P0 Product Contracts

Trước khi code thêm feature, nên khóa 6 contract. Đây là xương sống để các chức năng hiện tại bớt rời rạc và bớt naive.

### 6.1 Activation Funnel Contract

User mới phải log được bữa đầu trong dưới 2 phút sau khi vào app, kể cả chưa hoàn tất mọi profile field.

Acceptance:

- Đo time-to-first-log.
- Đo onboarding completion.
- Hỏi notification permission sau khi user thấy value.
- Không bắt toàn bộ profile trước first value.

### 6.2 Day Completeness Contract

Mỗi ngày phải có state rõ:

- `no-log`
- `partial`
- `rough`
- `complete`
- `skipped`
- `low-confidence`

Không dùng calories > 0 làm proxy duy nhất cho logged day.

### 6.3 Notification Decision Contract

Mỗi notification phải có:

- Lý do gửi.
- Lý do suppress.
- Quiet hours.
- Cooldown.
- Deep link đúng flow.
- Outcome event: opened, logged, completed day, ignored, disabled.

### 6.4 Food Trust Contract

Mọi food entry phải phân biệt:

- Verified/unverified.
- Source.
- Credibility.
- Missing nutrient.
- True zero.
- User-corrected.
- Last reviewed.

### 6.5 AI Capture Confidence Contract

AI/voice/photo/barcode phải có confidence gate thống nhất:

- Confidence per field, không chỉ per result.
- Review state.
- Correction memory.
- Không quick-save khi dữ liệu chưa đủ chắc.
- Benchmark món Việt/negative cases.

### 6.6 Weekly Coach Action Contract

Weekly review phải tạo một hành động nhỏ:

- Data quality trước insight.
- One win.
- One bottleneck.
- One action.
- Accept/done/snooze/replace.
- Useful/not useful feedback.

---

## 7. Roadmap Chuẩn Hóa

### 7.1 P0 - Make it useful and trustworthy every day

- First-log dưới 2 phút.
- Recent/frequent + rough log.
- Day completeness + data confidence.
- Smart reminder decision engine.
- Source/completeness badge.
- Weekly one-action coach.
- Barcode missing-vs-zero.
- AI confidence review contract.

### 7.2 P1 - Make it learn from the user

- Personalized meal windows.
- Correction memory.
- Favorite/recent portion defaults.
- Notification tone/intensity learning.
- Why-this-changed explanation.
- Barcode label compare cho sản phẩm Việt.
- Search ranking theo lịch sử cá nhân.

### 7.3 P2 - Make it coach-level mature

- Adaptive target với complete-day + weight trend.
- Expert-reviewed nutrition policy.
- Advanced micronutrient chỉ khi data completeness đủ.
- Accountability opt-in.
- Long-term trend reports.
- Cohort analytics/A-B testing.

### 7.4 P3 - Advanced only after trust foundation

- Social/accountability buddy mở rộng.
- OCR nhãn dinh dưỡng hoàn chỉnh.
- Wearable integration có smoothing và không eat-back thô.
- Medical-condition personalization chỉ khi có policy/chuyên gia.

---

## 8. Metrics and Verification

### 8.1 Product trust metrics

- `verified_food_ratio`
- `food_source_coverage`
- `nutrient_completeness_score`
- `barcode_missing_field_rate`
- `ai_correction_rate`
- `portion_confirm_rate`
- `day_confidence_score`

### 8.2 Behavior/effectiveness metrics

- `time_to_first_log`
- `time_to_log_meal_p50/p75/p95`
- `complete_day_rate`
- `rough_log_rate`
- `notification_to_log_rate`
- `weekly_review_action_accept_rate`
- `weekly_review_action_done_rate`
- `day_7_retention`
- `week_4_retention`

### 8.3 AI/model metrics

- AI scan top-1/top-3 accuracy.
- False positive rate với ảnh không có đồ ăn.
- Voice parse exact intent accuracy.
- Voice field accuracy: food, quantity, meal, date.
- Barcode match rate và missing nutrient rate.
- Adaptive target applied/undone/pause rate.

### 8.4 Những điểm chưa verify đủ

- Chưa có telemetry thật về full funnel.
- Chưa có usability test với user Việt mới dùng app dinh dưỡng.
- Chưa có benchmark AI scan riêng cho món Việt.
- Chưa có barcode/provider benchmark cho sản phẩm Việt.
- Chưa có nutrition expert review cho copy/adaptive/safety.
- Chưa có p75/p95 trên thiết bị thật cho flow search/add/voice/photo/barcode.
- Chưa có A/B test notification tone, onboarding length, rough log/rescue flow.

---

## 9. Safety and Scope Guardrails

### 9.1 Safety rules

- Không shame/guilt.
- Không cổ vũ ăn quá ít.
- Không gamify deficit quá mạnh.
- Không dùng streak pressure cho nhóm nhạy cảm.
- Có gentle tracking mode.
- Warning nếu mục tiêu giảm cân quá nhanh.
- Không dùng app như tư vấn y tế.

### 9.2 Không nên build trước khi P0/P1 đủ chắc

- Projected weight loss theo 1 ngày.
- Eat-back calories từ wearable.
- Micronutrient dashboard khi database thiếu completeness.
- AI medical coach tự do.
- Social/community public mặc định.
- Auto-save AI scan khi món nhiều thành phần hoặc confidence yếu.
- Adaptive target auto-apply khi chưa có complete-day + weight trend.

---

## 10. Confidence Upgrade Protocol 90%+

Mục tiêu của protocol này là nâng độ chắc của các luận điểm chính từ khoảng 80-85% lên **90%+** bằng bằng chứng thật, có điều kiện pass/fail rõ ràng. Không được tự nâng confidence chỉ vì tài liệu nghe hợp lý hoặc có nhiều nguồn research.

### 10.1 Quy tắc nâng confidence

Một luận điểm chỉ được đánh dấu **90%+ confidence** khi thỏa cả 4 điều kiện:

1. Có **code evidence**: đối chiếu được với implementation hiện tại hoặc contract mới.
2. Có **external evidence**: paper/guideline/official docs hoặc benchmark app chuyên nghiệp.
3. Có **real product evidence**: telemetry, benchmark, usability test hoặc dữ liệu vận hành thật.
4. Không có **critical contradiction**: không có kết quả test/user/expert nào phủ định trực tiếp luận điểm.

Nếu chỉ có research + code reading, mức cao nhất nên giữ là **85%**. Nếu có thêm benchmark hoặc usability nhưng chưa có telemetry thật, mức cao nhất nên giữ là **88%**. Muốn vượt 90%, bắt buộc phải có ít nhất 3 loại evidence độc lập.

### 10.2 Confidence ledger

Mỗi luận điểm quan trọng cần có một dòng ledger:

| Field | Ý nghĩa |
|---|---|
| Claim | Luận điểm cần chứng minh |
| Current confidence | Mức tự tin hiện tại |
| Evidence required | Cần bằng chứng gì để nâng lên |
| Pass threshold | Ngưỡng pass |
| Fail condition | Điều kiện khiến claim không được nâng |
| Owner | Ai chịu trách nhiệm verify |
| Final confidence | Mức tự tin sau khi có evidence |

Ví dụ:

| Claim | Current | Evidence required | Pass threshold | Fail condition |
|---|---:|---|---|---|
| Streak `calories > 0` là logic yếu | 90% | Code evidence + telemetry complete-day mismatch | >=20% logged-day không đạt complete-day | Nếu telemetry cho thấy logged-day gần như luôn complete |
| Barcode missing nutrient không được map thành 0 | 92% | Code evidence + barcode benchmark | 100% missing-vs-zero contract pass | Nếu provider luôn phân biệt missing và backend không ghi 0 |
| Smart reminder cần decision engine | 82% | Telemetry notification outcome + usability feedback | Reminder personalized tăng log-within-30-min >=15% hoặc giảm opt-out | Nếu fixed reminder có hiệu quả tương đương và không tăng opt-out |

### 10.3 Gate 1 — Telemetry funnel thật

**Mục tiêu:** biết user thật đang rơi ở đâu, feature nào giúp, feature nào gây phiền.

**Điều kiện khắt khe để tính là evidence 90%:**

- Tối thiểu `100` user mới hoặc active users có logging trong `28` ngày. Nếu chỉ có `30` tester/14 ngày thì chỉ đủ nâng lên khoảng 85-88%, chưa đủ 90%.
- Event coverage missing dưới `2%` cho các event bắt buộc.
- Có cohort theo user mới, user quay lại, user bỏ 1-3 ngày, user active.
- Có timestamp đủ để tính p50/p75/p95.

**Event bắt buộc:**

- `onboarding_start`, `onboarding_complete`, `notification_permission_prompt`, `notification_permission_result`.
- `first_log_start`, `first_log_success`, `food_search_submit`, `food_add_success`.
- `ai_scan_start`, `ai_scan_result`, `ai_scan_review_open`, `ai_scan_save_success`, `ai_scan_correction`.
- `barcode_scan_start`, `barcode_scan_result`, `barcode_user_edit`.
- `voice_parse_start`, `voice_review_ready`, `voice_execute_success`.
- `day_state_changed`: no-log, partial, rough, complete, skipped, low-confidence.
- `notification_sent`, `notification_suppressed`, `notification_open`, `notification_action_completed`, `notification_disabled`.
- `weekly_review_open`, `weekly_action_accept`, `weekly_action_done`, `weekly_action_snooze`, `weekly_action_useful`.

**Pass threshold:**

| Metric | Ngưỡng pass |
|---|---:|
| Time-to-first-log p75 | <= 2 phút |
| Known/recent food add p75 | <= 60 giây |
| Search result-to-add success | >= 60% |
| Notification-to-log trong 30 phút | >= 12-15% lift so với baseline hoặc fixed-time |
| Notification opt-out | Không tăng quá 3 điểm % |
| Complete-day rate sau tuần 1 | Có trend tăng so với baseline |
| Weekly action done | >= 25% trong user đã accept |

**Fail condition:** nếu notification làm opt-out tăng mạnh, first-log >2 phút, hoặc nhiều user complete onboarding nhưng không log bữa đầu, thì claim UX hiện tại chưa đủ chắc.

### 10.4 Gate 2 — Benchmark AI món Việt

**Mục tiêu:** biết AI scan có đáng tin với món Việt thực tế không, không dựa vào cảm giác.

**Dataset tối thiểu:**

- Ít nhất `500` ảnh.
- Ít nhất `50` nhóm món/food class Việt và món phổ biến.
- Có ảnh một món, nhiều món, món trộn, ảnh mờ, ánh sáng yếu, hộp cơm, quán ăn, đồ uống, ảnh không có đồ ăn.
- Tối thiểu `10%` negative set: không đồ ăn, bao bì, người, bàn ăn rỗng.
- Label bởi `2` người độc lập; conflict phải adjudicate.
- Không dùng ảnh đã nằm trong training set.

**Metric pass:**

| Metric | Ngưỡng pass |
|---|---:|
| Single-dish top-1 accuracy | >= 80% |
| Single-dish top-3 accuracy | >= 92% |
| Multi-food item recall | >= 75% cho món chính |
| False positive trên negative set | <= 3% |
| Unsafe quick-save rate | <= 1% |
| Per-class minimum accuracy | Không class quan trọng nào <60% nếu vẫn quick-save |

**Fail condition:** nếu false positive cao, top-2 ambiguity nhiều, hoặc món Việt phổ biến dưới ngưỡng, AI scan chỉ được giữ vai trò **review-first assistant**, không được xem là auto logging chuẩn.

### 10.5 Gate 3 — Benchmark barcode và food data

**Mục tiêu:** xác thực barcode/provider có đủ tin để user dùng hằng ngày.

**Dataset tối thiểu:**

- Ít nhất `300` sản phẩm phổ biến ở Việt Nam.
- Phủ nhóm: sữa, mì/gói, snack, nước uống, đồ đông lạnh, protein/fitness, hàng nhập khẩu, sản phẩm local.
- Mỗi sản phẩm có barcode, ảnh nhãn dinh dưỡng, serving size, calories/macros.
- Mỗi record được đối chiếu bởi 2 reviewer hoặc một reviewer + audit sample 20%.

**Metric pass:**

| Metric | Ngưỡng pass |
|---|---:|
| Barcode match rate | >= 85% |
| Calories đúng trong ±10% hoặc ±20 kcal | >= 90% matched items |
| Macro đúng trong ±15% với nutrient >5g | >= 85% matched items |
| Serving size match hoặc cảnh báo mismatch | >= 90% |
| Missing-vs-zero contract | 100% pass |
| Product duplicate/conflict flagged | >= 95% conflict detected |

**Fail condition:** nếu missing nutrient vẫn bị ghi 0, serving size sai không cảnh báo, hoặc provider coverage sản phẩm Việt thấp, barcode không được quảng bá là "đáng tin"; chỉ được coi là lane tiện cần verify.

### 10.6 Gate 4 — Usability test với user mới

**Mục tiêu:** xác thực app có thuận tiện thật không, không chỉ đo bằng developer cảm giác.

**Sample khắt khe:**

- Tối thiểu `12` user mới nếu muốn claim 90%+. Nếu chỉ 5-6 user thì đủ phát hiện lỗi lớn nhưng chưa đủ nâng confidence sản phẩm.
- Ít nhất 4 user chưa từng dùng nutrition app.
- Ít nhất 4 user từng dùng app tracking.
- Có cả Android tầm trung và máy yếu.
- Không hướng dẫn quá mức; chỉ đưa task.

**Task bắt buộc:**

1. Hoàn thành onboarding tối thiểu.
2. Log bữa đầu bằng search.
3. Log món đóng gói bằng barcode.
4. Log món bằng AI scan và sửa khẩu phần.
5. Log bằng voice.
6. Hiểu trust badge/source/completeness.
7. Xử lý một ngày quên log bằng rough/skipped flow.
8. Đọc weekly review và chọn action.
9. Đổi notification preference.

**Metric pass:**

| Metric | Ngưỡng pass |
|---|---:|
| Task success trung bình | >= 85% |
| First meal logged trong <=2 phút | >= 80% user |
| User hiểu trust badge | >= 80% |
| User không thấy notification copy gây áp lực | >= 90% |
| SUS hoặc equivalent usability score | >= 80 |
| Severity-1 issue | 0 |
| Severity-2 issue | <= 2 trước khi claim 90% |

**Fail condition:** nếu user không hiểu nguồn dữ liệu, không sửa được khẩu phần, không biết app đang nhắc gì, hoặc thấy bị phán xét, UX/trust claim phải giữ dưới 90%.

### 10.7 Gate 5 — Nutrition expert và safety review

**Mục tiêu:** giảm rủi ro lời khuyên sai, target nguy hiểm, hoặc copy gây hại.

**Reviewer tối thiểu:**

- `2` chuyên gia dinh dưỡng/dietitian độc lập nếu muốn nâng confidence lên 90%+ cho nutrition/safety claims.
- `1` reviewer UX/safety cho tone, shame/guilt, eating-disorder-sensitive copy.

**Scope review:**

- Onboarding target formula/copy.
- Adaptive target rules.
- Weekly review copy.
- Low-calorie/high-deficit warning.
- Protein/fiber/sodium/added sugar/saturated fat guidance.
- Gentle mode.
- Claims trong app và disclaimer.

**Pass threshold:**

| Area | Ngưỡng pass |
|---|---|
| Critical safety issue | 0 |
| Advice vượt phạm vi app tự theo dõi | 0 |
| Copy shame/guilt/high-pressure | 0 critical, <=2 minor |
| Target bounds | Có min/max và pace guard |
| Medical-condition advice | Không đưa lời khuyên cá nhân hóa y tế nếu chưa có policy |

**Fail condition:** nếu chuyên gia đánh dấu copy/target/advice có rủi ro nghiêm trọng, toàn bộ luận điểm liên quan nutrition coaching phải giữ dưới 80% cho đến khi sửa.

### 10.8 Gate 6 — Code contract and regression gate

**Mục tiêu:** đảm bảo evidence đã chứng minh được chuyển thành contract kỹ thuật, không chỉ nằm trong tài liệu.

**Contract bắt buộc trước khi claim 90%:**

- Food Trust Contract: source, verified, completeness, missing-vs-zero.
- Day Completeness Contract: no-log/partial/rough/complete/skipped/low-confidence.
- Notification Decision Contract: sent/suppressed/open/action/disabled.
- AI Confidence Contract: confidence per field, review reason, save guard.
- Weekly Action Contract: accept/done/snooze/useful.
- Adaptive Target Safety Contract: complete-day + weight trend + explain + undo/pause.

**Pass threshold:**

- Unit/integration tests cho contract critical path.
- Test dữ liệu missing nutrient không bao giờ thành true zero.
- Test adaptive target không chạy trên partial-heavy data.
- Test notification suppress nếu user đã log hoặc đang quiet hours.
- Test streak không dùng calories >0 làm nguồn duy nhất cho complete-day.

**Fail condition:** nếu contract chưa có test hoặc vẫn phụ thuộc logic cũ, claim "chuẩn chuyên nghiệp" chưa được nâng quá 85%.

### 10.9 Decision rule cuối

Mức confidence sau validation:

| Evidence đạt được | Confidence tối đa |
|---|---:|
| Research + code reading | 85% |
| Research + code + một benchmark | 88% |
| Research + code + benchmark AI/barcode + usability nhỏ | 89% |
| Đủ Gates 1-5 nhưng chưa có code contract tests | 90% |
| Đủ Gates 1-6, không có critical fail | 92-95% |

Không nên claim trên 95% cho app dinh dưỡng consumer vì dữ liệu người dùng, khẩu phần, database, hành vi và môi trường ăn uống luôn nhiễu.

### 10.10 Timeline khuyến nghị để đạt 90%+

| Tuần | Việc cần làm | Output |
|---|---|---|
| Week 1 | Khóa event schema + validation checklist + benchmark protocol | Telemetry spec, AI benchmark spec, barcode benchmark spec |
| Week 2 | Chạy AI benchmark món Việt + barcode benchmark batch 1 | Accuracy report, barcode quality report |
| Week 3 | Usability test 12 user + notification copy review | Usability report, issue severity list |
| Week 4 | Expert nutrition/safety review + finalize contract changes | Expert review notes, safety action list |
| Week 5 | Chạy telemetry cohort/alpha nếu có user thật | Confidence ledger, go/no-go P0 PRD |

Nếu chưa có 100 active/new users, vẫn làm được benchmark + usability + expert review, nhưng phải ghi rõ confidence tối đa tạm thời là 88-89% cho product effectiveness claims.

---

## 11. High-Assurance Validation Stack

Mục tiêu của phần này là nâng tài liệu lên mức khắt khe nhất có thể bằng cách tham chiếu chuẩn đánh giá của digital health, AI reporting, risk management, usability, software quality và food composition data. Đây không biến EatFitAI thành medical device, nhưng dùng cùng kiểu kỷ luật kiểm chứng để tránh claim quá tay.

Kết luận cứng sau vòng research bổ sung:

> Research có thể nâng độ chắc của roadmap và validation protocol lên khoảng **88-90%**, nhưng không thể tự nâng hiệu quả thực tế của app lên 90% nếu chưa có dữ liệu người dùng thật và review độc lập.

### 11.1 Standards stack nên dùng

| Nhóm chuẩn | Tham chiếu chính | Áp dụng vào EatFitAI |
|---|---|---|
| Digital health evaluation | WHO digital health M&E, NICE Evidence Standards Framework, CONSORT-EHEALTH | Thiết kế telemetry, study protocol, báo cáo hiệu quả, cohort và điều kiện claim |
| AI evaluation/reporting | CONSORT-AI, SPIRIT-AI, DECIDE-AI, NIST AI RMF, FDA GMLP/CDS guidance | Đánh giá AI scan, AI nutrition assistant, adaptive target, human-AI review, risk register |
| Software quality | ISO/IEC 25010:2023, Android Core App Quality, Android vitals | Chuyển "app tốt" thành tiêu chí functional suitability, reliability, usability, performance, security, maintainability |
| Nutrition data quality | FAO/INFOODS, USDA FoodData Central, FDA Nutrition Facts, NCI Dietary Assessment Primer | Source provenance, data completeness, food matching, serving conversion, missing-vs-zero, measurement error |
| Mobile app UX/trust | MARS, SUS, usability testing literature, health app credibility research | Đo engagement, functionality, aesthetics, information quality, credibility, perceived trust |
| Behavior change | COM-B, Behavior Change Wheel, JITAI, self-monitoring evidence | Thiết kế reminder, weekly action, recovery flow, intervention timing và tránh notification fatigue |

Hàm ý thực tế: mỗi feature quan trọng phải có **claim -> risk -> evidence -> metric -> pass/fail -> owner**. Nếu thiếu một mắt xích, feature đó chưa được gọi là "chuẩn chuyên nghiệp".

### 11.2 Evidence hierarchy mới

| Level | Evidence có được | Confidence tối đa nên claim |
|---|---|---:|
| L0 | Ý tưởng, cảm giác, benchmark app bằng quan sát bên ngoài | 60-70% |
| L1 | Research khoa học + audit code + so sánh app chuyên nghiệp | 85% |
| L2 | L1 + offline benchmark AI/barcode/food data có protocol | 88% |
| L3 | L2 + usability test user mới + expert review độc lập | 89-90% |
| L4 | L3 + telemetry cohort thật + contract tests pass | 90-92% |
| L5 | L4 + controlled experiment hoặc longitudinal study có comparator | 93-95% |

Không nên claim trên 95% cho app dinh dưỡng consumer. Dữ liệu khẩu phần, nhãn sản phẩm, món tự nấu, adherence và recall của người dùng luôn có nhiễu đo lường.

### 11.3 Evidence package tối đa cần có

Để nâng tài liệu và sản phẩm lên mức high-assurance, EatFitAI cần tạo bộ bằng chứng sau:

| Artifact | Nội dung bắt buộc | Vì sao cần |
|---|---|---|
| Evidence Register | Claim, source, applicability, limitation, confidence cap | Tránh trộn "có paper" với "đúng cho app này" |
| Assumption Ledger | Các giả định chưa chứng minh: user Việt log gì, dùng máy gì, hiểu copy ra sao | Biết điểm nào đang dựa vào giả định |
| Risk Register | Safety, nutrition misinformation, AI false positive, data integrity, notification fatigue | Chuẩn hóa risk theo NIST/health app practice |
| Data Provenance Catalog | Source, verified flag, update date, completeness, serving basis, locale | Tăng trust cho food database |
| AI Benchmark Report | Dataset, label protocol, top-1/top-3, false positive, quick-save risk, per-class failures | Biết AI scan dùng được ở lane nào |
| Barcode Quality Report | Match rate, label accuracy, serving mismatch, duplicate/conflict, missing-vs-zero | Biết barcode có đáng tin với sản phẩm Việt không |
| Usability Report | Task success, first-log time, SUS, severity list, user quotes, device mix | Biết app có dễ dùng với user mới không |
| Expert Review Notes | Nutrition/safety/copy/adaptive target review bởi reviewer độc lập | Giảm nguy cơ lời khuyên sai hoặc copy gây hại |
| Telemetry Dashboard | Funnel, retention, complete-day, intervention outcome, opt-out, crash/perf | Xác thực hành vi thật, không chỉ lab |
| Contract Test Matrix | Food trust, completeness, AI confidence, notification, weekly action, adaptive target | Đảm bảo insight đã thành chất lượng kỹ thuật |
| Release Decision Memo | Go/no-go, residual risk, confidence ledger, issue owner | Ngăn roadmap bị diễn giải quá tay khi chuyển sang sprint |

### 11.4 Claim-specific confidence upgrade

| Claim | Evidence hiện có | Bằng chứng cần thêm | Confidence sau khi đủ bằng chứng |
|---|---|---|---:|
| Trust layer là P0, không phải nice-to-have | Research + benchmark app + code audit | Usability user hiểu source/confidence >=80%, barcode/data audit pass | 92-95% |
| AI scan cần review-first, không nên auto-save mạnh | Research image dietary assessment + risk analysis | Benchmark món Việt pass, unsafe quick-save <=1%, false positive <=3% | 90-92% |
| Reminder phải là decision engine, không phải lịch cố định | JITAI + push notification research | A/B hoặc cohort lift log-within-30-min, opt-out không tăng >3 điểm % | 90-92% |
| Weekly review phải chốt một hành động nhỏ | Self-monitoring + feedback research | Weekly action accept/done/useful telemetry | 88-92% |
| Adaptive target chỉ nên chạy khi dữ liệu đủ chắc | Nutrition target safety + code contract logic | Complete-day + weight trend contract tests, expert review, cohort safety | 90-92% |
| App cải thiện hành vi dinh dưỡng thật | Research self-monitoring/app interventions | Longitudinal cohort hoặc controlled study với comparator | 90-95% |
| App có trải nghiệm thuận tiện cho người mới | UX research + flow audit | 12 user usability test, first-log p75 <=2 phút, SUS >=80, severity-1 = 0 | 90% |

Điểm quan trọng: claim "tính năng này hợp lý và nên build" có thể đạt 88-90% bằng research + benchmark + review. Claim "user thật sẽ giảm cân/ăn tốt hơn nhờ app" bắt buộc cần dữ liệu vận hành hoặc study theo thời gian.

### 11.5 Hard gates mới cho professional-grade

| Gate | Pass tối thiểu | Fail nếu |
|---|---|---|
| Data integrity | 100% missing nutrient không bị ghi thành 0; mọi food có source/completeness | Có bất kỳ critical path nào làm sai missing-vs-zero |
| AI safety | AI result luôn có confidence/review reason; auto-save chỉ cho case đơn giản, verified hoặc high-confidence | Negative image vẫn tạo food đáng tin hoặc user có thể save nhanh khi confidence yếu |
| UX speed | First-log p75 <=2 phút; known/recent food add p75 <=60 giây; barcode p75 <=45 giây nếu match | User mới cần quá nhiều bước hoặc không hiểu cách sửa khẩu phần |
| Trust comprehension | >=80% user giải thích đúng source/trust badge/completeness sau task | User tưởng mọi số đều chính xác như nhau |
| Notification quality | Lift hành động sau notification >=12-15% hoặc retention tăng; opt-out không tăng >3 điểm % | Reminder gây áp lực, bị tắt nhiều, hoặc gửi khi user đã log |
| Nutrition safety | 0 critical issue từ expert; target có min/max/pace guard; medical scope rõ | App đưa lời khuyên bệnh lý cá nhân hóa hoặc deficit quá mạnh không cảnh báo |
| Reliability | Contract tests pass; crash-free/session stability đạt ngưỡng release; p95 API/flow không phá UX | Một feature P0 có đường lỗi im lặng hoặc state không nhất quán |
| Evaluation transparency | Mỗi claim P0 có owner, evidence, threshold, residual risk | Tài liệu có luận điểm nhưng không có điều kiện kiểm chứng |

### 11.6 Áp dụng vào từng cụm chức năng hiện tại

| Cụm chức năng | Chỗ đã ổn | Chỗ còn ngu nếu giả định chạy chuẩn chuyên | Chuẩn high-assurance cần bổ sung |
|---|---|---|---|
| Search/manual logging | Lane căn bản, dễ kiểm soát hơn AI | Nếu thiếu source/completeness, user vẫn không biết entry nào đáng tin | Source badge, verified/common/recent ranking, serving presets Việt, conflict warning |
| AI scan | Có giá trị giảm friction cho món tự nấu/nhà hàng | Dễ bị user tin quá mức; món trộn/khẩu phần là vùng sai lớn | Benchmark món Việt, review-first UX, confidence per field, unsafe quick-save guard |
| Barcode | Rất tiện cho packaged food | Provider coverage Việt và serving size có thể yếu; missing nutrient dễ bị hiểu nhầm là 0 | Barcode quality audit, label-photo evidence, serving mismatch warning, verified workflow |
| Voice/text AI | Có thể rất nhanh cho user quen nói tự nhiên | Nếu parse sai số lượng/đơn vị mà execute ngay thì nguy hiểm dữ liệu | Review-before-save, unit parser tests, Vietnamese portion ontology, correction telemetry |
| Diary/streak | Có thể tạo adherence | Streak theo calories >0 hoặc log thô sẽ thưởng dữ liệu rác | Day Completeness Contract, rough/skipped state, recovery flow không shame |
| Weekly review | Đúng hướng nếu chuyển thành action | Nếu chỉ báo cáo số liệu thì không đổi hành vi | One-action coaching, accept/done/useful metric, explain based on complete days only |
| Adaptive target | Tính năng thông minh nếu làm đúng | Rất dễ "thông minh giả" khi dữ liệu thiếu hoặc cân nặng nhiễu | Trend smoothing, min/max, explain/undo/pause, expert safety review |
| Notifications | Cần để kéo user quay lại | Lịch cố định dễ gây phiền và tắt permission | Decision engine, quiet hours, suppression, copy không phán xét, outcome telemetry |
| Food database/admin | Là nền trust thật | Nếu chỉ thêm nhiều entry mà không có QA thì database lớn nhưng bẩn | Data provenance, review queue, conflict detection, quality score, source update policy |
| AI coach/chat | Có thể giúp giải thích và động viên | Nguy cơ vượt phạm vi y tế, hallucination, lời khuyên quá tự tin | Retrieval/source grounding, scope guardrails, confidence language, escalation/disclaimer |

### 11.7 Decision rule sau vòng research bổ sung

Sau khi tham khảo thêm các chuẩn trên, mức tự tin hợp lý nên chốt như sau:

| Đối tượng đánh giá | Confidence hiện tại sau research | Ghi chú |
|---|---:|---|
| Chất lượng cấu trúc roadmap | 89-91% | Đã có framework, evidence stack, feature audit, contracts, gates rõ |
| Độ đúng của các P0 ưu tiên | 85-90% | Mạnh với trust/completeness/reminder/recovery; vẫn cần telemetry để chốt |
| Độ đúng của nhận định "AI phải review-first" | 88-90% | Mạnh về risk/evidence, nhưng cần benchmark món Việt để vượt 90 |
| Độ chắc của operational evidence protocol | 90-92% | Đã bám real-world data, RE-AIM, engagement, JITAI, MARS, food-label/data-quality guidance |
| Độ chắc của app effectiveness với user thật | 65-70% | Chưa có cohort/controlled study thật nên không được nâng quá tay |
| Khả năng đạt 90%+ nếu chạy đủ gates | 92-95% | Có thể đạt cho claim cụ thể, không phải mọi claim cùng lúc |

### 11.8 Research vòng bổ sung: biến evidence thật thành số đo

Vòng research bổ sung làm rõ một sai lầm thường gặp: đo app nutrition bằng `DAU`, `session`, `open rate` hoặc `streak` là chưa đủ. Digital behavior-change research phân biệt **micro-engagement** với app và **macro-engagement** với hành vi. Vì vậy EatFitAI phải đo cả việc user thao tác trong app, chất lượng dữ liệu họ tạo ra, và hành động dinh dưỡng họ thật sự làm.

| Mảng cần chứng minh | Nguồn research bổ trợ | Bổ sung vào protocol EatFitAI |
|---|---|---|
| Engagement thật | Engagement research tách micro-level usage và macro-level behavior change | Không chỉ đo app mở bao nhiêu lần; phải đo `complete_day`, `weekly_action_done`, `recovery_after_lapse`, `useful_feedback` |
| Self-monitoring có ích | My Meal Mate và SMART cho thấy frequency/pattern self-monitoring liên quan weight outcome, nhưng cần timestamp thật | Đo số ngày log hợp lệ, log liên tục hay intermittent, số ngày plausible intake, và duy trì 3-6 tháng |
| Real-world evidence | RWD/RWE mHealth literature xem dữ liệu dùng app hằng ngày là đường bổ trợ cho RCT truyền thống | Telemetry 28 ngày là minimum; 90 ngày mới đủ nhìn retention, recovery, fatigue, và maintenance |
| Khả năng triển khai bền | RE-AIM nhấn mạnh Reach, Effectiveness, Adoption, Implementation, Maintenance | Thêm scorecard RE-AIM cho alpha/beta: user nào dùng được, hiệu quả gì, có duy trì không |
| Notification đúng lúc | JITAI research yêu cầu decision points, tailoring variables, intervention options, decision rules, proximal outcomes | Notification phải có `provide_nothing/suppress`; đo proximal outcome như log trong 30 phút, không chỉ open rate |
| Food data accuracy | FDA food labeling guidance cho thấy nhãn thực phẩm có compliance tolerance; FAO/INFOODS nhấn mạnh data documentation và matching | Không quảng bá con số là tuyệt đối; barcode benchmark phải có label-photo evidence, source, serving basis, conflict flag |
| AI photo logging | Nutrition5k cho thấy benchmark phải có ground truth về ingredient, mass, calories/macros; ảnh đời thật vẫn nhiễu mạnh | AI benchmark EatFitAI cần set món Việt riêng + subset lab/weighed nếu có thể; chỉ claim quick-add khi class/portion đủ chắc |
| Trust và transparency | MARS/BMC medical-app trust research nhấn mạnh reliability/validity, privacy, testing context, business model | Trong app nên có trang "Dữ liệu này đến từ đâu", version data source, confidence, và cách sửa/report sai |
| User burden | Nutrition app barriers research nhắc lại rào cản lớn: thời gian log, database/usability, trust, cost, data security | Thêm `perceived_effort_score`, task time, correction time, abandon reason, và "rough log" không phán xét |

### 11.9 Điểm sau khi review lại quan điểm

Sau vòng research bổ sung, có thể nâng **điểm tài liệu/validation design**, nhưng không nâng bừa hiệu quả sản phẩm:

| Hạng mục | Trước | Sau | Lý do |
|---|---:|---:|---|
| Roadmap như tài liệu định hướng sản phẩm | 8.7/10 | 8.8/10 | Đã bổ sung real-world evidence, engagement, RE-AIM, food-label tolerance, Nutrition5k benchmark logic |
| Validation protocol | 88-90% | 90-92% | Protocol đã rõ artifact, metric, gate, confidence cap và scorecard vận hành |
| P0 feature priority | 85-90% | 86-90% | Nguồn mới củng cố trust, recovery, reminder decision, rough log, source transparency |
| Product effectiveness thật | 65-70% | 65-70% | Không được nâng nếu chưa có telemetry/user study thật |

Kết luận sau review: quan điểm chính **vẫn ổn và mạnh hơn**, đặc biệt là "không thắng bằng thêm AI, thắng bằng logging nhanh + trust + recovery + feedback đúng lúc". Điểm được nâng nhẹ cho chất lượng tài liệu, còn claim hiệu quả với user thật vẫn giữ nguyên để không tự lừa mình.

Kết luận nghiêm ngặt:

> Tài liệu hiện đã đủ chuẩn để dẫn dắt PRD và validation. Nhưng để "dám chắc 90%+" theo nghĩa sản phẩm thật, EatFitAI phải chạy evidence package ở phần 11.3 và Gates 1-6. Không có đường tắt bằng research thêm.

---

## 12. Capability Upgrade Blueprint

Mục tiêu của phần này là biến các điểm yếu đã nêu thành plan nâng cấp cụ thể cho các chức năng hiện có. Trọng tâm không phải thêm nhiều feature mới, mà làm cho `search`, `diary`, `AI scan`, `barcode`, `voice`, `weekly review`, `adaptive target`, `notification` và `recovery flow` đạt chuẩn đáng tin, nhanh, dễ dùng và có ích thật.

Chuỗi năng lực cần đạt:

`log nhanh` -> `verify nhẹ` -> `data đủ tin` -> `feedback đúng lúc` -> `recover khi bỏ lỡ` -> `hành vi tốt hơn`

### 12.1 Nguyên tắc nâng cấp

| Nguyên tắc | Ý nghĩa thực tế |
|---|---|
| Fast does not mean blind | Mọi lane log nhanh phải có review/undo/source khi dữ liệu chưa chắc |
| Rough is better than quit | Cho phép log thô, skipped day, quick recovery; nhưng không dùng dữ liệu thô để kết luận mạnh |
| AI drafts, user confirms | AI tạo draft có confidence và reason; user xác nhận khi ảnh/món/khẩu phần có rủi ro |
| Trust is visible | User phải thấy dữ liệu đến từ đâu, mức chắc ra sao, và sửa/report sai thế nào |
| Reminder must earn its interruption | Notification chỉ gửi khi có lý do, đúng thời điểm, và có hành động nhỏ |
| Recovery beats punishment | Sau khi bỏ vài ngày, app phải giúp reset trong 1-2 phút, không phạt streak hoặc shame |
| Weekly review must change one behavior | Review tuần chỉ thắng khi user chọn/làm một action cụ thể, không phải xem biểu đồ đẹp |

### 12.2 Upgrade matrix theo từng chức năng

| Chức năng | Mục tiêu chuyên nghiệp | Nâng cấp cần làm | Metric pass |
|---|---|---|---|
| Search/manual logging | Tìm đúng món nhanh, ưu tiên dữ liệu đáng tin | Ranking theo verified/source/local/recent/frequent; synonym tiếng Việt; portion preset Việt; cảnh báo món thiếu source | Known/recent add p75 <=45 giây; search-to-add >=65%; entry thiếu source <5% |
| Diary/day state | Diary phản ánh chất lượng dữ liệu, không chỉ có calories | Day state: no-log, partial, rough, complete, skipped, low-confidence; completeness badge; plausible intake check | >=95% logged days có state đúng; streak không dựa vào calories >0 |
| AI scan | Giảm friction nhưng không tạo over-trust | Review-first; confidence per field; reason "cần kiểm tra"; multi-food item list; correction memory; unsafe quick-save guard | Unsafe quick-save <=1%; false positive negative set <=3%; correction rate giảm theo thời gian |
| Barcode | Tiện nhưng có bằng chứng nhãn/source | Provider result + label photo/OCR compare; serving mismatch warning; verified product queue; duplicate/conflict flag | Barcode match >=85%; calories ±10% hoặc ±20 kcal >=90%; missing-vs-zero 100% pass |
| Voice/text logging | Ghi nhanh bằng tiếng Việt tự nhiên nhưng không execute mù | Parse thành draft; highlight số lượng/đơn vị không chắc; hỏi lại khi thiếu portion; review trước save | Voice-to-draft p75 <=12 giây; execute success >=80%; critical parse error <=1% |
| Weekly review | Một hành động nhỏ có thể làm tuần tới | One Action Today/This Week; action có when/where/how; chỉ dùng complete-day để kết luận mạnh; user feedback hữu ích | Weekly action accept >=35%; done >=25%; useful >=60% |
| Adaptive target | Điều chỉnh mục tiêu an toàn, giải thích được | Chỉ chạy khi đủ complete-day + weight trend; smoothing; min/max/pace guard; explain + undo/pause | 0 critical safety issue; 100% adjustment có reason + undo |
| Notification | Nhắc đúng lúc, không gây phiền | Decision engine: send/suppress/provide-nothing; quiet hours; lapse rescue; outcome telemetry | Log-within-30-min lift >=12-15%; opt-out không tăng >3 điểm % |
| Recovery flow | Kéo user quay lại sau 1-3 ngày bỏ lỡ | 2-minute reset; rough catch-up; "bắt đầu lại hôm nay"; no-shame copy; suggested easiest lane | Recovery after lapse >=35%; first recovery log p75 <=90 giây |
| Trust layer | User biết số nào đáng tin | Source badge, confidence, completeness, data version, report issue, "why this number" | >=80% user giải thích đúng source/confidence trong usability test |

### 12.3 Product layers cần thiết cho plan sắp tới

| Layer | Vai trò | Không có layer này thì sao |
|---|---|---|
| Nutrition Trust Layer | Chuẩn hóa source, verified, completeness, missing-vs-zero, data version | Search/barcode/AI/weekly/adaptive đều dễ dùng dữ liệu bẩn |
| Logging Effort Layer | Đo time-to-log, correction effort, abandon reason theo từng lane | Không biết feature nào thật sự tiện hay gây mệt |
| AI Uncertainty Layer | Confidence per field, uncertainty copy, review reason, correction feedback | User dễ tin AI quá mức hoặc bỏ AI vì không biết khi nào sai |
| Day Completeness Layer | Quy định ngày nào đủ tin để review/adaptive/weekly | Weekly/adaptive target dễ kết luận sai từ dữ liệu thiếu |
| Intervention Decision Layer | Notification/coach quyết định khi nào gửi, gửi gì, hay im lặng | Reminder thành spam lịch cố định |
| Lapse Recovery Layer | Nhận diện bỏ cuộc tạm thời và đưa flow quay lại nhẹ | User mất streak rồi rời app luôn |
| Evidence Learning Layer | Telemetry, benchmark, usability, expert review, confidence ledger | Không có đường nâng claim lên 90%+ |

### 12.4 Fix các logic yếu trước khi thêm feature mới

| Logic yếu | Vì sao nguy hiểm | Fix đúng hướng |
|---|---|---|
| Streak hoặc progress dựa vào `calories > 0` | Thưởng log rác, làm sai weekly/adaptive | Dùng Day Completeness Contract |
| AI save nhanh khi món/portion chưa chắc | Tạo dữ liệu sai nhưng user tưởng đúng | Review-first + unsafe quick-save guard |
| Missing nutrient thành 0 | Làm sai chất lượng database và kết luận micronutrient | Missing-vs-zero contract 100% |
| Reminder lịch cố định | Dễ gây phiền, tăng opt-out | Decision engine + suppression + proximal outcome |
| Weekly review chỉ báo cáo số | User xem xong không biết làm gì | One-action coaching với accept/done/useful |
| Adaptive target chạy trên partial data | Có thể điều chỉnh sai, gây hại mục tiêu | Chỉ chạy khi đủ complete-day + trend + safety guard |
| Barcode không kiểm tra serving/source | Sai calories/macros dù scan đúng barcode | Label evidence + serving mismatch warning |
| Voice execute ngay khi parse thiếu đơn vị | Một câu tự nhiên có thể thành meal sai lớn | Draft review + clarification khi thiếu portion |

### 12.5 Lộ trình nâng cấp đề xuất

| Phase | Mục tiêu | Output cần có |
|---|---|---|
| P0-A Trust and Completeness | Làm sạch nền dữ liệu trước | Food Trust Contract, Day Completeness Contract, source/completeness UI spec |
| P0-B Fast Logging with Verification | Log nhanh nhưng không mù | Search/recent/voice/barcode/AI review spec, portion preset Việt, correction telemetry |
| P0-C Recovery and Decision Notifications | Kéo user quay lại đúng lúc | Lapse state machine, recovery flow, notification decision matrix, copy không shame |
| P0-D Weekly Action and Adaptive Safety | Feedback có ích và an toàn | Weekly one-action spec, adaptive target guardrails, expert review checklist |
| P0-E Benchmarks and Evidence | Nâng claim bằng dữ liệu thật | AI món Việt benchmark, barcode benchmark, usability 12 user, telemetry dashboard |

Thứ tự này quan trọng. Nếu làm AI/coach/adaptive trước khi có trust/completeness, app sẽ trông thông minh hơn nhưng dễ sai hơn.

### 12.6 Research chuyển thành quyết định sản phẩm

| Research mới bổ trợ | Điều học được | Quyết định cho EatFitAI |
|---|---|---|
| Food logging naturalistic study | User có thể thấy app dễ dùng nhưng vẫn không tiếp tục; lỗi lớn nằm ở match món, portion và thời gian log | UX phải đo long-term burden, không chỉ first-use satisfaction |
| Nutrition app barriers review | Rào cản chính: nhập liệu mất thời gian, database lỗi, thiếu trust, privacy/cost, không dùng được trong bối cảnh thật | Mỗi lane log phải có effort metric và trust metric |
| Effective engagement research | Usage không đồng nghĩa behavior change; cần đo engagement với hành vi | Thêm `weekly_action_done`, `complete_day`, `recovery_after_lapse`, `useful_feedback` |
| MySwissFoodPyramid adherence cohort | Tutorial, thời điểm bắt đầu và reminder liên quan adherence | Onboarding tối thiểu + reminder preference cần được đo như biến ảnh hưởng retention |
| Slip Buddy/OnTrack lapse work | Lapse là điểm can thiệp riêng, không chỉ "thiếu log" | Recovery flow là P0, không phải nice-to-have |
| Microsoft Human-AI Guidelines | AI phải nói rõ nó làm được gì, làm tốt đến đâu, và cho feedback/correction | AI scan/voice/coach cần capability + limitation + correction UX |
| Google PAIR explainability/trust | Trust cần được calibrate liên tục, không chỉ disclaimer đầu app | Source/confidence/explanation phải nằm trong flow save/review |
| Microsoft AI overreliance framework | Người dùng dễ over-rely nếu khó verify output | AI output phải có verification aids, không chỉ confidence badge đẹp |
| Nutrition5k | AI nutrition benchmark cần ground truth về ingredient, mass, calories/macros | Benchmark món Việt nên có subset cân/label thật, không chỉ class name |
| FDA/FAO/INFOODS food data quality | Food data luôn có tolerance, source và method limitation | App không được ngầm claim con số tuyệt đối; phải hiển thị source/completeness |

### 12.7 Đánh giá tiềm năng sau khi làm đúng plan

| Mảng | Hiện tại ước tính | Nếu hoàn tất P0-A đến P0-E và pass validation |
|---|---:|---:|
| Feature surface | 7.5-8.0/10 | 8.8-9.0/10 |
| Trust/data reliability | 6.3-6.8/10 | 8.6-9.0/10 |
| AI usefulness | 6.8-7.3/10 | 8.3-8.7/10 |
| UX cho user mới | 7.0-7.5/10 | 8.5-8.8/10 |
| Retention/recovery | 6.0-6.8/10 | 8.2-8.6/10 |
| Claim confidence | 65-85% tùy claim | 90-95% cho claim đã có evidence thật |

Đây là **target potential**, không phải điểm hiện tại. Chỉ được nâng điểm thật khi có benchmark, telemetry và usability pass.

### 12.8 Điều không nên làm trong plan gần nhất

- Không thêm AI chat tự do trước khi có trust/guardrail/retrieval/source.
- Không thêm micronutrient dashboard nếu database chưa có completeness.
- Không quảng bá AI scan là chính xác nếu chưa pass benchmark món Việt.
- Không gamify bằng streak phạt mất chuỗi.
- Không auto-adjust calories từ dữ liệu partial-heavy.
- Không build social/community trước khi diary reliability và safety copy đủ chắc.

---

## 13. Code Alignment Audit — Đề Xuất vs. Implementation Thực Tế

Mục tiêu phần này: đối chiếu 14 đề xuất cải thiện (từ Section 6-7 và 12) với code thực tế đã audit (`NutritionInsightService.cs`, `AiFoodMapService.cs`, `StreakService.cs`, `notificationService.ts`), xác định chính xác gap giữa roadmap và hiện trạng kỹ thuật.

Ngày audit: 2026-05-07.

### 13.1 Tóm tắt trạng thái triển khai

| Trạng thái | Số lượng | Tỷ lệ |
|---|---|---|
| ✅ Đã triển khai đúng | 2 | 14% |
| ⚠️ Có cơ sở nhưng thiếu logic quan trọng | 6 | 43% |
| 🔴 Chưa triển khai / Hoàn toàn thiếu | 6 | 43% |

Kết luận: **86% đề xuất** cần code mới hoặc sửa logic đáng kể. Tài liệu roadmap không chỉ đề xuất tính năng mới — phần lớn là sửa logic hiện có đang hoạt động nhưng chưa đủ chuẩn.

### 13.2 P0 — Chi tiết gap từng đề xuất

#### #1: Day Completeness Contract

> **Đề xuất:** Phân biệt `no-log` / `partial` / `complete` / `skipped` cho mỗi ngày

| Tiêu chí | Code hiện tại | Đánh giá |
|---|---|---|
| Phân biệt ngày có log vs không | `StreakService.cs:49` — chỉ check `lastLog == today` | ⚠️ Binary (có/không) |
| Partial day detection | Không có. `NutritionInsightService.cs:75` dùng `g.Sum(m => m.Calories)` nhưng không check số bữa tối thiểu | 🔴 Thiếu |
| Complete day definition | Không có constant/enum nào define "complete day" = 3 bữa chính | 🔴 Thiếu |
| Skipped with reason | Không có cơ chế "skip day" có lý do | 🔴 Thiếu |

**Trạng thái: 🔴 Chưa triển khai**

**Gap cần fix:**
- Thêm enum `DayCompletenessStatus { NoLog, Partial, Complete, Skipped }`
- Thêm logic: ngày có ≥3 bữa (sáng/trưa/tối) = `Complete`, 1-2 bữa = `Partial`
- `CalculateAdaptiveAdjustments` chỉ nên dùng ngày `Complete` để tính toán

#### #2: AI Confidence Gate — 3 Tiers

> **Đề xuất:** Low (<70%) / Medium (70-85%) / High (>85%), KHÔNG auto-save

| Tiêu chí | Code hiện tại | Đánh giá |
|---|---|---|
| Confidence threshold | `AiFoodMapService.cs:23` — `CatalogMinConfidence = 0.60m` | ⚠️ Có threshold nhưng chỉ 1 mức |
| 3-tier system | Không có. Mọi detection ≥0.60 đều được xử lý giống nhau | 🔴 Thiếu |
| Auto-save prevention | `AiFoodMapService` trả về `MappedFoodDto` → client quyết định save. **Nhưng không có flag `requiresConfirmation`** | ⚠️ Nửa vời |
| UI warning message | Không có field `confidenceLevel` hoặc `warningMessage` trong DTO | 🔴 Thiếu |

**Trạng thái: ⚠️ Có cơ sở nhưng thiếu logic quan trọng**

**Gap cần fix:**
- Thêm vào `MappedFoodDto`: `ConfidenceLevel` (enum: Low/Medium/High), `RequiresUserConfirmation` (bool)
- Logic: `<0.70` → Low + "Tôi không chắc, bạn kiểm tra giúp?" / `0.70-0.85` → Medium + "Có phải [tên]?" / `>0.85` → High + pre-fill
- Client-side: block auto-save khi `RequiresUserConfirmation = true`

#### #3: Food Trust Badge

> **Đề xuất:** `data_source` + `verification_status` + `completeness_score` cho mỗi food entry

| Tiêu chí | Code hiện tại | Đánh giá |
|---|---|---|
| CredibilityScore | `AiFoodMapService.cs:267` — `CredibilityScore = food.CredibilityScore` | ✅ Có field |
| data_source field | Không có field phân biệt USDA/FAO/manufacturer/user_created | 🔴 Thiếu |
| verification_status | Không có enum lab_verified/staff_verified/unverified | 🔴 Thiếu |
| completeness_score | Không có — `HasUsableNutrition()` (line 390) chỉ check binary có/không | 🔴 Thiếu |

**Trạng thái: ⚠️ Có cơ sở (CredibilityScore) nhưng thiếu 3/4 thành phần**

**Gap cần fix:**
- Thêm vào model `FoodItem`: `DataSource` (enum), `VerificationStatus` (enum), `CompletenessScore` (decimal 0-100)
- `CompletenessScore` = % nutrients có data thực (ví dụ: 8/12 macro+micro = 67%)
- Rule: `CompletenessScore < 50%` → warning badge + loại khỏi adaptive target input

#### #4: Notification Decision Engine (JITAI)

> **Đề xuất:** 4-component JITAI: decision points, intervention options, tailoring variables, decision rules

| Tiêu chí | Code hiện tại | Đánh giá |
|---|---|---|
| Schedule type | `notificationService.ts:280` — `SchedulableTriggerInputTypes.DAILY` fixed time | ⚠️ Fixed-schedule |
| Decision logic | Không có. Mọi notification fire theo giờ cố định bất kể user đã log hay chưa | 🔴 Thiếu |
| Suppress logic | Không có. Streak reminder (line 429) fire 21:00 HÀNG NGÀY kể cả khi đã log | 🔴 Thiếu |
| Outcome tracking | `trackEvent('weekly_review_notification_open')` (line 150) — chỉ track weekly review | ⚠️ Rất hạn chế |
| Quiet hours | Có field `quietHoursEnabled/From/To` (line 65-67) nhưng **KHÔNG có logic enforce** | 🔴 Thiếu |

**Trạng thái: 🔴 Chưa triển khai JITAI — chỉ có fixed-schedule**

**Gap cần fix:**
- Backend cần endpoint `/api/notifications/should-nudge` check: user đã log bữa nào hôm nay?
- Client-side: trước khi fire notification → call API hoặc check local state
- Suppress rule: IF 3 nudges bị ignore liên tiếp → suppress 24h
- Enforce quiet hours trong `scheduleDailyNotification()`

#### #5: Lapse Detection + Recovery Flow

> **Đề xuất:** 4 tiers: 1 ngày / 2-3 ngày / 4-7 ngày / 7+ ngày → message + action khác nhau

| Tiêu chí | Code hiện tại | Đánh giá |
|---|---|---|
| Lapse detection | `StreakService.cs:98` — `lastLog < today.AddDays(-1)` → reset về 0 | ⚠️ Chỉ phát hiện "đã bỏ" nhưng không phân tier |
| Tier system | Không phân biệt 1 ngày vs 7 ngày → tất cả đều reset streak = 0 | 🔴 Thiếu |
| Recovery message | Không có. `MEAL_MESSAGES.streak` (notificationService.ts:124) là message cố định | 🔴 Thiếu |
| Deep linking | Có `navigateToStatsWeeklyReview()` cho weekly review, nhưng **không có deep link cho recovery** | 🔴 Thiếu |
| Re-engagement flow | Hoàn toàn không có UI/logic cho "chào mừng quay lại" | 🔴 Thiếu |

**Trạng thái: 🔴 Hoàn toàn thiếu**

**Gap cần fix:**
- Backend: thêm `GetLapseTier(userId)` → return tier 1/2/3/4 dựa trên `(today - LastLogDate).Days`
- Mobile: khi mở app sau lapse → show recovery banner thay vì home screen bình thường
- Notification: message khác nhau theo tier (gentle → encouraging → one-shot)

#### #6: Adaptive Target Safety Gate

> **Đề xuất:** Minimum calorie floor, 14-day gate, weight trend smoothing, freeze khi data kém

| Tiêu chí | Code hiện tại | Đánh giá |
|---|---|---|
| Minimum data gate | `NutritionInsightService.cs:515` — `daysWithData >= 10` cho calorie, `>= 7` cho protein | ⚠️ Có nhưng dưới chuẩn (nên ≥14) |
| Calorie floor/ceiling | Không có `Math.Max(newCal, 1200)` hoặc tương tự | 🔴 Thiếu |
| Weight trend smoothing | Không dùng weight data — chỉ dựa trên intake history | 🔴 Thiếu |
| Data quality gate | Không check "complete day" — mọi ngày có data đều được dùng kể cả partial | 🔴 Thiếu |
| Auto-apply safeguard | Line 210: `request.AutoApply && confidence >= 75` → auto-apply target | ⚠️ Có gate 75% nhưng confidence formula naive |
| Contraindication check | Không check pregnant/adolescent/ED history trước khi adjust | 🔴 Thiếu |

**Trạng thái: ⚠️ Có cơ sở nhưng thiếu safety gates quan trọng**

**Gap cần fix:**
- Tăng minimum data gate: `daysWithData >= 14` (theo MacroFactor)
- Thêm calorie floor: `newCal = Math.Max(newCal, gender == Female ? 1200 : 1500)`
- Chỉ dùng "complete days" cho adaptive calculation
- Thêm flag `user.HasEDRisk` → nếu true → disable adaptive hoàn toàn

### 13.3 P1 — Chi tiết gap

#### #7: Onboarding "Value First"

| Tiêu chí | Code hiện tại | Đánh giá |
|---|---|---|
| Value-first pattern | Theo flow hiện tại: profile setup → rồi mới cho dùng app | 🔴 Ngược chuẩn |

**Trạng thái: 🔴 Chưa triển khai (cần audit UI thêm)**

#### #8: Weekly Review Refactor

| Tiêu chí | Code hiện tại | Đánh giá |
|---|---|---|
| Insight generation | `NutritionInsightService.cs:271-381` — sinh nhiều recommendations cùng lúc | ⚠️ Quá nhiều |
| Priority filtering | Có field `Priority` (high/medium/low) nhưng không limit số lượng trả về | ⚠️ Có filter nhưng không cap |
| Actionable instruction | Messages khá cụ thể (line 302-308) — đề xuất thực phẩm cụ thể | ✅ Tốt |
| Single action focus | Không có logic "chỉ trả 1 recommendation quan trọng nhất" | 🔴 Thiếu |

**Trạng thái: ⚠️ Có cơ sở tốt nhưng cần giới hạn output**

#### #9: Vietnamese Portion Catalog v1

| Tiêu chí | Code hiện tại | Đánh giá |
|---|---|---|
| Label mapping | `NormalizeSearchKey()` — hardcode `beef→thit bo`, `chicken→thit ga` | ⚠️ Rất hạn chế (2 entries) |
| Serving units | `LoadDefaultServingsAsync()` load từ DB `FoodServings` table | ✅ Có infrastructure |

**Trạng thái: ⚠️ Infrastructure sẵn sàng, content chưa đủ**

#### #10: ED Screening + Gentle Mode

| Tiêu chí | Code hiện tại | Đánh giá |
|---|---|---|
| ED screening | Không có field/question nào trong onboarding | 🔴 Thiếu |
| Gentle mode | Không có mode ẩn calorie/số liệu | 🔴 Thiếu |
| Contraindication flag | Không có `User.HasEDRisk` hoặc tương tự | 🔴 Thiếu |

**Trạng thái: 🔴 Hoàn toàn thiếu**

### 13.4 P2 — Chi tiết gap

| # | Đề xuất | Trạng thái | Ghi chú |
|---|---|---|---|
| 11 | User Segmentation | 🔴 Chưa có | `NutritionTarget` có target values nhưng thiếu `GoalType` enum |
| 12 | Long-term Retention | 🔴 Chưa có | Nằm ngoài scope 4 file đã audit |
| 13 | Telemetry Baseline | ⚠️ Có cơ sở | `trackEvent()` cho weekly review nhưng thiếu funnel/drop-off |
| 14 | Instruction BCT Content | ⚠️ Có inline tips | `GenerateRecommendations()` có đề xuất thực phẩm, nhưng thiếu content library |

### 13.5 Ma Trận Ưu Tiên Fix (Sprint Planning)

| Priority | Đề xuất | Effort | Impact | Sprint đề xuất |
|---|---|---|---|---|
| 🔴 P0 | #5 Lapse + Recovery | Medium | Very High | **Sprint 1** |
| 🔴 P0 | #6 Adaptive Safety | Low | Very High | **Sprint 1** |
| 🔴 P0 | #2 AI Confidence Gate | Low | High | **Sprint 1** |
| 🔴 P0 | #1 Day Completeness | Medium | High | **Sprint 2** |
| 🔴 P0 | #4 JITAI Notification | High | High | **Sprint 2-3** |
| ⚠️ P0 | #3 Food Trust Badge | Medium | Medium | **Sprint 3** |
| 🔴 P1 | #10 ED Safety | Low | High (legal) | **Sprint 2** |
| ⚠️ P1 | #8 Weekly Review | Low | Medium | **Sprint 3** |
| ⚠️ P1 | #9 VN Portion Catalog | High | High | **Sprint 3-4** |
| 🔴 P1 | #7 Onboarding | Medium | High | **Sprint 4** |
| ⚠️ P2 | #13 Telemetry | Medium | Medium | **Q3** |
| ⚠️ P2 | #14 Instruction BCT | Medium | Medium | **Q3** |
| 🔴 P2 | #11 User Segment | High | High | **Q3-Q4** |
| 🔴 P2 | #12 Retention | High | High | **Q4** |

### 13.6 Quick Wins (< 1 ngày dev mỗi item)

1. **Calorie floor** — thêm `Math.Max(newCal, 1200)` vào `CalculateAdaptiveAdjustments()`
2. **Data gate nâng lên 14** — đổi `daysWithData >= 10` → `>= 14`
3. **Confidence tiers** — thêm 2 fields vào `MappedFoodDto`
4. **Quiet hours enforce** — check time trước khi schedule notification
5. **Weekly review cap** — `recommendations.Take(1)` cho weekly context

### 13.7 3 rủi ro lớn nhất từ code audit

1. **Adaptive Target không có safety floor** → có thể suggest calorie nguy hiểm (< 1000 kcal)
2. **Recovery Flow = 0** → user bỏ app = mất vĩnh viễn, không có cơ chế kéo lại
3. **AI Confidence không phân tier** → user có thể tin vào detection sai mà không biết

### 13.8 Kết luận code alignment

> Roadmap đã đúng hướng — nhưng 86% đề xuất chưa có trong code hoặc thiếu logic quan trọng. Tài liệu này không chỉ là feature roadmap, mà là **technical debt roadmap** cho các feature hiện có. Trước khi thêm tính năng mới, cần fix 5 quick wins trong Sprint 1 và triển khai 3 contract P0 quan trọng nhất (#5 Lapse Recovery, #6 Adaptive Safety, #2 AI Confidence).

---

## Appendix A — Detailed Feature Improvements and Function Audit

Phần này giữ lại chi tiết gốc về các chức năng cần làm tốt, đề xuất thông minh theo từng chức năng, cải thiện triệt để từng feature, và quality audit AI/non-AI.

### 2. Những chức năng một app dinh dưỡng bình thường phải làm tốt

#### 2.1 Logging nhanh nhưng có kiểm soát

Một app dinh dưỡng tốt phải giúp user log trong vài giây, nhưng không đánh đổi accuracy:

- Recent foods, frequent meals, copy yesterday, meal templates.
- Barcode scan cho packaged foods.
- Photo scan cho món tự nấu/nhà hàng, nhưng phải có review.
- Voice/text logging cho câu tự nhiên tiếng Việt.
- Portion presets theo văn hóa Việt: `1 chén`, `1 tô`, `1 muỗng canh`, `1 ly`, `1 phần`, kèm grams ước tính.
- Quick-add 100g chỉ nên là shortcut, không phải default "đúng".

**Đề xuất cho EatFitAI:** thêm `confidence + source + portion review` vào mọi đường log nhanh. User phải hiểu món này đến từ catalog verified, OpenFoodFacts, AI map, hay user custom.

#### 2.2 Food database đáng tin hơn database lớn

Các tính năng nên có:

- Badge nguồn dữ liệu: `Verified`, `OpenFoodFacts`, `User submitted`, `AI estimated`.
- Completeness score: món có đủ calorie/protein/carb/fat chưa, có sodium/sugar/fiber không.
- Nutrition label compare flow cho barcode: chụp nhãn -> OCR -> so với provider -> user confirm.
- Correction workflow: user report sai; admin verify; giữ audit history.
- Alias tiếng Việt không dấu/có dấu/vùng miền: `pho bo`, `phở bò`, `pho`, `bún bò Huế`, `bun bo hue`.
- Duplicate merge: cùng barcode hoặc cùng món nhưng nhiều tên.

**Nguyên tắc:** với app dinh dưỡng, `verified small database` thường đáng tin hơn `huge crowdsourced database` nếu mục tiêu là trust.

#### 2.3 Portion estimation phải minh bạch

Sai số khẩu phần thường lớn hơn sai số công thức BMR. Vì vậy:

- Hiển thị grams mặc định và cho sửa ngay.
- Với AI scan, hỏi follow-up khi confidence thấp: "Tô này khoảng nhỏ/vừa/lớn?"
- Với món Việt, dùng serving presets thực tế: phở tô nhỏ/vừa/lớn, cơm chén, trứng quả, sữa hộp.
- Hiển thị range khi ước tính: `khoảng 430-560 kcal`, sau khi user confirm mới ghi số cụ thể.
- Lưu lịch sử portion user hay chọn để cá nhân hóa preset.

#### 2.4 Target phải adaptive, không phản ứng quá nhanh

Target nên có 2 tầng:

1. Initial target: formula deterministic bằng code, không nhờ Gemini tính số.
2. Adaptive target: mỗi 7-14 ngày điều chỉnh theo weight trend, logging adherence, và goal pace.

Guardrails:

- Không giảm target vì 1 ngày vượt calorie.
- Không tăng/giảm quá mạnh trong một tuần.
- Không target quá thấp; nếu user liên tục ăn dưới mức an toàn, chuyển sang cảnh báo nhẹ + khuyến nghị chuyên gia.
- Không dùng wearable calorie burn trực tiếp như "ăn bù" nếu chưa có smoothing/validation.

#### 2.5 Feedback phải giúp user hành động, không chỉ chấm điểm

Feedback tốt nên trả lời:

- Hôm nay còn thiếu gì?
- Bữa nào làm lệch mục tiêu nhất?
- Một lựa chọn thay thế cụ thể là gì?
- Tuần này trend tốt/xấu vì lý do nào?
- Nên giữ nguyên target hay điều chỉnh?

Feedback kém là chỉ nói "bạn vượt calorie" hoặc "hãy ăn lành mạnh hơn".

#### 2.6 Safety và mental health guardrails

Calorie tracking có thể hữu ích, nhưng cũng có thể làm nặng obsessive tracking ở nhóm nhạy cảm. App nên có:

- Không dùng ngôn ngữ shame/guilt.
- Không cổ vũ ăn quá ít, nhịn ăn cực đoan, hoặc bù trừ bằng tập luyện.
- Mode "gentle tracking": tập trung protein, rau, nước, regular meals, không nhấn mạnh calorie deficit.
- Warning nếu user nhập mục tiêu giảm cân quá nhanh.
- Nội dung "không dùng app này thay tư vấn y tế" rõ ràng.
- Tùy chọn ẩn calorie lớn, chỉ xem trend/quality score.

---

### 3. Đề xuất thông minh cho các chức năng hiện tại

#### 3.1 AI Scan: từ "detect món" thành "detect + verify + learn"

Hiện tại AI scan đã là điểm mạnh, nhưng cần tăng trust:

| Cải thiện | Lý do | Priority |
|---|---|---|
| Confidence label rõ: cao/vừa/thấp | User biết khi nào cần kiểm tra kỹ | P0 |
| Top-3 candidate thay vì chỉ top-1 | Giảm false positive gây mất niềm tin | P0 |
| Portion prompt sau detect | Portion sai có thể phá calorie estimate | P0 |
| "Không chắc, hãy nhập tay" thay vì đoán 0.05 confidence | Tránh AI hallucination | P0 |
| Teach/correct loop đo được | Biến user correction thành dataset quality signal | P1 |
| Evaluation set món Việt cố định | Mỗi lần đổi model phải biết false positive/recall | P1 |

Acceptance metrics:

- Top-1 accuracy theo nhóm món Việt.
- Top-3 accuracy.
- False-positive rate với ảnh không có đồ ăn.
- Tỷ lệ user sửa món sau AI scan.
- Tỷ lệ scan save thành công rồi diary readback đúng.

#### 3.2 Barcode: từ "quét được" thành "quét đáng tin"

Barcode đã có UI/API, phần cần làm tốt là reliability:

- Nếu OpenFoodFacts trả data thiếu macro, app phải báo thiếu thay vì ghi 0.
- Nếu provider data khác label do user chụp, ưu tiên label confirmed.
- Lưu `providerName`, `providerVersion/lastFetchedAt`, `verifiedAt`.
- Cho user sửa trước khi thêm vào diary.
- Cache barcode result có TTL và revalidation.

Acceptance metrics:

- Barcode lookup success rate.
- Provider unavailable rate.
- Tỷ lệ barcode result có đủ calorie + protein + carb + fat.
- Tỷ lệ user chỉnh nutrition sau barcode scan.

#### 3.3 Food Search và Diary: giảm friction hằng ngày

Tính năng nên bổ sung:

- Copy bữa hôm qua / copy ngày hôm qua.
- Meal template theo lịch: bữa sáng thường dùng, cơm văn phòng, gym meal.
- Bulk edit grams trong diary.
- "Forgot to log?" gentle reminder theo giờ ăn, không spam.
- Diary completeness score: ngày này có đủ bữa chưa, không phải score sức khỏe.
- Quick compare: hôm nay vs trung bình 7 ngày.

#### 3.4 Weekly Review: biến thành coach nhẹ

Weekly review đã có card, nên nâng cấp thành:

- Data quality trước, advice sau. Nếu user chỉ log 2/7 ngày thì không nên kết luận mạnh.
- Phân tách insight theo `calorie`, `protein`, `fiber/vegetable`, `water`, `logging consistency`.
- Một hành động nhỏ cho tuần tới, không quá 3 gợi ý.
- Deep link từ notification vào card weekly review.
- User feedback: "gợi ý này hữu ích / không hữu ích" để cải thiện prompt/rules.

#### 3.5 Nutrition Target: số deterministic, lời giải thích AI

Nên tách:

- Code tính số: BMR/TDEE/macro.
- AI giải thích: vì sao target như vậy, gợi ý thực đơn phù hợp.
- Validation: macro calories phải gần target calories.
- Audit: lưu formula version để sau này biết target cũ được tính bằng logic nào.

#### 3.6 Vietnamese nutrition quality

Đây là lợi thế cạnh tranh thực tế:

- Vietnamese dish taxonomy: nguyên liệu, món hoàn chỉnh, packaged food.
- Serving presets theo vùng miền.
- Common meal combinations: cơm + thịt kho + canh + rau.
- Synonym/diacritics engine.
- Verified Vietnamese food set làm benchmark.

---

### 16. Cải thiện triệt để theo từng chức năng hiện có

#### 16.1 AI Scan: từ camera tool thành meal capture assistant

Hiện AI scan có camera, preview, results, confidence guard, barcode lane, ingredient basket. Nên nâng tiếp:

- Trước scan: gợi ý chụp tốt nhưng ngắn, không tutorial dài.
- Trong lúc xử lý: nếu quá 3 giây, hiện "đang nhận diện, bạn có thể nhập voice/manual trước".
- Sau scan: luôn có 3 option: save exact, edit portion, save rough estimate.
- Nếu confidence thấp: không fail cứng; đưa top candidates + "không chắc" + search fallback.
- Nếu scan nhiều món: tạo basket theo từng món, hỏi khẩu phần từng món theo preset Việt.
- Nếu user sửa kết quả: lưu correction event và lần sau ưu tiên món/portion đó.
- Nếu ảnh không có đồ ăn: trả lời rõ "không thấy món ăn", không cố đoán.

KPI:

- `ai_scan_start_to_result_ms`.
- `ai_scan_result_to_saved_rate`.
- `ai_scan_user_correction_rate`.
- `ai_scan_low_confidence_deferral_rate`.
- `ai_scan_false_positive_negative_set`.

#### 16.2 Voice: lane nhanh nhất cho user Việt bận

Voice nên là "log như nói chuyện", nhưng vẫn cần review rõ:

- Support câu tự nhiên: "sáng nay ăn một tô phở bò, trưa cơm gà".
- Khi parse thiếu grams, hỏi nhanh: nhỏ/vừa/lớn hoặc dùng recent portion.
- Với món từng ăn: "giống lần trước không?" để giảm thao tác.
- Khi không chắc món: show 2-3 candidate, không tự save.
- Cho phép sửa bằng voice: "đổi cơm thành 1 chén rưỡi", "bỏ trà sữa".
- Nếu offline/API fail: giữ text draft, cho user save manual.

KPI:

- `voice_start_to_review_ms`.
- `voice_review_to_saved_rate`.
- `% commands needing manual correction`.
- `% voice drafts recovered after failure`.

#### 16.3 Food Search: phải thành search cá nhân, không phải database list

Tìm kiếm tốt cho app dinh dưỡng không chỉ là full-text:

- Rank theo recent/frequent, giờ ăn, meal type, user goal, và món Việt phổ biến.
- 1-tap add bằng portion lần trước.
- Search không dấu/có dấu/vùng miền.
- Badge source/trust ngay trong result.
- Nếu không tìm thấy: tạo quick custom dish hoặc gửi correction request.
- Empty state phải giúp làm tiếp: "Không thấy món? Ghi nhanh bằng voice hoặc tạo món riêng".

KPI:

- `food_search_submit_to_first_result_ms`.
- `food_search_zero_result_rate`.
- `food_search_result_to_add_rate`.
- `recent_food_one_tap_add_rate`.

#### 16.4 Diary: chống partial logging bằng UX, không chỉ backend rule

Diary cần cho user nói rõ trạng thái ngày:

- `Log đủ hôm nay`.
- `Còn thiếu bữa`.
- `Hôm nay ăn ngoài, chỉ log ước lượng`.
- `Bỏ qua ngày này`.
- `Không dùng ngày này để adaptive target`.

Tính năng nên bổ sung:

- Rough log: nhập tổng quan "cơm văn phòng, khá nhiều thịt, ít rau" để giữ habit, nhưng mark low-confidence.
- Meal completeness per meal: breakfast/lunch/dinner/snack logged/skipped/unknown.
- Smart copy: copy hôm qua nhưng hỏi "có giống khẩu phần không?"
- Bulk edit portion ngay trong diary.
- Draft state nếu đang sửa nhưng app background.

KPI:

- `complete_day_rate`.
- `partial_day_rate`.
- `rough_log_rate`.
- `copy_previous_day_to_complete_day_rate`.
- `diary_edit_abandon_rate`.

#### 16.5 Barcode: nhanh, nhưng phải xử lý missing data tử tế

Barcode flow nên ưu tiên "quét xong vẫn tin được":

- Nếu provider trả đủ macro: cho quick add + source.
- Nếu thiếu macro: không ghi 0; hỏi user chụp label hoặc nhập nhanh.
- Nếu product từng scan: cache local và hiện "đã dùng gần đây".
- Nếu package có serving size: hỏi user dùng bao nhiêu serving, không mặc định 100g.
- Nếu provider stale/unverified: hiển thị rõ.

KPI:

- `barcode_scan_to_result_ms`.
- `barcode_missing_macro_rate`.
- `barcode_user_edit_rate`.
- `barcode_cached_hit_rate`.

#### 16.6 Weekly Review: từ báo cáo thành coach có kế hoạch

Weekly review nên có cấu trúc:

1. Data quality: tuần này đủ dữ liệu để kết luận chưa?
2. One win: user đã làm tốt gì.
3. One friction: bữa/khẩu phần/logging nào gây lệch.
4. One action: tuần tới làm gì.
5. User feedback: hữu ích/không hữu ích.

Ví dụ:

- Nếu chỉ log 3/7 ngày: action là "tuần này cố log 5 ngày", không nói macro.
- Nếu đủ ngày nhưng protein thấp: action là "thêm 1 nguồn protein vào bữa sáng 3 ngày".
- Nếu hay bỏ bữa tối: action là "bật reminder bữa tối hoặc dùng copy hôm qua".

KPI:

- `weekly_review_open_rate`.
- `weekly_review_action_accept_rate`.
- `weekly_review_action_done_rate`.
- `weekly_review_feedback_helpful_rate`.

#### 16.7 Notification settings: từ toggle list thành accountability setup

Notification settings hiện có nhiều toggle nhưng chưa biến thành plan cá nhân. Nên đổi thành:

- "Bạn muốn app nhắc kiểu nào?" nhẹ/tiêu chuẩn/nghiêm túc.
- "Bạn thường ăn lúc nào?" để set meal windows.
- "Khi bạn bỏ log 2 ngày, app nên làm gì?" im lặng/nhắc nhẹ/đốc thúc.
- Từng category có channel/priority riêng: meal reminder, review, hydration, tips, rescue.
- Tips/AI suggestions mặc định low priority, không sound.
- Weekly review là actionable notification, tap vào đúng card.

Infrastructure note:

- Android notification channels cần tách category để user kiểm soát.
- Local notification nên chỉ schedule khi có value. Backend push chỉ cần về sau nếu muốn cross-device/accountability.

#### 16.8 Hạ tầng cho UX tối ưu

Để các chức năng không bất tiện, cần hạ tầng hỗ trợ:

| Hạ tầng | Vì sao cần |
|---|---|
| Local-first diary write queue | User log được ngay cả khi mạng yếu; sync sau |
| Cached recent/frequent foods | Search/add không phụ thuộc backend cho món quen |
| Draft recovery | App background/crash không mất meal đang nhập |
| AI async job state | Scan chậm vẫn không khóa màn hình |
| Telemetry funnel | Biết user bỏ ở bước nào thay vì đoán |
| Notification decision log | Biết notification nào gửi, bị suppress, mở, dẫn đến log không |
| Feature flags/A-B testing | Test reminder tone, onboarding length, rough log without breaking all users |
| Latency SLO dashboard | Tối ưu theo p75/p95 của flow thật |
| Cost guard cho AI | Không gửi Gemini/vision khi deterministic/local đủ dùng |

#### 16.9 Roadmap P0-P2 mới

**P0 - Giảm bỏ cuộc và giảm mất thời gian**

- Activation funnel: onboarding -> first log -> first complete day.
- One Job Today trên Home.
- Complete-day/partial-day states.
- Rough log và skip/unknown meal.
- Notification suppress/cooldown/quiet hours.
- Reminder deep link đúng meal flow.
- Latency telemetry cho search/add/voice/AI/barcode.

**P1 - Cá nhân hóa habit**

- Personalized meal windows.
- Recent portion defaults.
- Routine-based reminders.
- Streak repair/rescue flow.
- Weekly review action accept/done.
- Search ranking theo user history.
- AI/voice correction memory.

**P2 - Coaching nâng cao nhưng vẫn an toàn**

- 4-week guided roadmap in app.
- Adaptive target chỉ khi đủ complete-day + weight trend.
- Accountability mode opt-in.
- Optional social/accountability buddy sau khi safety policy rõ.
- Label OCR compare cho barcode.
- Vietnamese portion catalog + benchmark loop.

#### 16.10 Product principle mới

EatFitAI nên được đánh giá bằng câu hỏi:

> User có thể quay lại sau một ngày tệ, log lại trong dưới 60 giây, và nhận một bước kế tiếp có ích mà không thấy bị phán xét không?

Nếu câu trả lời là có, app sẽ đáng tin và có khả năng giữ người dùng hơn rất nhiều so với việc chỉ thêm thêm AI chat hoặc nhiều chart.

---

### 20. Quality audit từng chức năng: AI và non-AI, không tính fallback

Phần này đánh giá theo giả định user yêu cầu: **không tính fallback/offline/cache cứu nguy**. Nghĩa là nếu một chức năng được gọi là AI scan, voice, barcode, notification, weekly review, adaptive target... thì nó phải hoạt động như một chức năng chuyên nghiệp ở trạng thái bình thường.

Thang điểm ở đây là **pro-readiness**, không phải "có code hay chưa":

- 9-10: đủ chuẩn app chuyên nghiệp, đáng tin, đo được, ít rủi ro gây hiểu sai.
- 7-8: nền tốt, có guardrail, nhưng còn thiếu trust/UX/personalization.
- 5-6: chạy được nhưng logic còn naive; dễ tạo insight hoặc hành vi sai.
- 3-4: có bề mặt tính năng nhưng chưa đủ để user tin hoặc dùng lâu.
- 1-2: nên tắt hoặc làm lại trước khi coi là feature chính.

#### 20.1 AI feature scorecard

| AI feature | Điểm | Đã ổn | Điểm ngu/naive nếu đòi chuẩn pro | Chuẩn pro cần đạt |
|---|---:|---|---|---|
| AI scan món ăn bằng ảnh | 7.0 | Có image compression, telemetry, confidence, review guard, chặn quick-save khi low confidence/top-2 sát nhau/unmapped/missing nutrition | AI provider có recovery threshold rất thấp; chưa có benchmark món Việt; portion vẫn chủ yếu user nhập; nhiều món/món trộn dễ đoán sai; chưa giải thích vì sao AI chọn món | Benchmark Vietnamese dish set, top candidates + bbox, portion confidence, negative-case tests, correction memory, không quick-save nếu không đủ chắc |
| AI voice command/STT + parse | 6.5 | Có Gemini voice parse, rule parser, review threshold 0.75, intent ADD_FOOD/LOG_WEIGHT/ASK_CALORIES, confirm weight | Intent còn hẹp; command phức tạp/nhiều món dễ fail; execute threshold 0.5 thấp hơn review threshold; thiếu conversational repair; chưa có n-best parse/field confidence | Parse nhiều món, hỏi lại field thiếu, confidence theo food/meal/quantity, n-best candidates, user correction memory, command audit log |
| AI nutrition target lúc onboarding | 6.5 | Có flow tính target, telemetry start/result, lưu target, có profile/body metrics/goal/activity | Gắn nhãn "AI" hơi quá nếu phần lớn là formula; onboarding dài trước first value; thiếu giải thích formula/version/safety bounds | Formula/version rõ, explain "vì sao target này", safety limits, progressive onboarding, cho log bữa đầu trước khi hỏi quá nhiều |
| Adaptive target | 4.5 | Có API, current/suggested target, confidenceScore, apply target | Logic điều chỉnh về average intake đã log; confidence gần như `daysWithData * 7`; chưa dùng complete-day/weight trend; có thể reward underlogging/overeating; auto-apply nếu confidence >=75 | Chỉ chạy khi đủ complete-day + weight trend 7-14 ngày, cap kcal, không giảm protein vì user ăn thiếu, explain reason, pause/undo |
| Nutrition insights | 5.5 | Có average, adherence, recommendations, meal timing, macro distribution | Dựa vào average ngày có dữ liệu, chưa có day confidence/partial tracking guard; advice dễ chung chung; thiếu "one action" và usefulness feedback | Insight phải có data quality, confidence, 1 action nhỏ, accept/done/snooze, học từ feedback |
| Weekly AI review | 5.5 | Có trigger theo ngày log, dataQuality, confidence, review card/open/complete telemetry | `LastReviewDate` chưa persist; dataQuality không đo complete meal/day; confidence hardcoded cao ở nhiều branch; low-data copy hơi phán xét; chưa có action follow-up | Review history, complete-day gate, tone an toàn, 1 weekly action, action outcome, không kết luận mạnh khi data yếu |
| Recipe suggestions | 6.0 | Database-only matching, cache, ingredient mappings, user preference service, nutrition calculation từ recipe ingredients | Matching string/contains còn thô; chưa có pantry context, portion/serving realism, allergy/diet hard gate đủ mạnh; chưa chấm trust của recipe nutrition | Ingredient ontology, dietary/allergy hard constraints, serving validation, match reason, nutrition source/completeness |
| AI cooking instructions | 5.0 | Có endpoint Gemini, có cấu trúc ingredients, có UI recipe detail | Nếu LLM tạo hướng dẫn mà không gắn recipe chuẩn dễ hallucinate; chưa có food-safety/cooking-time validation; không nên coi là nutrition-critical | Dùng template/recipe DB làm source of truth, LLM chỉ diễn giải, kèm source, safety constraints |
| AI label map/teach correction | 6.5 | Có admin label map, minConfidence, correction events, unmapped labels stats | Chưa thành user-facing correction loop; chưa tự ưu tiên review theo nhiều correction; min confidence chưa gắn benchmark | Correction memory cá nhân, moderation queue, benchmark per label, rollback/changelog |
| AI/runtime health | 7.0 | Có healthz, Gemini runtime status, pool/failover info, AI availability guard | Chủ yếu phục vụ hệ thống; user chưa thấy "AI đang dùng dữ liệu nào/mức tin cậy nào" | User-facing AI trust state: model/source/confidence/cost/latency class, degraded explanation |

#### 20.2 Non-AI feature scorecard

| Chức năng thường | Điểm | Đã ổn | Điểm ngu/naive nếu đòi chuẩn pro | Chuẩn pro cần đạt |
|---|---:|---|---|---|
| Food search | 6.5 | Search catalog/user foods, recent foods, favorites, barcode prefill, add diary telemetry | Ranking chưa đủ cá nhân hóa theo giờ ăn/lịch sử/portion; thiếu source/completeness badge; search món Việt/alias vẫn cần benchmark | Personal ranking, Vietnamese alias/portion catalog, source badge, recent portion default, typo tolerance |
| Diary logging | 7.0 | Create/bulk/update/delete, copy previous day, compute macros server-side, recent tracking, source method | Không có day state no-log/partial/rough/complete/skipped; log một món nhỏ vẫn ảnh hưởng streak/review; chưa có rough log chính thức | Day completeness contract, rough/skipped/unknown state, bulk edit nhanh, confidence per entry/day |
| Barcode | 5.5 | Lookup DB trước, provider sau, save product unverified, barcode UI + telemetry | Provider missing nutrient bị default 0; chưa có completeness badge/last reviewed/label compare; serving size mismatch dễ làm sai | Missing-vs-zero contract, nutrient completeness, label OCR compare, source freshness, user correction |
| Common meals/templates | 6.5 | Có common meal templates, detail/apply/update/delete | Chưa học routine theo user; chưa có smart portion default; không phân biệt trust của từng ingredient | Suggested routines, meal bundles theo giờ/ngày, source confidence của ingredients, one-tap re-add |
| Custom dish/user food | 6.5 | Có create/update/delete user food/custom dish, hỗ trợ private data | Nếu user nhập sai thì app tin hoàn toàn; thiếu validation, label photo/source, reuse correction | User food validation, source/photo optional, nutrient completeness, personal verified badge |
| Onboarding | 6.0 | Profile/body metrics/goal/activity/target weight, telemetry, target calculation | Quá nhiều bước trước first-log; AI animation có thể tạo cảm giác "đang thông minh" hơn thực tế; chưa progressive | Activation-first onboarding, first-log dưới 2 phút, ask notification sau value, explain target |
| Notifications/reminders | 4.5 | Có settings nhiều loại, schedule meal/water/AI/streak/weekly, weekly deep link, Android channel | Fixed time cho mọi user; quiet hours có field nhưng chưa là decision rule; không kiểm bữa nào thiếu; không đo sent->log outcome đủ | JITAI decision engine, personalized meal windows, suppression/cooldown, notification budget, outcome tracking |
| Streak/gamification | 4.0 | Có current/longest streak, achievements, weekly logs | Streak dựa vào any meal/calories >0; dễ thưởng log tượng trưng; có thể gây áp lực; không tách check-in/logging/complete-day | Separate check-in/logging/complete-day streak, streak repair, gentle/safety mode, không dùng streak cho adaptive logic |
| Stats/summary | 6.0 | Có day/week/month summaries, charts, weekly review entry | Chart có thể tạo ảo giác chính xác nếu data thiếu; thiếu confidence/completeness overlay; chưa gắn action outcome | Summary kèm day confidence, partial/rough markers, trend ranges, action progress |
| Water tracking | 5.5 | Có water service/settings/reminder, đơn giản dễ dùng | Dễ biến 2000ml thành advice chung; thiếu cá nhân hóa theo thời tiết/activity/health condition; không nên ưu tiên hơn logging food | Treat as habit only, opt-in, flexible target, no medical claim |
| Weight/profile | 6.5 | Có profile, body metrics, weight history/update | Chưa thấy weight trend smoothing và outlier guard đủ rõ trong coaching/adaptive; target weight có thể tạo áp lực | Trend 7/14/28 ngày, outlier detection, safety copy, pause target adjustment |
| Auth/session | 7.0 | Token refresh, Google auth, email verify, stale session clearing | Không phải lõi nutrition UX; cần privacy messaging cho health data rõ hơn | Health data privacy controls, export/delete data, consent clarity |
| Telemetry/offline cache | 7.0 | Có nhiều event, queue/cache, scan/voice/onboarding/review events | Chưa đủ funnel duration/SLO/outcome; telemetry chưa thành product learning loop | Funnel: first log, complete day, notification->log, review->action, p75/p95 latency |
| Admin/data curation | 6.5 | Có verify food, credibility, admin label maps, audit | Trust field chưa thành UI; chưa có user report -> moderation queue -> changelog | Curation workflow, public source legend, correction priority, verified Vietnamese catalog |

#### 20.3 Chức năng nào đã ổn thật

Các phần sau có nền tốt và nên giữ, chỉ cần nâng chuẩn:

- **Diary core**: create/bulk/update/delete/copy/recent là xương sống ổn.
- **AI scan mobile guard**: đã biết chặn quick-save trong nhiều case rủi ro.
- **Voice review threshold**: có ý thức không execute mù khi confidence thấp.
- **Barcode DB-first/provider-second**: đúng hướng về cache và tránh gọi provider thừa.
- **Telemetry coverage**: đã có nhiều event đúng flow, có thể nâng thành funnel.
- **Admin credibility/verified fields**: data model có mầm trust layer.
- **Onboarding telemetry**: biết đo calculation và completion.

#### 20.4 Chỗ "ngu" nhất nếu đánh chuẩn chuyên nghiệp

Đây là các điểm nên gọi thẳng vì dễ làm app mất trust:

1. **Adaptive target điều chỉnh theo average logged intake**
   Nếu user log thiếu, app có thể tưởng user ăn ít. Đây là lỗi logic nghiêm trọng nhất vì nó biến dữ liệu yếu thành mục tiêu mới.

2. **Missing nutrient = 0 trong barcode/provider food**
   Thiếu protein/sodium/fat mà biến thành 0 là sai ngữ nghĩa. Pro app phải phân biệt "không có" và "không biết".

3. **Streak dựa vào calories > 0 / bất kỳ meal log**
   User log 1 món nhỏ vẫn giữ streak, nhưng ngày đó không đủ cho review/adaptive. Đây là gamification sai mục tiêu.

4. **Notification fixed-time không biết user đã làm gì**
   Nhắc 21:00 "giữ streak" mà không biết thiếu bữa nào hoặc user đã ignore bao nhiêu lần là kiểu reminder dễ gây phiền.

5. **Weekly review tự tin khi data quality chưa đủ sâu**
   Có dataQuality nhưng chưa đo complete-day, meal completeness, rough/AI share, missing nutrients. Review chuyên nghiệp phải nói "dữ liệu chưa đủ" trước khi khuyên.

6. **AI scan recovery threshold quá thấp nếu coi là tính năng chính**
   Recovery có thể hữu ích để không trả rỗng, nhưng theo yêu cầu "không tính fallback", một AI scan pro không nên dựa vào tín hiệu 0.05 để tạo cảm giác nhận diện được.

7. **Nutrition insight còn quá macro/calorie-centric**
   App dinh dưỡng chuyên nghiệp cần đưa nutrition quality theo mức dữ liệu đủ tin: fiber, sodium, added sugar, saturated fat, protein consistency, nhưng không show khi data thiếu.

#### 20.5 Những thứ không nên bị hiểu nhầm là đã pro chỉ vì có UI

- Có nút AI scan không có nghĩa AI scan đáng tin.
- Có barcode không có nghĩa sản phẩm đúng nutrition.
- Có weekly review không có nghĩa review có giá trị.
- Có notification settings không có nghĩa reminder thông minh.
- Có streak không có nghĩa user đang duy trì hành vi tốt.
- Có target adaptive không có nghĩa target thật sự cá nhân hóa.
- Có chart không có nghĩa dữ liệu đủ chắc để kết luận.

#### 20.6 Chuẩn chuyên nghiệp tối thiểu cho từng nhóm

Nếu chốt tiêu chuẩn pro trước khi build tiếp, mỗi nhóm phải đạt:

| Nhóm | Chuẩn tối thiểu |
|---|---|
| AI | Có confidence, reason, review gate, correction memory, benchmark, không auto-save dữ liệu yếu |
| Food data | Có source, verified state, completeness, missing-vs-zero, last reviewed, report issue |
| Logging | Dưới 60 giây cho món quen, dưới 2 phút cho user mới, có rough/skipped/partial state |
| Coaching | Chỉ 1 action nhỏ, gắn data quality, có accept/done/snooze/useful feedback |
| Reminder | Personalized, suppress nếu user đã làm, quiet hours, cooldown, outcome tracking |
| Gamification | Thưởng hành vi đúng, không thưởng dữ liệu rác, có gentle/safety mode |
| Metrics | Đo time-to-log, complete-day, notification->log, review->action, correction reuse, trust score |

#### 20.7 Kết luận audit chức năng

EatFitAI hiện không thiếu feature. Vấn đề chính là nhiều feature đã có **bề mặt chức năng**, nhưng chưa có **contract chất lượng**.

Nếu muốn app chạy chuẩn chuyên nghiệp, ưu tiên không phải thêm thêm AI mới, mà là nâng 6 contract:

1. Food Trust Contract.
2. Day Completeness Contract.
3. AI Confidence Contract.
4. Notification Decision Contract.
5. Weekly Action Contract.
6. Adaptive Target Safety Contract.

Làm 6 contract này xong thì các chức năng hiện tại sẽ bớt "ngu" rất nhiều, vì chúng không còn hoạt động rời rạc nữa mà cùng phục vụ mục tiêu: **log nhanh, dữ liệu đáng tin, nhắc đúng lúc, coaching có hiệu quả**.

---

---

## Appendix B — Research Evidence, UX, Trust, and User Flow Notes

Phần này giữ lại research trace theo các vòng đã bổ sung: evidence matrix, đối chiếu EatFitAI, naive-risk, UX mobile/habit/retention, lộ trình user, app chuyên nghiệp, JITAI/reminder, và nutrition information.

### 4. Research evidence matrix

| Evidence | Ý nghĩa với EatFitAI | Product implication |
|---|---|---|
| Dietary self-monitoring là thành phần trung tâm trong behavioral weight loss; hiệu quả phụ thuộc engagement/adherence. | App nên tối ưu logging streak, low friction, reminder nhẹ, weekly review. | Đo `logged_days_per_week`, không chỉ đo số feature AI. |
| SMARTER RCT: self-monitoring tools tạo weight loss có ý nghĩa trong cả hai nhóm, nhưng tailored feedback không vượt SM-only; message engagement liên quan tới adherence/weight loss. | Feedback chỉ hiệu quả nếu user đọc và hành động. | Weekly insight/push phải ngắn, cụ thể, đo open/action rate. |
| App dietary records có validation limitations; nhiều sai số đến từ database, omission, portion size. | Accuracy không chỉ là model AI. | Food verification, portion review, source label là P0 trust work. |
| Mifflin-St Jeor là baseline đáng dùng nhưng vẫn có sai số cá nhân. | Target ban đầu không nên được trình bày như chính xác tuyệt đối. | Dùng "estimated target", sau đó adaptive adjustment. |
| NIH Body Weight Planner dựa trên mô hình dynamic weight change, không giả định static 3500 kcal/lb đơn giản. | Weight trend cần feedback loop, không target tĩnh. | Adaptive TDEE 7-14 ngày là hướng đúng. |
| Photo-based tracking có thể giảm burden, nhưng calorie tracking truyền thống trong 2SMART liên quan weight loss rõ hơn photography-only. | AI photo không nên thay hoàn toàn diary review. | Scan -> review -> confirm portion -> save. |
| Calorie tracking có rủi ro với nhóm có eating disorder/disordered eating. | App cần safety mode, guardrails, và ngôn ngữ không gây shame. | Gentle mode, low-calorie warning, referral copy. |
| WHO/DGA nhấn mạnh dietary pattern: real/whole foods, rau quả, whole grains/legumes/nuts, hạn chế sodium/free sugars/saturated/trans fats. | App không nên chỉ optimize calorie/macro. | Thêm food quality signals và weekly pattern insight. |

---

### 9. Research vòng 2-4 và đối chiếu song song với EatFitAI

Phạm vi bổ sung ngày `2026-05-07`: research thêm theo 4 hướng: effectiveness/adherence, AI/photo/database accuracy, adaptive targets/behavioral coaching, safety/localization Việt Nam. Kết luận dưới đây đối chiếu với source code/docs hiện tại, không yêu cầu sửa code trong tài liệu này.

#### 9.1 Vòng 2 — Hiệu quả thật đến từ adherence + feedback

Các systematic review/RCT gần đây không phủ nhận giá trị app dinh dưỡng, nhưng cũng không ủng hộ claim "cài app là giảm cân". Evidence mạnh nhất vẫn là:

- User phải tự theo dõi đủ đều.
- Feedback phải cá nhân hóa vừa đủ, ngắn, có hành động.
- App phải giảm burden logging, vì logging thủ công là điểm rơi retention.

**Đối chiếu EatFitAI:**

| Năng lực | EatFitAI hiện tại | Đánh giá thực tế |
|---|---|---|
| Diary logging | Đã có diary, search, AI scan, voice, barcode, common meals, copy hôm qua. | Nền tốt hơn mức "app bình thường"; việc cần làm là giảm lỗi dữ liệu và đo retention/adherence. |
| Weekly review | Đã có backend `AIReviewController`, mobile `StatsScreen` card với `confidence`, `dataQuality`, `weekly_review_open`, `weekly_review_complete`. | Đúng hướng evidence. Cần rule cứng: nếu log ít ngày thì chỉ nhắc logging, không kết luận mạnh về dinh dưỡng. |
| Feedback | Đã có insight/recommendation, nhưng một số advice vẫn chung chung. | Cần chuyển từ "bạn thiếu/dư" sang "tuần tới làm 1 việc cụ thể", tối đa 1-3 action. |

**Product decision:** KPI chính không nên là số lần AI scan, mà là `logged_days_per_week`, `meal_log_completion`, `weekly_review_open_rate`, `weekly_action_done_rate`, và `correction_rate`.

#### 9.2 Vòng 3 — AI photo/barcode/database: trust là feature chính

Image-based dietary assessment vẫn chưa đủ chính xác để tự động hóa hoàn toàn, đặc biệt ở phần khẩu phần. Các app lớn đang xử lý bằng cách biến AI thành gợi ý: MyFitnessPal Meal Scan dùng computer vision để gợi ý món verified từ database; Cronometer nhấn mạnh database/nutrient coverage; MacroFactor nhấn mạnh tracking nhất quán để thuật toán hoạt động đúng.

**Đối chiếu EatFitAI:**

| Năng lực | EatFitAI hiện tại | Gap cần ghi vào roadmap |
|---|---|---|
| AI scan | Đã có confidence, quick portion, review flow, quick-save khi 1 match đủ tin cậy. | Cần source label + top candidates rõ hơn + low-confidence deferral thay vì cố đoán. |
| Barcode | Đã có `captureLane='barcode'`, backend `GET /api/food/barcode/{barcode}`, `BarcodeLookupResultDto.Source/ProviderName`, OpenFoodFacts provider. | Cần completeness badge, provider freshness, TTL/revalidation, và label-compare/OCR về sau. |
| Food trust | Backend có `IsVerified`, `VerifiedBy`, `CredibilityScore`, admin verify. | Cần expose trust badge ra UI/contract, phân biệt `Verified`, `Provider`, `AI estimated`, `User custom`. |
| Vietnamese dataset | Đã có tên có dấu/không dấu, món Việt seeded, serving helper. | Cần benchmark cố định món Việt + regional aliases + khẩu phần Việt chuẩn hóa. |

**Product decision:** Tăng độ tin cậy không phải là "thêm model AI lớn hơn" trước, mà là `food source label`, `portion confirmation`, `data completeness`, `correction workflow`, và `Vietnamese benchmark`.

#### 9.3 Vòng 4 — Adaptive target: đã có, nhưng cần guard chống partial tracking

EatFitAI đã có adaptive target ở backend/mobile:

- Mobile `NutritionInsightsScreen` gọi `aiService.getAdaptiveTarget({ analysisDays: 14 })` và chỉ hiện khi confidence đủ.
- Backend `NutritionInsightService.GetAdaptiveTargetAsync()` tính confidence theo số ngày có dữ liệu và đề xuất target mới.
- Có endpoint apply target.

Điểm cần cẩn thận: logic hiện tại chủ yếu điều chỉnh theo **trung bình intake đã log**, chưa thấy dùng đủ `weight trend` như bằng chứng dynamic energy balance khuyến nghị. MacroFactor công khai cảnh báo partial nutrition tracking là "Achilles heel": nếu log bữa sáng/trưa nhưng quên bữa tối, thuật toán sẽ tưởng intake thấp và có thể ước tính sai.

**Đối chiếu EatFitAI:**

| Rủi ro | Vì sao quan trọng | Cách đánh giá trong roadmap |
|---|---|---|
| Partial logging | User log thiếu bữa làm average calories thấp giả tạo. | Thêm `day_completeness_score`; nếu thấp thì pause adaptive recommendation. |
| Không có weight trend | Intake alone không biết user đang giảm/tăng/giữ cân thật. | Chỉ cho target adjustment mạnh khi có đủ cân nặng 7-14 ngày. |
| Target đổi quá nhanh | Dễ mất trust và có rủi ro ăn quá ít. | Cap thay đổi kcal/tuần, ghi lý do, không auto-apply mặc định. |
| Macro calories mismatch | Protein/carb/fat có thể lệch tổng kcal. | Add invariant: `protein*4 + carb*4 + fat*9` gần target calories. |

**Product decision:** Adaptive target nên là "coach đề xuất có bằng chứng dữ liệu", không phải auto-correct dựa trên vài ngày log chưa đầy đủ.

#### 9.4 Vòng 5 — Safety + localization Việt Nam

Research về diet/fitness apps và disordered eating cho thấy cần guardrail. Systematic review năm 2025 ghi nhận app users có xu hướng có disordered eating symptomology cao hơn non-users, nhưng chưa kết luận nhân quả. Nghiên cứu lâm sàng về MyFitnessPal trong nhóm có eating disorder cho thấy phần lớn người tham gia từng dùng app và nhiều người cảm nhận app góp phần vào triệu chứng. Điều này không nghĩa là calorie tracking xấu với mọi người, nhưng nghĩa là app phải có chế độ an toàn.

Với Việt Nam, research về nutrition transition cho thấy xu hướng tăng animal-source foods, processed products, và food-away-from-home. Nghiên cứu sodium tại Việt Nam nhấn mạnh muối, nước mắm, bột canh đóng góp lớn vào sodium intake. FAO/INFOODS cũng liệt kê bảng thành phần thực phẩm Việt Nam như nguồn dữ liệu cần tham chiếu.

**Đối chiếu EatFitAI:**

| Chủ đề | EatFitAI hiện tại | Gap thực tế |
|---|---|---|
| Safety language | Tài liệu đã có disclaimer; UI/app cần audit thêm. | Tạo `Nutrition Safety & Guardrails Policy`: không shame, không khuyến khích ăn quá ít, gentle mode. |
| Food quality | App mạnh macro/kcal hơn food quality. | Thêm insight về rau, protein source, đồ chiên, đồ ngọt, sodium-heavy condiments khi dữ liệu đủ. |
| Sodium Việt Nam | Chưa thấy là first-class signal. | Với món/nước chấm/packaged foods, nên chuẩn bị field/label sodium completeness. |
| Local serving | Có helper quick portions; cần dữ liệu chuẩn hơn. | Chuẩn hóa `1 chén`, `1 tô`, `1 muỗng canh`, `1 ly`, `1 phần` theo món và vùng miền. |

---

### 12. Research vòng 5-7: logic naive-risk cần gọi thẳng

Phạm vi bổ sung: đánh giá các logic/tính năng có vẻ "thông minh" nhưng dễ tạo kết quả sai, làm mất trust, hoặc khiến app giống một calorie tracker gây áp lực. Các điểm dưới đây không phải yêu cầu sửa code ngay; đây là backlog thực dụng để ưu tiên sau khi chốt contract.

#### 12.1 Adaptive target đang dễ "đuổi theo dữ liệu log", chưa đủ evidence để đổi mục tiêu

**Evidence:** dynamic calorie targets chỉ đáng tin khi có đủ weight trend và logging đủ đều. MacroFactor cũng cảnh báo partial tracking là điểm yếu lớn: log thiếu bữa làm thuật toán hiểu sai intake thật.

**Đối chiếu source:**

- `NutritionInsightService.GetAdaptiveTargetAsync()` tính trung bình calories/protein/carb/fat từ các ngày có diary.
- `CalculateAdaptiveAdjustments()` đổi target calories 20% về phía average intake nếu lệch >15% và có >=10 ngày dữ liệu.
- `confidence = daysWithData * 7`, chưa có `day_completeness`, chưa gắn weight trend, chưa kiểm tra user quên bữa tối.

**Rủi ro logic:** user đang muốn giảm cân nhưng ăn vượt target đều thì app có thể đề xuất tăng target; user log thiếu bữa thì app có thể tưởng intake thấp và đưa target sai. Đây là logic "thông minh giả" nếu không có guard.

**Hướng thực dụng:**

- Chỉ gợi ý adaptive target khi có `logged_days >= 10`, `complete_days >= 7`, và `weight_points >= 3`.
- Nếu thiếu completeness, hiển thị "Chưa đủ dữ liệu để chỉnh mục tiêu" thay vì đề xuất số mới.
- Dùng target adjustment theo weight trend: nếu cân đi đúng hướng, không chỉnh target dù intake lệch.
- Cap thay đổi: không quá 100-150 kcal/tuần, protein không giảm chỉ vì user chưa ăn đủ.
- Lưu `formulaVersion`, `adjustmentReason`, `inputDataQuality`.

#### 12.2 Weekly review có nền tốt nhưng trigger/history còn non

**Đối chiếu source:**

- `AIReviewService` đã có `dataQuality`, `confidence`, logged days gate.
- Nhưng `LastReviewDate = null // TODO: Track in DB`, nghĩa là logic bi-weekly/deep review chưa có lịch sử thật.
- `dataQuality` hiện chủ yếu dựa vào `DaysLogged/7` và 2 điểm cân nặng, chưa biết ngày đó log đủ mấy bữa.

**Rủi ro logic:** review có thể lặp, hoặc đưa kết luận mạnh cho ngày log không đầy đủ. Data quality 5/7 ngày vẫn có thể là 5 ngày chỉ log bữa sáng.

**Hướng thực dụng:**

- Thêm review history contract: `reviewGeneratedAt`, `acknowledgedAt`, `source`, `dataWindow`.
- `DaysLogged` phải tách thành `daysWithAnyMeal` và `completeDays`.
- Weekly review chỉ đưa nutrition conclusion khi `completeDays >= 4`; nếu thấp hơn thì chỉ coach logging.
- Recommendations phải traceable: mỗi gợi ý dẫn về bữa/món/thói quen cụ thể.

#### 12.3 AI scan quick-save đã guard khá tốt, nhưng recovery threshold 0.05 là điểm dễ mất trust

**Đối chiếu source:**

- Mobile `visionReview.ts` đã tốt: quick-save bị chặn nếu confidence <0.75, nhiều món, top-2 sát nhau, unmapped label, hoặc thiếu nutrition.
- Nhưng AI provider có `YOLO_RECOVERY_LABEL_MIN_CONFIDENCE` cho `beef/chicken` ở 0.05.

**Rủi ro logic:** ảnh mờ/không có đồ ăn vẫn có thể bị recovery đoán thành beef/chicken. Một false positive hài hước làm user nhớ lâu hơn 10 lần scan đúng.

**Hướng thực dụng:**

- Recovery pass nên ưu tiên "không chắc" hơn là "đoán bừa".
- Nếu giữ recovery, nâng threshold và bắt buộc review-only, không cho quick-save.
- Thêm negative benchmark: ảnh bàn trống, tay, bao bì, nước uống, background nhà bếp.
- Metric quan trọng: `false_positive_rate_non_food`, không chỉ top-1 accuracy trên ảnh đồ ăn.

#### 12.4 Barcode provider đang biến missing nutrient thành 0

**Evidence:** JMIR 2024 về app dinh dưỡng cho thấy missing nutrient và inconsistency là vấn đề lớn, nhất là saturated fat/cholesterol. CSPI cũng nhấn mạnh việc minh bạch source/completeness quan trọng hơn database to.

**Đối chiếu source:**

- `ParseProviderFoodItem()` dùng `?? 0m` cho calories/protein/carb/fat khi provider thiếu nutrient.
- Food từ provider được lưu DB với `IsVerified=false`, `CredibilityScore=50`, `ReliabilityScore=0.5`.

**Rủi ro logic:** "không có dữ liệu" bị hiển thị thành "0g/0kcal", làm sai diary và làm bẩn catalog nếu provider thiếu dữ liệu.

**Hướng thực dụng:**

- Phân biệt `missing` và `0` trong contract.
- Provider food thiếu calories hoặc macro chính nên vào trạng thái `needs_review`, không auto-trust.
- UI barcode cần badge: `Thiếu protein/carb/fat`, `Provider chưa đủ dữ liệu`, `Chưa verify`.
- Chỉ cho save khi user xác nhận hoặc nhập bổ sung label.
- Add `nutrientCompletenessScore`.

#### 12.5 Food trust field đã có nhưng chưa thành trải nghiệm trust

**Đối chiếu source:**

- Backend có `IsVerified`, `VerifiedBy`, `CredibilityScore`.
- Search/diary/AI scan hiện chưa thấy trust badge rõ theo source/completeness ở mọi flow.

**Rủi ro logic:** món verified, provider, AI estimated, user custom nhìn giống nhau. User không biết số nào nên tin.

**Hướng thực dụng:**

- Search result: hiển thị `Verified`, `Provider`, `User`, `AI estimated`, `Incomplete`.
- Diary entry giữ `sourceMethod` nhưng cần thêm source/nutrition quality ở entry-level.
- Admin verify phải có audit: ai verify, verify từ nguồn nào, ngày nào, version nào.
- Khi user sửa food, tạo correction event thay vì âm thầm overwrite.

#### 12.6 Không nên thêm "projected weight loss theo 1 ngày"

**Evidence:** CSPI gọi kiểu projected weight loss dựa trên calories consumed/burned trong một ngày là vô giá trị. Health tracking reviews cũng cảnh báo người dùng dễ xem con số app như quyền lực tuyệt đối.

**Đối chiếu EatFitAI:**

- Hiện chưa thấy feature này ở diary, tốt.
- `BodyMetricsScreen.getEstimatedCompletion()` có ETA dựa trên weekly rate mặc định nếu thiếu dữ liệu.

**Rủi ro logic:** nếu app biến 1 ngày tốt/xấu thành "ngày đạt mục tiêu" hoặc "x tuần nữa sẽ đạt", user dễ hiểu sai và mất động lực.

**Hướng thực dụng:**

- ETA chỉ hiện khi có weight trend đủ dài; nếu không, ghi "ước tính thô".
- Không dự báo theo một ngày intake.
- Dùng range: `khoảng 8-12 tuần`, không dùng ngày chính xác.

#### 12.7 Không nên eat-back calories từ wearable

**Evidence:** các systematic review/meta-analysis về wearable cho thấy energy expenditure từ consumer trackers có sai số đáng kể; dùng trực tiếp làm "calorie được ăn thêm" rất rủi ro.

**Đối chiếu EatFitAI:**

- Chưa thấy Health Connect/eat-back calories là core flow, đây là điểm nên giữ thận trọng.
- `CalorieRing` có prop `burned`, nhưng chưa nên biến nó thành ngân sách ăn bù tự động nếu dữ liệu chưa đủ chuẩn.

**Hướng thực dụng:**

- Dùng wearable cho trend vận động/steps, không dùng trực tiếp để cộng calories.
- Nếu có, chỉ cộng một phần nhỏ sau smoothing 7-14 ngày và phải có toggle.
- Hiển thị "activity trend" thay vì "bạn được ăn thêm X kcal".

#### 12.8 Water tracking 2L mặc định là tiện, nhưng không nên biến thành advice y tế

**Đối chiếu source:** water target hiện default khoảng `2000 ml`.

**Rủi ro logic:** mục tiêu nước phụ thuộc cân nặng, thời tiết, hoạt động, bệnh lý, thuốc, thai kỳ. 2L là shortcut UX, không phải kết luận cá nhân hóa.

**Hướng thực dụng:**

- Gọi là "mục tiêu mặc định", cho user sửa.
- Weekly review chỉ nhắc consistency, không chẩn đoán thiếu nước.
- Không đưa advice y tế về thận/tim/huyết áp.

#### 12.9 Safety mode không phải nice-to-have

**Evidence:** review 2025 về diet/fitness apps và review 2025 về health-tracking technologies đều cảnh báo calorie tracking có thể gắn với disordered eating, guilt/shame, và compulsive exercise ở nhóm nhạy cảm. Không thể kết luận nhân quả cho mọi user, nhưng đủ để cần guardrail.

**Đối chiếu EatFitAI:** tài liệu đã có disclaimer, nhưng roadmap cần biến thành product rule.

**Hướng thực dụng:**

- Onboarding hỏi nhẹ về mục tiêu/risk, không cần chẩn đoán.
- Gentle mode: ẩn deficit lớn, ưu tiên regular meals, protein, rau, nước, giấc ngủ.
- Copywriting không dùng shame: tránh "thất bại", "ăn sai", "bù lại bằng tập".
- Nếu target quá thấp hoặc weight loss pace quá nhanh, block/soft-block.

---

### 14. Research vòng 8-10: UX mobile, habit, retention, và anti-dropout

Phạm vi bổ sung: người dùng không rời app vì thiếu AI. Họ thường rời app vì phải nhập nhiều, không thấy giá trị ngay, notification phiền, database không tìm ra món quen, hoặc một ngày bỏ log làm họ thấy "mất chuỗi rồi thôi nghỉ luôn". Vì vậy roadmap cần chuyển từ "feature list" sang **habit system**.

#### 14.1 Evidence mới: app dinh dưỡng phải giảm effort trước khi tăng độ thông minh

Các nghiên cứu về nutrition app cho thấy vấn đề adoption/retention không có một đáp án chung. Barriers/facilitators trải từ mục tiêu cá nhân, motivation, routine, usability, food database, technical issues, data privacy, trustworthiness, cost, đến social environment. Điểm rất quan trọng: nutrition app khác fitness tracker vì food logging thường là **manual initiation**, cần user mở app, tìm món, ước lượng khẩu phần, rồi chờ feedback sau bữa ăn.

Hệ quả cho EatFitAI:

- Đừng bắt người mới hiểu hết app trong onboarding.
- Đừng bắt nhập chính xác ngay từ ngày đầu.
- Đừng để AI scan/barcode/voice là 3 lane rời rạc; tất cả phải quay về một "log meal in under 60 seconds" flow.
- Mọi feedback phải giúp user làm hành động kế tiếp, không chỉ đọc số.
- Local Vietnamese food + recent portion + repeat meal quan trọng hơn thêm một màn hình AI đẹp.

#### 14.2 Behavior science: cần kết hợp ability, prompt, feedback, reward

Các framework hữu ích:

- Fogg Behavior Model: hành vi xảy ra khi motivation, ability, và prompt gặp nhau đúng thời điểm. Nếu user không log, không mặc định là họ lười; có thể app làm ability thấp hoặc prompt sai lúc.
- COM-B: hành vi cần capability, opportunity, motivation. Với app dinh dưỡng, capability là hiểu món/portion; opportunity là mở app nhanh đúng lúc; motivation là thấy việc log có ích.
- Review về behavior change techniques trong mHealth cho thấy các BCT liên quan engagement lặp lại nhiều nhất là goal setting, self-monitoring, feedback, prompts/cues, rewards, social support.
- Review về feedback trong self-monitoring nhấn mạnh early + consistent engagement và feedback giúp user đặt goal, hiểu barrier, problem-solve.

**Chuyển thành product rule:** mỗi notification, AI card, weekly review, achievement, và empty state phải trả lời được 3 câu:

1. Nó làm hành động dễ hơn không?
2. Nó đến đúng thời điểm không?
3. Nó giúp user biết bước kế tiếp không?

#### 14.3 Notification: cần đốc thúc thông minh, không spam

Research về push notification cho mHealth cho thấy tailored push có thể tăng engagement gần sau notification, nhưng hiệu ứng không lớn nếu chỉ nhắc chung chung. Một micro-randomized trial trên 1255 users cho thấy tailored message làm user có khả năng engage trong 24 giờ cao hơn khoảng 3.9%; hiệu ứng thay đổi theo thời điểm/ngữ cảnh. Nghiên cứu khác trên 18,000 notification cho thấy content cũng quan trọng: user ít dùng app phản hồi tốt hơn với tailored suggestions, còn user dùng thường xuyên có thể phản hồi tốt hơn với insights.

**Đối chiếu EatFitAI hiện tại:**

- Đã có notification settings cho meal reminders, water, weekly review, streak risk, AI tips.
- Nhưng `notificationService.ts` hiện schedule nhiều giờ cố định: water 10:00, AI tips 08:30, AI recipes 11:00, streak 21:00.
- `quietHoursFrom/To` đã có trong settings UI, nhưng schedule logic hiện chưa dùng để chặn hoặc dời notification.
- Daily notifications dùng Android priority HIGH, dễ quá intrusive nếu áp cho tip/water/streak.
- Streak reminder 21:00 chưa kiểm tra user đã log đủ ngày hay chỉ thiếu bữa nào.

**Hướng đúng:** EatFitAI nên có `Notification Decision Engine`, không chỉ schedule cố định.

Rule tối thiểu:

- Suppress nếu user đã log bữa tương ứng.
- Suppress nếu user vừa mở app hoặc vừa log trong 60-120 phút.
- Respect quiet hours.
- Cooldown theo category: meal reminder, hydration, review, rescue.
- Gửi một việc nhỏ có thể làm ngay: "Log nhanh bữa tối bằng giọng nói" tốt hơn "Đừng quên log".
- Notification cần deep link đúng flow: bữa trưa vào Add meal lunch, weekly review vào weekly card, rescue vào quick rough log.
- User phải chọn được intensity: nhẹ, tiêu chuẩn, nghiêm túc. "Thúc ép" chỉ nên bật khi user opt-in.

#### 14.4 Gamification: streak hiện nên được đổi từ "có calories > 0" sang "habit integrity"

**Đối chiếu EatFitAI hiện tại:** `useGamificationStore` coi ngày đã log nếu `dailyCalories[date] > 0`. Điều này dễ tạo streak giả: user log 1 món nhỏ vẫn giữ chuỗi, nhưng ngày đó chưa đủ dữ liệu cho weekly review/adaptive target.

Nên tách 3 loại streak:

| Streak | Ý nghĩa | Khi nào tính |
|---|---|---|
| Check-in streak | User mở app hoặc xác nhận hôm nay vẫn theo dõi | Giữ motivation nhẹ, không dùng cho nutrition quality |
| Logging streak | Có ít nhất 1 meal logged | Tốt cho habit ban đầu |
| Complete-day streak | Đủ bữa hoặc user xác nhận "đã log đủ hôm nay" | Chỉ loại này dùng cho coaching/adaptive logic |

Nên có **streak repair**:

- Nếu bỏ 1 ngày: cho user log rough estimate hoặc mark "ngày nghỉ" để không cảm thấy mất hết.
- Nếu bỏ 2-3 ngày: chuyển sang restart plan, không nhắc "mất chuỗi".
- Nếu bỏ 7 ngày: onboarding lại nhẹ 30 giây: "Mục tiêu còn đúng không? Bạn muốn bắt đầu lại bằng bữa nào?"

Điểm quan trọng: streak để giúp quay lại, không để trừng phạt.

#### 14.5 Onboarding: đang setup mục tiêu tốt, nhưng thiếu time-to-value

**Đối chiếu EatFitAI hiện tại:** `OnboardingScreen` có nhiều bước: basic info, body metrics, goal, target weight, activity, AI calculate. Đây là đủ để tính target, nhưng có nguy cơ đặt quá nhiều form trước khi user cảm nhận giá trị.

Đề xuất:

- Tách onboarding thành `activation onboarding` và `progressive profile`.
- Lần đầu chỉ cần: mục tiêu chính, giới tính/tuổi/cân/cao nếu muốn target, giờ ăn thường ngày, tone nhắc nhở.
- Sau khi hoàn tất, đưa user vào ngay "log first meal" hoặc demo diary.
- Những thứ như activity detail, target weight nuance, dietary preference, reminder intensity, safety mode có thể hỏi sau khi user đã log 1-3 bữa.
- Không xin notification permission ngay khi chưa chứng minh giá trị. Nên xin sau khi user chọn "nhắc tôi bữa trưa/tối" hoặc sau first successful log.

Activation target nên đo:

- `onboarding_start_to_first_log_seconds`.
- `% users log first meal within first session`.
- `% users finish onboarding but do not log anything`.
- `% users grant notification permission after seeing value`.

#### 14.6 Mobile performance là một phần của nutrition adherence

Google Play/Android quality docs nhấn mạnh crash, ANR, battery/wakelock, startup, slow rendering và state preservation đều ảnh hưởng chất lượng app. Với app dinh dưỡng, performance không chỉ là kỹ thuật; mỗi giây chờ làm user bỏ log.

**Đối chiếu EatFitAI hiện tại:**

- Mobile đã có telemetry queue offline với batch flush, đây là nền tốt.
- AI scan đã compress ảnh trước upload, tốt cho latency/cost.
- Nhưng roadmap nên đặt UX SLO theo flow, không chỉ "test pass":

| Flow | SLO đề xuất | Fallback nếu chậm |
|---|---:|---|
| App cold start đến Home usable | p75 < 2.5s, p95 < 5s | Skeleton + last cached summary |
| Search recent/frequent food | p75 < 300ms | Local recent list trước, remote sau |
| Add known/recent food | p75 < 1s | Optimistic diary insert + sync queue |
| Voice parse | p75 < 3s, p95 < 8s | Show parsed text + manual confirm |
| AI scan result | p75 < 5s, p95 < 12s | Save photo draft + notify/result card later |
| Barcode lookup | p75 < 2s, p95 < 6s | Manual quick add + provider retry |
| Weekly review | p75 < 2s if cached | Show cached review + refresh quietly |

---

### 15. Lộ trình người dùng: từ người mới đến người đang bỏ cuộc

EatFitAI nên có một lộ trình hiển thị rõ trong app, không chỉ target kcal. Người dùng cần biết "tuần này tôi đang ở đâu, app muốn tôi làm gì, vì sao việc đó đáng làm".

#### 15.1 Lộ trình 4 tuần đề xuất

| Giai đoạn | Mục tiêu thật | App nên làm | Không nên làm |
|---|---|---|---|
| 0-10 phút đầu | User thấy app có ích ngay | Hoàn tất setup tối thiểu, log thử 1 bữa, thấy diary cập nhật | Bắt đọc tour dài, xin nhiều permission sớm |
| Ngày 1-3 | Tạo nhịp log | Quick add theo giờ ăn, recent/frequent, rough log, reminder nhẹ | Ép macro chính xác, chấm điểm khắt khe |
| Tuần 1 | Xây habit | Complete-day goal, weekly mini review, sửa portion thường ăn | Adaptive target mạnh, health advice sâu |
| Tuần 2 | Tăng accuracy | Portion preset cá nhân, barcode trust, food correction, copy meal | Đòi cân từng gram |
| Tuần 3 | Coach hành vi | 1-3 action nhỏ/tuần, "why this matters", user feedback | Dashboard quá nhiều số |
| Tuần 4+ | Điều chỉnh mục tiêu | Adaptive target nếu đủ complete days + weight trend | Tự động chỉnh nếu log thiếu |

#### 15.2 Journey khi user bỏ cuộc

Nên coi dropout là một flow chính thức:

| Tín hiệu | App nên hiểu | Action |
|---|---|---|
| Miss 1 meal | Bận hoặc quên | Nhắc đúng bữa, có nút "log ước lượng 30 giây" |
| Miss 1 day | Ngày chưa complete | Tối: hỏi "hôm nay muốn log nhanh hay bỏ qua có ghi chú?" |
| Miss 2-3 days | Risk dropout | Rescue card: "Bắt đầu lại bằng bữa gần nhất" |
| Miss 7 days | Goal/routine có thể không còn đúng | Mini re-onboarding 3 câu |
| Log nhiều nhưng không giảm/tăng theo goal | Target/portion có thể sai | Weekly review hỏi portion/weight trend, không blame |
| User hay sửa AI/barcode | Model/db mismatch | Ưu tiên recent correction, giảm confidence lane đó |

Notification copy nên theo bậc:

| Intensity | Ví dụ copy | Dùng khi |
|---|---|---|
| Nhẹ | "Bạn chỉ cần log 1 bữa hôm nay là đủ giữ nhịp." | User mới, gentle mode |
| Tiêu chuẩn | "Bữa tối chưa có trong nhật ký. Log nhanh bằng giọng nói?" | User có routine ổn |
| Nghiêm túc opt-in | "Bạn đặt mục tiêu nghiêm túc. Hôm nay còn 1 bữa chưa log, mất 30 giây để giữ dữ liệu tuần này." | User bật accountability |
| Rescue | "Không cần hoàn hảo. Bắt đầu lại bằng bữa gần nhất." | Miss 2-7 ngày |

Không dùng copy kiểu "thất bại", "ăn sai", "phá chuỗi", "bù lại bằng tập".

#### 15.3 One Job Today

Home screen nên có một vùng "việc quan trọng nhất hôm nay" dựa trên trạng thái:

| State | One job |
|---|---|
| Chưa log gì, đang giờ ăn | Log bữa hiện tại |
| Đã log 1 bữa, thiếu nhiều | Log bữa còn thiếu hoặc mark skipped |
| Đã log đủ bữa nhưng thiếu portion confirmation | Xác nhận khẩu phần 1 món rủi ro cao |
| Tuần thiếu dữ liệu | Hoàn tất hôm nay, không kết luận nutrition |
| Đủ data tuần | Xem weekly action |
| Bỏ app vài ngày | Restart bằng rough log |

Điều này làm app dễ tiếp cận hơn vì người mới không phải tự hiểu tab nào cần mở.

---

### 18. Research vòng 11-13: app chuyên nghiệp tối ưu trust, smartness, và convenience như thế nào

Vòng research này tập trung vào câu hỏi: các app dinh dưỡng chuyên nghiệp làm gì để user **tin dữ liệu**, **log nhanh**, và **cảm thấy app thông minh nhưng không gây phiền**?

Kết luận ngắn: app tốt không chỉ có database lớn hoặc AI scan. App tốt có một **trust architecture**: mọi con số đều có nguồn, độ đầy đủ, mức tin cậy, và cách sửa sai. Đồng thời có một **convenience architecture**: user log bữa lặp lại trong vài giây, có fallback khi AI không chắc, và có coaching dựa trên dữ liệu đủ tốt.

#### 18.1 Những pattern đáng học từ app chuyên nghiệp

| App/nguồn | Pattern mạnh | Vì sao tạo trust/convenience | Bài học cho EatFitAI |
|---|---|---|---|
| Cronometer | Curated database, source icons, NCCDB/USDA/CRDB tags, data confidence score | User biết entry nào lab-analyzed, entry nào chỉ có label, nutrient nào đang thiếu | Không chỉ hiện calories; phải hiện source + completeness + confidence theo từng nutrient/entry |
| MyFitnessPal | Check mark cho entry đã review/added; Meal Scan gợi ý verified foods; manual search trong scan flow | Trust badge giúp lọc dữ liệu, nhưng MFP cũng thừa nhận verified vẫn có thể sai | Trust badge phải đi kèm "report issue", last reviewed, và không hứa tuyệt đối |
| MacroFactor | Weight trend + nutrition log để hiệu chỉnh expenditure; giải thích algorithm; adherence-neutral; weekly check-in | User tin hơn vì hiểu app dùng dữ liệu nào, không phạt khi lệch target | Adaptive target của EatFitAI phải minh bạch: cần complete-day + weight trend + lý do điều chỉnh |
| Noom | Color system theo calorie density/nutritional value, no restrictive rules, daily lesson | Đơn giản hóa lựa chọn thay vì bắt user đọc toàn bộ macro/micronutrient | Có thể thêm "food guidance label" nhẹ, nhưng phải nói là guideline, không phải phán xét |
| Fooducate | Food grade A-D, pros/cons, healthier alternatives | Biến nutrition label phức tạp thành insight có thể hành động | Với barcode, EatFitAI nên cho "vì sao món này ổn/chưa ổn" và gợi ý thay thế thực tế |
| Lose It | Barcode/photo logging, suggestions, Siri shortcut/quick action | Giảm số tap và giúp log khi user bận | EatFitAI cần shortcut logging: recent meal, voice, rough add, copy, deep link từ notification |
| FatSecret Platform | Verified localized country datasets, daily updates, no duplicate claim, NLP/image recognition, allergen/diet preference | Trust đến từ coverage địa phương + update process + structured API | Với Việt Nam, lợi thế không phải database to nhất mà là localized Vietnamese food trust loop |
| USDA FoodData Central | Public API, data type documentation, Foundation/SR/FNDDS/Branded data | Nguồn chính thống, có metadata và data type rõ | Mỗi source nên được phân tầng: official/lab, curated, provider label, user private, AI estimate |

#### 18.2 Trust architecture nên có cho EatFitAI

Một app dinh dưỡng đáng tin nên coi mỗi food entry như một record có "hộ chiếu dữ liệu", không phải chỉ là tên + calories.

**Trust fields nên có trên mỗi food/diary entry:**

| Field | Ý nghĩa cho user | Cách dùng trong app |
|---|---|---|
| `source_type` | Dữ liệu đến từ đâu | Official/lab, curated Vietnamese DB, provider barcode, user custom, AI estimate |
| `source_name` | Nguồn cụ thể | FAO/INFOODS Vietnam, USDA, NCCDB, OpenFoodFacts, brand label, user correction |
| `verified_state` | Đã review chưa | Verified, curated, unverified, private, needs_review |
| `last_reviewed_at` | Có bị cũ không | Cảnh báo nếu barcode/restaurant item quá lâu chưa refresh |
| `nutrient_completeness` | Có đủ nutrient không | Ví dụ calories/protein/carb/fat đủ, nhưng sodium/fiber/micronutrient thiếu |
| `missing_fields` | Thiếu gì | Không cho missing bị hiểu thành zero |
| `confidence_score` | App chắc đến đâu | Dùng cho AI scan/voice/barcode matching/search ranking |
| `user_confirmed` | User đã xác nhận khẩu phần chưa | Chỉ entry đã confirm mới dùng mạnh trong weekly/adaptive logic |
| `correction_history` | Có từng bị sửa không | Học portion/user preference, tăng trust với món hay dùng |

**Nguyên tắc UI:** không cần show hết như bảng kỹ thuật. Chỉ cần 3 lớp:

1. Badge nhỏ: `Đã kiểm chứng`, `Từ nhãn`, `Ước tính AI`, `Thiếu sodium`, `Cần xác nhận`.
2. Tap vào badge -> bottom sheet giải thích nguồn, completeness, last reviewed, cách sửa.
3. Weekly/adaptive target dùng trust score ngầm để quyết định nên kết luận mạnh hay chỉ nhắc log tốt hơn.

#### 18.3 Data Confidence giống Cronometer, nhưng bản phù hợp EatFitAI

Cronometer làm rất tốt ở điểm không giấu thiếu dữ liệu. EatFitAI nên học nguyên tắc này và Việt hóa thành **Độ tin cậy dữ liệu hôm nay**.

Không nên chỉ tính:

- Hôm nay user ăn 1800 kcal.
- Protein 90g.
- Carb 210g.

Nên tính thêm:

- 1800 kcal, confidence 82%.
- Protein 90g, confidence 76%.
- Sodium chưa đủ tin vì 3/5 món thiếu sodium.
- AI scan chiếm 45% calories hôm nay, 2 món chưa confirm khẩu phần.
- Ngày này là `partial`, không dùng để điều chỉnh target.

Điều này giải quyết một lỗi rất lớn của app dinh dưỡng: user thấy con số có vẻ chính xác, nhưng thực ra dữ liệu thiếu hoặc ước tính. Trust tốt không phải lúc nào cũng "số đúng tuyệt đối"; trust tốt là app nói rõ **mức chắc chắn**.

#### 18.4 Barcode trust: professional pattern

Research barcode apps cho thấy năng lượng/calorie thường có coverage tốt hơn micronutrient; nutrient khác có thể thiếu hoặc sai nhiều giữa app. Vì vậy barcode không nên được xem là "đã scan là đúng".

Flow barcode nên là:

1. Scan barcode.
2. Match product.
3. Hiện serving size + calories/macros nổi bật.
4. Hiện badge: source/provider, verified state, last reviewed, nutrient completeness.
5. Nếu thiếu field quan trọng: hiện "thiếu dữ liệu" thay vì auto 0.
6. Cho user chụp nutrition label để compare/OCR nếu nghi ngờ.
7. Nếu user sửa, lưu personal corrected version trước; sau đó mới gửi review public.

**Điểm khác biệt thực tế cho EatFitAI:** với thị trường Việt Nam, sản phẩm địa phương, hàng nhập khẩu, hàng đổi công thức, và serving size không chuẩn sẽ rất dễ sai. Vì vậy cần ưu tiên "label compare" hơn là chỉ thêm nhiều provider.

#### 18.5 AI scan trust: professional pattern

AI scan chuyên nghiệp không nên hành xử như oracle. Nó nên hành xử như **assistant có kiểm soát**:

| Trạng thái AI | UI nên làm | Logic nên làm |
|---|---|---|
| 1 món rõ, confidence cao, matched verified food | Cho quick-add nhưng vẫn hiện serving confirm | Có thể save nhanh |
| Nhiều món hoặc món trộn | Hiện danh sách món detected + hỏi phần thiếu | Không quick-save toàn bộ |
| Top-2 candidates gần nhau | Cho user chọn | Không tự đoán |
| Món Việt/cultural food chưa chắc | Gợi ý "ước tính gần đúng" + rough log | Không dùng làm dữ liệu mạnh |
| Thiếu nutrition mapping | Cho search/manual add | Không tạo calories giả |
| User sửa món/portion | Lưu correction memory | Dùng để rank lần sau |

MyFitnessPal và Lose It đều dùng AI/photo như gợi ý rồi bắt user chọn/confirm. Đây là hướng đúng: tiện hơn nhập tay, nhưng vẫn giữ người dùng ở bước kiểm chứng cuối.

#### 18.6 Smart convenience: app phải giảm tap, không chỉ thêm AI

Các app tốt đều có nhiều lane logging vì user không ăn theo một tình huống duy nhất. EatFitAI nên nghĩ theo "logging lane", không theo feature rời:

| Tình huống user | Lane tốt nhất | UX nên có |
|---|---|---|
| Ăn món lặp lại | Recent/frequent meal | 1 tap re-add, default portion gần nhất |
| Ăn món packaged | Barcode | Scan -> verify serving -> add |
| Ăn cơm nhà/món Việt | Search + Vietnamese aliases + common portions | "1 bát", "1 đĩa", "1 phần", "nửa tô" |
| Ăn ngoài/không biết chính xác | Rough log | Chọn mức nhỏ/vừa/lớn, mark estimate |
| Đang bận | Voice | "Thêm 1 bát phở bò bữa sáng" -> review -> save |
| Có ảnh | AI scan | Suggest candidates -> confirm portion |
| Quên cả ngày | Day quick edit | Nhập tổng estimate hoặc log 1-2 bữa chính để tránh partial logging sai |
| Từ notification | Deep link đúng meal | Mở thẳng add breakfast/lunch/dinner bị thiếu |

Nguyên tắc: AI là một lane, không phải lane duy nhất. App thông minh là app tự chọn lane ít ma sát nhất theo ngữ cảnh.

#### 18.7 Nutrition guidance: đơn giản hóa nhưng không gây hiểu lầm

Noom và Fooducate cho thấy user thích guidance đơn giản: màu, grade, pros/cons, healthier alternatives. Nhưng nếu grade quá chắc hoặc thiếu giải thích, nó dễ thành phán xét hoặc sai với ngữ cảnh cá nhân.

EatFitAI nên dùng guidance nhẹ hơn:

- `Ăn thường xuyên`: món phù hợp mục tiêu và đủ tin cậy.
- `Cân bằng khẩu phần`: không xấu, chỉ cần portion hợp lý.
- `Nên để ý`: cao năng lượng/sodium/đường/béo bão hòa hoặc dữ liệu thiếu.
- `Ước tính`: AI/rough log, không dùng để kết luận mạnh.

Mỗi guidance phải có "vì sao":

- "Món này cao sodium so với mục tiêu hôm nay."
- "Dữ liệu đến từ nhãn sản phẩm, chỉ có 14 nutrient."
- "Ảnh nhận diện không chắc giữa bún bò và phở bò."
- "Bạn đã ăn món này 3 lần tuần này; nếu muốn giảm sodium, thử đổi nước chấm/giảm nước dùng."

Không nên dùng ngôn ngữ kiểu "xấu/tốt", "fail", "ăn sai", hoặc gamify deficit quá mạnh.

#### 18.8 Algorithm trust: giải thích giống MacroFactor nhưng đơn giản hơn

User sẽ tin adaptive target hơn nếu biết app dùng gì và không dùng gì.

EatFitAI nên có "Why this target changed" bottom sheet:

- App đã dùng 12 ngày log đủ + 8 điểm cân nặng.
- Weight trend 14 ngày đang giảm chậm hơn mục tiêu.
- Data confidence trung bình 78%.
- Target tăng/giảm 80 kcal, nằm trong giới hạn an toàn.
- Không dùng ngày partial/rough-heavy để điều chỉnh.
- Nếu bạn thấy tuần này bất thường, có thể pause adjustment.

Điều này tốt hơn nhiều so với chỉ hiện "AI đã điều chỉnh target". Trust đến từ quyền kiểm soát và khả năng kiểm tra, không phải từ chữ AI.

#### 18.9 Community/report/correction loop

Professional trust không phải một lần là xong. Nó là vòng lặp:

1. User thấy dữ liệu sai hoặc thiếu.
2. User sửa nhanh cho bản thân.
3. App lưu correction private để lần sau không bị sai lại.
4. Nếu user chọn gửi review, backend tạo moderation queue.
5. Admin/curation duyệt.
6. Nếu nhiều user sửa cùng một entry, tự tăng priority review.
7. Nếu entry được update, app ghi `last_reviewed_at` và changelog ngắn.

Điểm quan trọng: user không nên phải sửa cùng một lỗi nhiều lần. Nếu user đã sửa "sữa Vinamilk X 180ml" theo nhãn thật, lần sau barcode đó phải ưu tiên bản sửa cá nhân hoặc bản đã được duyệt.

#### 18.10 Professional trust checklist cho EatFitAI

| Checklist | P0/P1 | Vì sao đáng làm |
|---|---|---|
| Source badge trên food entry | P0 | Tạo trust ngay, ít phụ thuộc AI |
| Missing-vs-zero nutrient contract | P0 | Tránh lỗi dữ liệu nguy hiểm |
| Day data confidence score | P0 | Weekly/adaptive target không kết luận quá đà |
| AI/voice/barcode unified confidence gate | P0 | UX nhất quán, giảm save sai |
| Correction memory cá nhân | P1 | Giảm lặp lỗi, tăng cảm giác app học được |
| Barcode label compare/OCR | P1 | Rất hợp thị trường Việt Nam |
| Verified Vietnamese portion catalog | P1 | Lợi thế local thật sự |
| Why this changed explanation cho target/review | P1 | Tăng trust với AI/adaptive logic |
| Report issue + curation queue | P1 | Biến user feedback thành data quality loop |
| Public trust legend trong app | P1 | User hiểu badge mà không cần đọc docs |
| Expert-reviewed nutrition copy/policy | P1 | Giảm rủi ro advice sai/nhạy cảm |
| Provider freshness/revalidation job | P2 | Quan trọng khi database lớn dần |

#### 18.11 Những thứ không nên copy mù quáng

- Không copy "database thật lớn" nếu không có curation. Database lớn nhưng nhiều duplicate/sai sẽ làm mất trust nhanh hơn database nhỏ nhưng rõ nguồn.
- Không copy one-day projected weight loss. Research/CSPI đã gọi kiểu estimate một ngày là kém giá trị.
- Không copy gamification ép streak nếu app chưa phân biệt partial/complete day.
- Không copy AI scan auto-save khi món nhiều thành phần hoặc món Việt chưa benchmark.
- Không copy food grade quá cứng nếu chưa có policy dinh dưỡng rõ; nên dùng guidance mềm + giải thích.
- Không copy social/community public mặc định; health/nutrition data nhạy cảm, nên opt-in và private-first.

#### 18.12 Recommendation mới sau research competitor

EatFitAI nên định vị khác các app lớn:

> App dinh dưỡng Việt Nam đáng tin: log nhanh bằng AI/voice/barcode, nhưng mọi con số đều có nguồn, độ chắc, và cách sửa.

Ba hướng cần làm tốt hơn "app bình thường":

1. **Trust-first food database** - verified Vietnamese foods, source badges, completeness, missing-vs-zero, correction loop.
2. **Context-aware logging** - recent/frequent, rough log, voice tiếng Việt, AI scan review, barcode label compare, deep link từ reminder.
3. **Explainable coaching** - weekly action nhỏ, adaptive target có lý do, no shame, không kết luận khi dữ liệu yếu.

Nếu chỉ chọn một việc để tăng độ chuyên nghiệp, nên chọn: **source/completeness/confidence layer cho mọi food log**. Đây là nền để AI, weekly review, adaptive target, notification, và trust cùng tốt lên.

---

### 19. Research vòng 14-16: luồng người dùng, hiệu quả thực tế, nhắc nhở liên tục, và thông tin dinh dưỡng hữu ích

Mục tiêu của phần này là gom mọi research trước đó thành một mô hình vận hành cụ thể:

> User dùng app vì app giúp họ log nhanh, hiểu hôm nay nên làm gì, được nhắc đúng lúc, tin được dữ liệu, và thấy tiến bộ mà không bị phán xét.

Vì vậy EatFitAI không nên được thiết kế như một bộ tính calories. Nó nên là một hệ thống gồm 5 vòng lặp: **activation loop**, **logging loop**, **trust loop**, **reminder loop**, và **coaching loop**.

#### 19.1 Evidence synthesis: chức năng nào thường hiệu quả

Các review về app weight/nutrition cho thấy feature hiệu quả thường không đứng một mình. Nhóm feature hay xuất hiện trong intervention có kết quả gồm:

- Self-monitoring: log thức ăn, cân nặng, hoạt động, mục tiêu.
- Goal setting: mục tiêu cụ thể và vừa sức.
- Feedback: phản hồi dựa trên dữ liệu user, không chỉ tips chung.
- Prompts/cues: nhắc đúng lúc để user quay lại hành vi.
- Education: kiến thức ngắn, đúng ngữ cảnh.
- Social/accountability hoặc support: chỉ nên opt-in vì dữ liệu sức khỏe nhạy cảm.
- Rewards/gamification: có thể giúp engagement, nhưng phải tránh thưởng hành vi sai như log thiếu vẫn giữ streak.

Điểm quan trọng: self-monitoring liên quan tích cực tới weight loss và behavior change, nhưng adherence giảm dần nếu logging tốn công. Vì vậy EatFitAI phải tối ưu **adherence có chất lượng**, không chỉ tổng số lần mở app.

#### 19.2 North-star user flow

Luồng lý tưởng nên là:

1. User vào app.
2. App hỏi rất ít để bắt đầu.
3. User log được bữa đầu trong dưới 2 phút.
4. App hiện thông tin hữu ích ngay: calories/macros cơ bản + một điều cần để ý.
5. App giải thích dữ liệu này đến từ đâu và chắc đến mức nào.
6. Nếu user quên, app nhắc đúng bữa thiếu, đúng giờ user hay ăn, có deep link mở thẳng logging lane.
7. Nếu user bỏ 1-3 ngày, app không phạt; mở lại bằng rescue flow.
8. Cuối tuần, app chỉ kết luận nếu đủ dữ liệu; nếu thiếu dữ liệu, app ưu tiên giúp log dễ hơn.
9. Khi target thay đổi, app giải thích lý do và cho user pause/adjust.

Nếu flow này mượt, user sẽ tin app vì app vừa tiện vừa biết tự giới hạn khi dữ liệu yếu.

#### 19.3 5 vòng lặp sản phẩm cần làm rõ

##### Activation loop

Mục tiêu: user mới có "aha moment" trước khi bị bắt điền quá nhiều.

| Step | App nên làm | Vì sao |
|---|---|---|
| Welcome | Chọn mục tiêu chính + mức kinh nghiệm | Giảm overload |
| Minimal profile | Chỉ hỏi field cần để tính target ban đầu | Tăng completion |
| First log | Đẩy user log bữa gần nhất bằng search/recent/demo/voice/photo | Tạo giá trị ngay |
| First feedback | Hiện 1 insight nhỏ, không giảng dài | User hiểu app hữu ích |
| Notification consent | Hỏi sau khi user thấy value | Tăng khả năng đồng ý và giảm cảm giác bị spam |

Metric: onboarding completion, time-to-first-log, first-log success rate, notification opt-in after value, day-1 return.

##### Logging loop

Mục tiêu: user có thể log trong mọi bối cảnh.

| Context | Lane | Success criteria |
|---|---|---|
| Món quen | Recent/frequent | 1-2 tap |
| Món Việt phổ biến | Search alias + portion preset | <30 giây |
| Đồ đóng gói | Barcode | Scan -> serving confirm -> add |
| Món ngoài hàng | Rough log | Có estimate state, không làm sai weekly/adaptive |
| Đang bận | Voice | Nói -> review -> save |
| Có ảnh | AI scan | Gợi ý -> confirm -> save |
| Quên cả ngày | Day recovery | Log approximate hoặc mark skipped |

Metric: add-food success rate, median time-to-log, log correction rate, rough-log rate, complete-day rate.

##### Trust loop

Mục tiêu: user hiểu số nào chắc, số nào ước tính, và sửa sai dễ.

| Moment | App nên hiện | App nên lưu |
|---|---|---|
| Food search result | Verified/source/completeness badge | Source ranking |
| Add food | Serving + nutrient completeness | User confirmation |
| AI/voice/barcode result | Confidence + reason for review | Candidate scores |
| User sửa | "Lưu cho lần sau" | Personal correction memory |
| Weekly review | Data quality trước insight | Review confidence |

Metric: % entries with source, % entries user-confirmed, missing nutrient rate, report issue rate, correction reuse rate.

##### Reminder loop

Mục tiêu: theo dõi liên tục nhưng không làm phiền.

JITAI framework gợi ý một reminder tốt phải có:

- Distal outcome: user duy trì ăn uống lành mạnh/giảm cân/tăng cơ.
- Proximal outcome: user log bữa bị thiếu, uống nước, cân lại, hoàn thành action tuần.
- Decision point: lúc app quyết định có nhắc hay không.
- Tailoring variables: user đã log chưa, giờ ăn cá nhân, ngày trong tuần, streak state, notification fatigue, quiet hours, data confidence.
- Intervention options: không nhắc, nhắc nhẹ, deep link add meal, rescue card, weekly action.
- Decision rules: nếu user đã log thì suppress; nếu đang quiet hours thì dời; nếu 2 lần không mở thì giảm intensity.

Reminder không nên là lịch cố định 08:30/10:00/21:00 cho mọi người. Nó nên là **decision engine**:

| Trigger | Điều kiện gửi | Nội dung | Suppress khi |
|---|---|---|---|
| Meal missing | Qua meal window cá nhân 30-90 phút, chưa log | "Bạn muốn log nhanh bữa trưa không?" | Đã log/quiet hours/cooldown |
| Partial day | Tối, có 1 bữa nhưng thiếu nhiều | "Hoàn tất hôm nay bằng rough log hoặc mark skipped" | User đang trong rescue pause |
| Streak risk | Chỉ khi user chọn streak mode | Nhắc nhẹ, không đe dọa mất chuỗi | Low mood/safety mode/2 lần ignored |
| Weekly action | Action đã accept nhưng chưa done | "Bạn muốn hoàn tất 1 việc nhỏ tuần này không?" | Action snoozed/done |
| Re-engagement | 2-3 ngày không log | Rescue card, không shame | User disabled reminders |

Metric: notification sent/open/action-completed/suppressed/unsubscribe rate, log within 30 minutes after notification, notification fatigue score.

##### Coaching loop

Mục tiêu: biến dữ liệu thành một hành động nhỏ.

Weekly review nên theo thứ tự:

1. Data quality: "Tuần này đủ/thiếu dữ liệu ở đâu?"
2. Win: "Bạn đã làm tốt gì?"
3. Bottleneck: "Điểm nhỏ nào cản mục tiêu?"
4. One action: chỉ 1 hành động tuần tới.
5. Commitment: accept/snooze/replace.
6. Follow-up: app nhắc đúng action, không chỉ nhắc log chung.
7. Learning: user mark useful/not useful.

Metric: weekly review open, action accept, action done, user-rated usefulness, next-week complete-day rate.

#### 19.4 Thông tin dinh dưỡng nên hiện như thế nào

User không cần 40 chỉ số ngay từ ngày đầu. App nên chia thông tin thành 4 tầng.

| Tầng | Hiện cho ai | Nội dung | Nguyên tắc |
|---|---|---|---|
| Level 1 - Everyday | Mọi user | Calories, protein, carb, fat, meal progress | Dễ hiểu, không quá nhiều màu cảnh báo |
| Level 2 - Health quality | User đã quen hoặc có mục tiêu | Fiber, sodium, added sugar, saturated fat, water, fruit/veg/protein pattern | Chỉ hiện khi dữ liệu đủ tin |
| Level 3 - Trust detail | Khi user tap badge hoặc review | Source, verified state, missing fields, confidence, last reviewed | Tăng trust mà không làm UI rối |
| Level 4 - Advanced | Power user/health goal | Micronutrients, trends, exports, custom targets | Không đẩy cho beginner |

Theo FDA/Nutrition Facts, các nutrient user nên dễ nhận ra gồm serving size, calories, saturated fat, sodium, added sugars, fiber, protein, vitamins/minerals quan trọng. Với EatFitAI, không nên show micronutrient nếu database thiếu nhiều, vì sẽ tạo "ảo giác chính xác".

#### 19.5 Nutrition insight hữu ích phải có cấu trúc

Một insight tốt nên có 5 phần:

1. **What happened** - "Tuần này bạn log đủ 5/7 ngày."
2. **Confidence** - "Dữ liệu protein khá chắc, sodium còn thiếu vì 3 món không có sodium."
3. **Why it matters** - "Protein đều hơn giúp no lâu và giữ cơ khi giảm cân."
4. **One action** - "Tuần này thêm 1 nguồn protein vào bữa sáng 3 ngày."
5. **Fast path** - "Chọn 1 trong 3 món thường ăn của bạn."

Ví dụ tốt:

> Tuần này bạn log đủ 5 ngày. Protein khá ổn ở bữa trưa/tối, nhưng bữa sáng thường thấp. Tuần tới thử thêm 1 trứng, sữa chua, hoặc đậu phụ vào bữa sáng 3 ngày. Mình sẽ nhắc nhẹ vào khung giờ bạn hay ăn sáng.

Ví dụ kém:

> Bạn thiếu protein. Hãy ăn lành mạnh hơn.

#### 19.6 Theo dõi liên tục: nên theo dõi gì

Không nên theo dõi quá nhiều rồi biến app thành dashboard áp lực. Nên theo dõi 3 nhóm:

**Behavior adherence**

- Logged meals.
- Complete days.
- Rough/partial/skipped days.
- Weekly action done.

**Nutrition quality**

- Calories vs target range.
- Protein consistency.
- Fiber/fruit/veg pattern.
- Sodium/added sugar/saturated fat risk.
- Water only như habit reminder, không dùng như advice y tế.

**Data trust**

- % calories từ verified/source-known entries.
- % AI/voice/barcode entries confirmed.
- Missing nutrient rate.
- Day confidence score.

Ba nhóm này phải đi cùng nhau. Nếu chỉ theo calories, app dễ sai. Nếu chỉ theo trust, app khó dùng. Nếu chỉ theo habit, app không đủ dinh dưỡng.

#### 19.7 Useful feature score: tính năng nào đáng làm trước

| Feature/flow | User value | Evidence fit | Trust impact | Convenience impact | Priority |
|---|---:|---:|---:|---:|---|
| Day completeness state | Rất cao | Cao | Rất cao | Trung bình | P0 |
| Smart reminder decision engine | Rất cao | Cao | Cao | Cao | P0 |
| Fast recent/frequent logging | Rất cao | Cao | Trung bình | Rất cao | P0 |
| Source/completeness badge | Cao | Cao | Rất cao | Trung bình | P0 |
| Rough log/rescue flow | Cao | Cao | Cao | Rất cao | P0 |
| Weekly one-action coach | Cao | Cao | Cao | Cao | P0 |
| AI scan confidence review | Cao | Trung bình | Rất cao | Cao | P0 |
| Barcode missing-vs-zero | Cao | Cao | Rất cao | Trung bình | P0 |
| Correction memory | Cao | Trung bình | Cao | Cao | P1 |
| Personalized meal windows | Cao | Cao | Trung bình | Cao | P1 |
| Label OCR compare | Trung bình-cao | Trung bình | Cao | Trung bình | P1 |
| Social/accountability buddy | Trung bình | Trung bình | Rủi ro nếu sai | Trung bình | P2 |
| Micronutrient dashboard | Thấp-trung bình | Cao nếu data đủ | Rủi ro nếu data thiếu | Thấp | P2 |

#### 19.8 Luồng nhắc nhở liên tục nhưng không phiền

App nên có "notification budget" theo user:

| User state | Max nhắc/ngày | Loại nhắc |
|---|---:|---|
| New user ngày 1-3 | 1-2 | First log, meal missing, setup habit |
| Active user | 0-2 | Chỉ bữa thiếu hoặc action đã accept |
| User hay ignore | 0-1 | Giảm intensity, hỏi đổi giờ |
| User đang quay lại | 1 | Rescue flow, không nhắc streak |
| Safety/gentle mode | 0-1 | Không deficit/streak pressure |
| Power user opt-in | Theo cấu hình | Meal/action/water/weight tùy chọn |

Mỗi notification cần có outcome:

- Opened?
- Led to log?
- Led to complete day?
- Ignored?
- Dismissed?
- Disabled category?

Nếu không đo outcome, app sẽ không biết nhắc đang giúp hay đang làm user rời bỏ.

#### 19.9 App home nên trả lời 3 câu hỏi

Home không nên là một bức tường số. Home nên trả lời:

1. **Hôm nay tôi cần làm gì tiếp?**
   - One Job Today.
   - Meal missing/action pending.
   - "Log bữa trưa" hoặc "Xác nhận khẩu phần món đã scan".

2. **Dữ liệu hôm nay có đáng tin không?**
   - Day confidence.
   - Complete/partial/rough.
   - Source/completeness badge.

3. **Tôi có đang đi đúng hướng không?**
   - Target range, không chỉ exact number.
   - Trend 7-14 ngày.
   - Weekly action progress.

Nếu Home trả lời được 3 câu này trong 5 giây, app sẽ tiện và đáng tin hơn nhiều so với thêm nhiều tab.

#### 19.10 Final integrated roadmap update

Roadmap sau research này nên đổi từ "thêm tính năng" thành "xây hệ thống hiệu quả":

**P0 - Make it useful every day**

- First-log dưới 2 phút.
- Recent/frequent + rough log.
- Day completeness + data confidence.
- Smart reminder decision engine.
- Source/completeness badge.
- Weekly one-action coach.

**P1 - Make it learn from the user**

- Personalized meal windows.
- Correction memory.
- Favorite portion defaults.
- Notification tone/intensity learning.
- Why-this-changed explanation.
- Barcode label compare cho sản phẩm Việt.

**P2 - Make it clinically/coach-level mature**

- Expert-reviewed nutrition policy.
- Advanced micronutrient only when data completeness đủ.
- Accountability opt-in.
- Long-term trend reports.
- Cohort-level analytics/A-B testing.

Nếu EatFitAI làm tốt P0, app sẽ đã vượt "app bình thường": user log nhanh, được nhắc đúng lúc, biết dữ liệu có đáng tin không, và mỗi tuần có một hành động cụ thể để cải thiện.

---

---

## Appendix C — Roadmap Decisions, Metrics, and Quality Verification Notes

Phần này giữ lại mục tiêu ban đầu, metrics, roadmap cũ, scorecard, quyết định sau research, north star, quality verification, guardrails và follow-up documentation.

### 1. Mục tiêu chính ban đầu và đánh giá thực tế

**Mục tiêu chính của EatFitAI:** giúp người dùng Việt Nam ghi nhận bữa ăn nhanh hơn, hiểu năng lượng/macro, theo dõi mục tiêu, và giảm friction bằng AI scan, barcode, voice, diary, weekly review.

**Đánh giá hiệu quả thực tế:**

| Claim sản phẩm | Evidence hiện có nói gì | Kỳ vọng thực tế |
|---|---|---|
| App giúp user ăn uống tốt hơn | Self-monitoring và feedback là nhóm kỹ thuật có bằng chứng tốt trong can thiệp hành vi dinh dưỡng, nhưng hiệu quả phụ thuộc mạnh vào adherence. | Có thể cải thiện nhận thức và thói quen nếu logging đủ đều. Không nên hứa giảm cân chắc chắn. |
| AI/photo scan làm tracking dễ hơn | Ảnh món ăn giảm friction, nhưng food recognition và portion estimation vẫn có sai số lớn nếu không có review/portion confirmation. | AI scan nên là "gợi ý có confidence", không phải sự thật tuyệt đối. |
| Calorie/macro target cá nhân hóa | Mifflin-St Jeor là baseline hợp lý nhưng vẫn là ước tính; target cần điều chỉnh theo weight trend và adherence. | Formula ban đầu + adaptive weekly adjustment đáng tin hơn target tĩnh. |
| Food database quyết định độ tin cậy | Nhiều nghiên cứu cảnh báo nutrition app sai do database, portion, user input và food omission. | Verification workflow quan trọng hơn thêm nhiều món không kiểm chứng. |
| Voice/barcode giúp log nhanh | Hữu ích để giảm thao tác, nhưng cần confirmation UI, source label, và fallback khi provider/model không chắc. | Tăng retention/comfort hơn là tự động tăng accuracy. |

**Kết luận:** hướng ban đầu đúng, nhưng hiệu quả thật phụ thuộc vào ba lớp: `adherence` -> `data quality` -> `feedback quality`. Nếu một lớp yếu, AI tốt cũng không cứu được kết quả.

---

### 5. Thước đo độ tin cậy nên thêm vào roadmap

#### Product trust metrics

- `nutrition_source_coverage`: % diary entries có source rõ ràng.
- `verified_food_ratio`: % food catalog được verified.
- `macro_completeness`: % food entries có đủ calorie/protein/carb/fat.
- `portion_confirm_rate`: % AI/barcode entries user đã confirm grams/serving.
- `correction_rate`: % entries user sửa sau khi AI/barcode gợi ý.
- `stale_cache_served_count`: số lần offline cache cũ được dùng.

#### Behavior/effectiveness metrics

- `logged_days_per_week`.
- `meals_logged_per_day`.
- `weekly_review_open_rate`.
- `weekly_action_accept_rate`.
- `target_adherence_days`, nhưng không dùng để shame user.
- `weight_trend_available`: đủ cân nặng 7-14 ngày để adaptive target đáng tin chưa.

#### AI/model metrics

- Top-1 / Top-3 accuracy trên Vietnamese benchmark.
- False positive rate.
- Low-confidence deferral rate.
- Time to first result.
- Model version + dataset version trong AI report.

---

### 6. Roadmap bổ sung không code-first

#### P0 — Trust foundation

1. Sync mobile/backend nutrition formula.
2. Tách AI explanation khỏi deterministic target numbers.
3. Add source label trong tài liệu UI/API contract: verified/catalog/provider/AI/user.
4. Define portion confidence UX.
5. Define low-confidence AI behavior: không đoán bừa, chuyển sang manual/review.
6. Define privacy/cache policy: TTL, sensitive cache, clear cache.

#### P1 — Better normal-app experience

1. QA/harden copy meal/day và meal templates đã có; bổ sung recent portions/personalized portion defaults.
2. Barcode hardening evidence lane.
3. Weekly review push/deep link.
4. Food correction/report workflow.
5. Vietnamese serving presets.
6. Gentle reminders and diary completeness.

#### P2 — Smart but practical

1. Harden adaptive target đã có: thêm weight trend, partial-logging guard, max-change bounds, và formula/version audit.
2. Smart meal suggestion based on remaining macro + food preference.
3. AI advisor chat, but constrained to diary explanation and habit suggestions.
4. OCR nutrition label compare for barcode.
5. Personalized portion defaults.

#### P3 — Advanced

1. Health Connect integration, but use trend data carefully.
2. Meal prep planning.
3. Dietitian/export mode.
4. Advanced micronutrient tracking only after food database quality improves.

---

### 10. Parallel scorecard sau research

Điểm dưới đây không phải production score tuyệt đối; đây là score "mức sẵn sàng để trở thành app dinh dưỡng đáng tin" dựa trên source hiện tại + evidence research.

| Capability | Score | Nhận định song song với app hiện tại | Việc đáng làm tiếp |
|---|---:|---|---|
| Diary friction | 8/10 | Đã có search, voice, AI, barcode, common meals, copy hôm qua. | Đo time-to-log, recent portions, favorite meal combinations. |
| AI scan | 7/10 | Feature mạnh, có confidence/portion/review một phần. | Low-confidence deferral, top candidates, benchmark món Việt, correction analytics. |
| Barcode | 6.5/10 | Đã có UI/API/provider source. | Provider freshness, completeness badge, label OCR compare, stale cache policy. |
| Weekly review | 7.5/10 | Đã có data quality/confidence/open/complete tracking. | Gate advice theo logged days; action feedback hữu ích/không hữu ích. |
| Adaptive target | 5.5/10 | Đã có API/UI, nhưng cần weight trend và partial-logging guard. | Pause khi log thiếu, cap thay đổi, dùng weight trend 7-14 ngày, audit formula version. |
| Food database trust | 6.5/10 | Backend có verified/credibility/admin verify. | Expose source badge ra UX; correction workflow; completeness score. |
| Safety/mental health | 4/10 | Tài liệu đã nêu, nhưng cần policy/UI audit riêng. | Gentle tracking mode, low-calorie warnings, medical/risk disclaimers. |
| Vietnamese localization | 7/10 | Có món Việt, tên không dấu, quick portions. | Vietnamese FCT mapping, sodium/nước mắm/bột canh insight, regional aliases. |

**Kết luận sau vài vòng research:** EatFitAI không thiếu quá nhiều "feature app dinh dưỡng bình thường". Phần khác biệt nên là **Vietnamese trust layer**: món Việt + khẩu phần Việt + nguồn dữ liệu rõ + AI minh bạch + feedback an toàn. Đây là hướng thực tế hơn việc chạy theo mọi tính năng premium của MyFitnessPal/Noom/MacroFactor.

---

### 11. Quyết định roadmap nên cập nhật sau research

#### P0 documentation/contracts

1. `Nutrition Reliability Contract`: source label, confidence levels, completeness score, portion confirmation rules.
2. `Adaptive Target Safety Contract`: yêu cầu logged days, day completeness, weight trend, cap kcal/macro changes, no auto-apply mặc định.
3. `Weekly Review Evidence Gate`: logged days thấp -> chỉ nhắc log; logged days đủ -> mới đưa insight dinh dưỡng.
4. `Nutrition Safety & Guardrails Policy`: gentle mode, low-calorie warning, eating-disorder risk copy, medical disclaimer.
5. `Vietnamese Food Data Quality Plan`: nguồn FAO/INFOODS/NIN, alias, regional dishes, sodium-heavy condiments, benchmark món Việt.

#### P1 implementation candidates sau khi contract rõ

1. Expose food trust badges trong search/diary/AI scan/barcode.
2. Add day completeness score và partial-logging warning.
3. Add correction/report flow cho food nutrition và AI detection.
4. Add weekly review action feedback.
5. Add Vietnamese serving preset catalog.

#### P2 không nên làm trước khi P0/P1 xong

1. Micronutrient scoring sâu.
2. Tự động OCR nhãn dinh dưỡng hoàn chỉnh.
3. AI coach chat tự do.
4. Wearable calorie auto-eat-back.
5. Medical-condition personalization.

---

### 13. Hướng đi thiết thực nên bổ sung

#### 13.1 North Star mới: Reliable Vietnamese Nutrition Coach

Thay vì cố trở thành "AI biết mọi món", EatFitAI nên định vị là:

> App ghi nhật ký dinh dưỡng tiếng Việt nhanh, có AI hỗ trợ, nhưng luôn minh bạch nguồn dữ liệu và bắt user xác nhận khi cần.

Điều này thực tế hơn vì:

- MyFitnessPal/Noom/MacroFactor đã mạnh về feature rộng.
- Người dùng Việt vẫn thiếu food database/portion/local dish đáng tin.
- AI scan/voice tiếng Việt là lợi thế nếu đi cùng trust layer.

#### 13.2 6 hướng thực dụng, đáng làm trước feature hào nhoáng

| Hướng | Vì sao đáng làm | Output nên có |
|---|---|---|
| Reliability Contract | Chặn logic sai lan sang UX. | Source labels, confidence rules, missing-vs-zero rule, completeness score. |
| Day Completeness | Adaptive/weekly review không bị lừa bởi partial logging. | Complete day = đủ bữa hoặc user xác nhận "hôm nay log đủ". |
| Food Correction Loop | Database tốt lên theo thời gian. | Report wrong nutrition, correction queue, admin verify, audit history. |
| Vietnamese Portion Catalog | Giảm sai số lớn nhất: khẩu phần. | `1 chén`, `1 tô`, `1 phần`, grams theo món; source/version. |
| Safety Mode | Giảm rủi ro mental health và tăng cảm giác tử tế. | Gentle tracking, low-calorie guard, no-shame copy, risk disclaimers. |
| Evidence Scorecard | Biết app có hiệu quả thật không. | Logged days/week, complete days, correction rate, review action done, weight trend availability. |

#### 13.3 Roadmap thực dụng 4 sprint

**Sprint 1 — Stop wrong conclusions**

- Viết contract: missing nutrient không được biến thành 0.
- Weekly/adaptive target phải check day completeness.
- Recovery AI thấp confidence chỉ được review, không save.
- Không show weight projection theo 1 ngày.

**Sprint 2 — Make trust visible**

- Badge source ở search/diary/scan/barcode.
- Badge completeness: đủ macro, thiếu macro, thiếu micronutrient.
- Food detail hiển thị verified by/source/date.
- Barcode provider food cần trạng thái unverified rõ.

**Sprint 3 — Build Vietnamese advantage**

- Vietnamese portion catalog v1.
- Alias/vùng miền cho 100 món phổ biến.
- Negative/positive benchmark set cho AI scan món Việt.
- Sodium/nước mắm/bột canh note ở mức dữ liệu, chưa cần health advice sâu.

**Sprint 4 — Coach behavior, not numbers**

- Weekly review chỉ 1-3 action.
- Gentle reminder theo thói quen giờ ăn, không spam.
- User feedback "hữu ích/không hữu ích" trên recommendation.
- Adaptive target chỉ đề xuất khi đủ data, không auto-apply.

#### 13.4 Những thứ nên nói "chưa làm" để tránh đi sai

- Không medical personalization cho tiểu đường/thận/tim mạch nếu chưa có clinician review.
- Không AI coach chat tự do đưa lời khuyên y tế.
- Không auto-eat-back calories từ wearable.
- Không micronutrient scoring sâu khi database chưa đủ completeness.
- Không gamify deficit/streak kiểu tạo áp lực.
- Không tự tin nói AI scan "chính xác" nếu chưa có benchmark món Việt.

**Kết luận thực dụng:** hướng tốt nhất không phải thêm nhiều màn hình. Hướng tốt nhất là làm app biết khi nào **không nên kết luận**. Một app dinh dưỡng đáng tin thắng ở chỗ nó nói rõ: "dữ liệu này chắc", "dữ liệu này thiếu", "AI chưa chắc", và "chưa đủ dữ liệu để chỉnh mục tiêu".

---

### 17. Quality verification sau nhiều vòng bổ sung

Mục tiêu của vòng này không phải là thêm thật nhiều tính năng nữa, mà là kiểm tra tài liệu sau nhiều lớp research có còn sắc, đúng trọng tâm, và đủ thực tế để chuyển thành roadmap hay không.

Kết luận ngắn: tài liệu hiện đã đủ mạnh để làm **product/UX research roadmap** cho EatFitAI, nhưng chưa nên coi là sprint-ready spec. Trước khi code, cần rút P0 thành 6 contract nhỏ, đo được, và có acceptance criteria rõ.

#### 17.1 Cách verify chất lượng

Vòng verify này dùng 5 lớp kiểm tra:

1. **Evidence triangulation** - mỗi đề xuất quan trọng phải có ít nhất một nhóm bằng chứng: guideline dinh dưỡng, systematic review/RCT, nghiên cứu UX/habit/retention, hoặc tài liệu nền tảng mobile.
2. **Code alignment** - so lại với function hiện có trong mobile/backend/AI provider để tránh đề xuất bay quá xa thực tế app.
3. **Risk-first review** - ưu tiên bắt logic có thể làm user tin sai: adaptive target, AI scan, barcode missing nutrient, weekly review thiếu dữ liệu, streak gây áp lực.
4. **MARS-style quality lens** - dùng khung app-quality gồm engagement, functionality, aesthetics/UX, information quality, credibility/evidence.
5. **Implementation practicality** - chấm ý tưởng theo khả năng làm được trong app hiện tại, không đòi kiến trúc mới nếu chưa cần.

#### 17.2 Research mới dùng để kiểm chứng UX/retention

JMIR 2024 scoping review về abandonment của lifestyle behavior và mental health apps là nguồn rất phù hợp để kiểm chứng phần anti-dropout. Review này tổng hợp 18 nghiên cứu với 525,824 participants, và báo cáo median khoảng 70% user bỏ app trong 100 ngày đầu. Lý do bỏ app được gom thành 6 nhóm: technical/functional issues, privacy, poor UX, content/features, time/financial cost, và evolving goals/needs.

Điểm quan trọng với EatFitAI: các lý do bỏ app trong review gần như trùng với các gap đã phát hiện trong tài liệu:

- User bỏ vì nhập liệu tốn công -> cần rough log, copy smart, recent portion, voice/photo review nhanh.
- User bỏ vì app khó hiểu hoặc không thấy hiệu quả -> cần One Job Today, weekly review ít nhưng có hành động rõ.
- User bỏ vì notification phiền -> cần suppression, quiet hours, cooldown, deep link đúng bữa thiếu.
- User bỏ vì thiếu personalization/accountability -> cần meal windows cá nhân hóa, rescue flow, accountability opt-in.
- User bỏ vì content thiếu credibility -> cần food trust badge, source, missing-vs-zero contract, AI confidence rõ.

MARS và validation MARS cũng xác nhận cách chấm chất lượng không nên chỉ dựa vào số feature. Một health app tốt cần đồng thời có engagement, functionality, usability/navigation, information quality, credibility/evidence. Vì vậy roadmap hiện tại đúng hướng khi không chỉ thêm AI, mà ép AI, notification, diary, barcode, weekly review cùng phục vụ một trải nghiệm đáng tin và ít mất thời gian hơn.

#### 17.3 Evidence quality scorecard

| Mảng đánh giá | Điểm tin cậy | Vì sao | Cần thận trọng |
|---|---:|---|---|
| Self-monitoring giúp cải thiện hành vi ăn uống | A- | Có RCT/systematic review về self-monitoring, feedback, app-based nutrition intervention | Hiệu quả phụ thuộc adherence; app thực tế thường drop cao hơn trial |
| UX/habit/anti-dropout | A- | JMIR 2024 abandonment + nutrition app barriers/facilitators + BCT/COM-B/Fogg | Cần telemetry thực tế của EatFitAI để biết user Việt bỏ ở đâu |
| Notification/reminder | B+ | Có microrandomized trial và push content study, cộng với Android notification guidance | Effect size thường modest; notification dễ phản tác dụng nếu gửi sai lúc |
| AI/photo food logging | B | Có review image-assisted dietary assessment và app AI quality review | Chưa có benchmark món Việt, portion Việt, ánh sáng/đĩa thật của user Việt |
| Barcode/food database trust | B+ | Có nghiên cứu accuracy MyFitnessPal và bài về reliability nutrition app | Dữ liệu provider thiếu field vẫn có thể làm user hiểu nhầm nếu UI không cảnh báo |
| Adaptive target | B | Mifflin-St Jeor/NIDDK có nền tảng khoa học cho estimate và weight dynamics | Logic trong app phải gate bằng complete-day + weight trend, không dùng average intake đơn giản |
| Safety/disordered eating | B+ | Có review và nghiên cứu liên quan tracking app với eating disorder/disordered eating | Cần policy riêng, không biến streak/deficit thành áp lực |
| Vietnam localization | B | Có FAO/INFOODS Vietnam, nutrition transition, sodium Vietnam | Thiếu user research trực tiếp với khẩu phần, món, thói quen ăn ngoài của user Việt |
| Mobile performance/reliability | B | Android vitals/core quality cung cấp chuẩn nền | Chưa có p75/p95 trên máy thật của EatFitAI |

#### 17.4 Code-alignment verification matrix

| Chức năng hiện tại | Đã verify trong code | Nhận định chất lượng | Gap cần đưa vào roadmap |
|---|---|---|---|
| Onboarding | `OnboardingScreen` có flow 5/6 bước, tính target và có telemetry calculation/complete | Có nền tốt cho target ban đầu | Chưa tối ưu time-to-first-value; nên tách activation onboarding và progressive profile |
| Notification | `notificationService.ts` có meal/water/AI/streak/weekly schedule; settings có quiet hours | Có đủ hạ tầng ban đầu | Quiet hours chưa tham gia decision; notification còn fixed-time và priority cao |
| Streak/gamification | `useGamificationStore.ts` tính ngày logged nếu `dailyCalories > 0` | Đơn giản, dễ hiểu | Dễ thưởng log tượng trưng; cần check-in streak, logging streak, complete-day streak tách nhau |
| Diary/search | Có quick add, copy, common meals, recent flows, telemetry một phần | Nền friction-reduction khá tốt | Cần partial/rough/unknown meal state và ranking theo lịch sử cá nhân |
| Voice | Có review threshold và telemetry voice parse/submit/review | Tốt cho giảm ma sát | Cần correction memory, offline draft, natural Vietnamese command patterns |
| AI scan | Mobile có guard confidence/block quick-save ở rủi ro cao | Hướng trust khá đúng | AI provider có recovery threshold rất thấp cho một số label; cần benchmark negative và review-only mode |
| Barcode | Backend lưu provider food unverified, credibility 50 | Có tín hiệu trust trong data model | Parser dùng default 0 cho missing nutrient; cần phân biệt missing với true zero |
| Weekly review | Backend có dataQuality/confidence; mobile có open/complete telemetry | Có khung review hữu ích | `LastReviewDate` còn TODO, dataQuality chưa đo complete-day/meal completeness, chưa có action_done |
| Adaptive target | Có `GetAdaptiveTargetAsync()` và adjustment theo average intake | Có nền cá nhân hóa | Rủi ro reward underlogging/overeating; phải gate bằng complete-days, weight trend, plateau logic |
| Telemetry | Đã có nhiều event cho AI scan, voice, onboarding, weekly review, search/add | Rất có lợi cho future learning | Chưa đủ funnel/SLO, duration p75/p95, notification decision log |

#### 17.5 Điểm chất lượng tài liệu sau nhiều vòng

| Tiêu chí | Điểm | Lý do |
|---|---:|---|
| Research breadth | 9.0/10 | Đã phủ dinh dưỡng, self-monitoring, AI/photo, barcode/database, safety, UX retention, mobile quality |
| Practicality | 8.5/10 | Đề xuất bám sát flow hiện có, ưu tiên giảm thời gian log và tăng trust |
| Code grounding | 8.0/10 | Nhiều gap được đối chiếu trực tiếp với mobile/backend/AI provider |
| Prioritization | 8.0/10 | P0/P1/P2 đã rõ hơn, nhưng vẫn cần cắt P0 thành spec nhỏ |
| Safety | 8.5/10 | Đã gọi thẳng rủi ro eating disorder, deficit gamification, adaptive target sai |
| UX depth | 8.5/10 | Đã có onboarding, dropout rescue, habit loop, notification intensity, One Job Today |
| Implementation readiness | 7.0/10 | Chưa có acceptance criteria, event schema, contract API/data model chi tiết |

**Overall quality tại thời điểm audit gốc: 8.3/10.** Sau khi hệ thống hóa canonical và bổ sung high-assurance validation stack, điểm tài liệu hiện dùng ở Executive Summary là **8.8/10**.

Tài liệu đã vượt mức “ý tưởng cải thiện app”. Nó hiện là một roadmap nghiên cứu sản phẩm khá chắc. Điểm còn thiếu không phải là thêm feature, mà là đóng gói thành spec build được.

#### 17.6 Những điểm vẫn chưa được verify đủ

Không nên tự tin quá mức ở các điểm sau:

- Chưa có telemetry thật về funnel: install/signup -> onboarding complete -> first log -> first complete day -> day 7 retained -> week 4 retained.
- Chưa có usability test với người mới dùng app dinh dưỡng ở Việt Nam.
- Chưa có benchmark AI scan riêng cho món Việt, khẩu phần Việt, cơm/hộp/bún/phở/đồ ăn vỉa hè.
- Chưa có benchmark barcode/provider về missing nutrient rate, serving-size mismatch, duplicate product, local product coverage.
- Chưa có nutrition expert review cho copy lời khuyên, adaptive target, safety boundaries.
- Chưa có legal/privacy review cho health data, AI advice, reminder accountability, social/buddy mode.
- Chưa có p75/p95 latency trên Android thật cho search/add/voice/photo/barcode/weekly review.
- Chưa có A/B test tone notification, onboarding length, rough log, hoặc rescue flow.

#### 17.7 Chỉnh lại hướng đi để tránh lan man

Sau nhiều vòng bổ sung, roadmap nên dừng mở rộng feature list và chuyển sang 6 contract P0:

1. **Activation Funnel Contract** - user mới phải log được bữa đầu trong dưới 2 phút sau khi vào app, kể cả chưa hoàn tất mọi profile field.
2. **Day Completeness Contract** - mọi ngày phải có state rõ: no-log, partial, rough, complete, skipped, low-confidence. Không dùng calories > 0 làm proxy duy nhất.
3. **Notification Decision Contract** - mỗi notification phải có lý do gửi, lý do suppress, cooldown, quiet hours, deep link, và outcome event.
4. **Food Trust Contract** - mọi food entry phải phân biệt verified/unverified, source, credibility, missing nutrient, true zero, user-corrected.
5. **AI Capture Confidence Contract** - AI/voice/photo/barcode phải có confidence gate thống nhất, review state, correction memory, và không quick-save khi dữ liệu chưa đủ chắc.
6. **Weekly Coach Action Contract** - weekly review không chỉ đọc số liệu; phải tạo 1 action nhỏ, user có thể accept/done/snooze, và review sau đó học từ action.

#### 17.8 Verdict cuối sau verify

Roadmap này hiện có chất lượng tốt nhất khi được hiểu là:

> EatFitAI không nên cố thắng bằng nhiều AI hơn. Nên thắng bằng logging nhanh hơn, dữ liệu đáng tin hơn, feedback ít nhưng đúng lúc hơn, và khả năng kéo user quay lại sau khi họ bỏ lỡ một vài ngày.

Nếu build ngay, nên chỉ build P0 contract trước. Nếu tiếp tục làm tài liệu, tài liệu kế tiếp nên là **P0 Product Requirement Spec**, không phải thêm research chung nữa.

---

### 7. What not to overbuild yet

- Full medical personalization for diabetes, kidney disease, pregnancy, eating disorders.
- Micronutrient scoring if database completeness is low.
- Social features before diary reliability is strong.
- Automatic calorie adjustment from wearable active calories without smoothing.
- AI chat that gives unrestricted medical/diet advice.
- Complex subscription before retention/trust metrics are proven.

---

### 8. Recommended documentation follow-ups

1. Create a `Nutrition Reliability Contract` describing source labels, confidence levels, and user confirmation rules.
2. Create a `Vietnamese Food Dataset Quality Plan` with verification workflow and benchmark set.
3. Create a `Nutrition Safety & Guardrails Policy` for low-calorie targets, disordered-eating risk, and medical disclaimers.
4. Create a `Product Effectiveness Scorecard` mapping product metrics to evidence-backed outcomes.

---

---

## Sources

- WHO Healthy Diet overview: https://www.who.int/health-topics/healthy-diet
- Dietary Guidelines for Americans 2025-2030, ODPHP: https://odphp.health.gov/our-work/nutrition-physical-activity/dietary-guidelines/current-dietary-guidelines
- USDA Dietary Patterns: https://www.fns.usda.gov/cnpp/dietary-patterns
- Burke et al., SMARTER randomized clinical trial, JMIR 2022: https://www.jmir.org/2022/7/e38243
- Dietary self-monitoring systematic review: https://pmc.ncbi.nlm.nih.gov/articles/PMC8928602/
- App-based nutrition interventions systematic review/meta-analysis: https://pubmed.ncbi.nlm.nih.gov/31353783/
- Dietary record apps validation systematic review/meta-analysis: https://pmc.ncbi.nlm.nih.gov/articles/PMC8634532/
- MyFitnessPal naturalistic nutrient accuracy study: https://pubmed.ncbi.nlm.nih.gov/30184514/
- MyFitnessPal nutrient calculation validation: https://pmc.ncbi.nlm.nih.gov/articles/PMC7641788/
- 2SMART pilot trial: https://pubmed.ncbi.nlm.nih.gov/31155474/
- Mifflin-St Jeor RMR equation systematic review: https://pubmed.ncbi.nlm.nih.gov/15883556/
- NIDDK Body Weight Planner research: https://www.niddk.nih.gov/research-funding/at-niddk/labs-branches/laboratory-biological-modeling/integrative-physiology-section/research/body-weight-planner
- Levinson et al., MyFitnessPal and eating disorders, Eating Behaviors 2017: https://www.sciencedirect.com/science/article/abs/pii/S1471015317301484
- Nutrition app barriers/facilitators systematic review: https://pmc.ncbi.nlm.nih.gov/articles/PMC8409150/
- Frontiers 2024 systematic review of smartphone/web dietary interventions: https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2024.1282570/full
- Feedback in self-monitoring interventions systematic review/meta-analysis: https://link.springer.com/article/10.1186/s12966-023-01555-6
- Image-assisted dietary assessment review: https://www.nature.com/articles/s41366-020-00693-2
- PortionSize vs MyFitnessPal randomized crossover laboratory evaluation: https://repository.lsu.edu/clinical_research_pubs/94/
- MyFitnessPal Meal Scan official FAQ: https://support.myfitnesspal.com/hc/en-us/articles/360045761612-Meal-Scan-FAQ
- MacroFactor dynamic nutrition plan and partial tracking note: https://macrofactor.com/macrofactor/
- Cronometer official feature page: https://mobile.cronometer.com/features/
- Diet/fitness apps and disordered eating systematic review, Body Image 2025: https://www.sciencedirect.com/science/article/pii/S174014452400158X
- FAO/INFOODS Vietnam food composition tables: https://www.fao.org/infoods/infoods/tables-and-databases/vietnam/en/
- Vietnam nutrition transition 2012-2020, Critical Public Health: https://doaj.org/article/5cdb4023b0bb4627a998282636045dde
- Sodium reduction in Vietnam, Archives of Public Health 2021: https://archpublichealth.biomedcentral.com/articles/10.1186/s13690-021-00540-4
- Reliability issues of mobile nutrition apps for cardiovascular disease prevention, JMIR mHealth and uHealth 2024: https://mhealth.jmir.org/2024/1/e54509/
- Health-tracking technologies, eating habits and attitudes systematic search/review, Journal of Health Psychology 2025: https://journals.sagepub.com/doi/10.1177/13591053251351222
- Smartphone food tracking/recommendation apps AI feature quality review: https://www.sciencedirect.com/science/article/pii/S2667305322000412
- AI, machine learning, and deep learning in nutrition systematic review, Nutrients 2024: https://www.mdpi.com/2072-6643/16/7/1073
- CSPI guide to food-tracking apps and data-source transparency: https://www.cspi.org/article/our-guide-food-tracking-apps
- Fitbit energy expenditure/heart rate/steps systematic review and meta-analysis: https://pubmed.ncbi.nlm.nih.gov/35416777/
- Barriers to and Facilitators for Using Nutrition Apps, JMIR mHealth and uHealth 2021: https://mhealth.jmir.org/2021/6/e20037/
- To Prompt or Not to Prompt? push notification microrandomized trial, JMIR mHealth and uHealth 2018: https://mhealth.jmir.org/2018/11/e10123/
- Push notification content and self-monitoring engagement, Preventive Medicine Reports 2018: https://www.sciencedirect.com/science/article/pii/S2211335518301177
- Behavior change techniques and engagement with mobile health apps, Frontiers in Psychology 2023: https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1227443/full
- Behaviour Change Wheel and COM-B, Implementation Science 2011: https://link.springer.com/article/10.1186/1748-5908-6-42
- Fogg Behavior Model, Stanford Behavior Design Lab: https://behaviordesign.stanford.edu/resources/fogg-behavior-model
- When and Why Adults Abandon Lifestyle Behavior and Mental Health Mobile Apps, JMIR 2024: https://www.jmir.org/2024/1/e56897
- Mobile App Rating Scale, JMIR mHealth and uHealth 2015: https://mhealth.jmir.org/2015/1/e27/
- Validation of the Mobile Application Rating Scale, PLOS ONE 2020: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0241480
- Android notifications and user control, Android Developers: https://developer.android.com/develop/ui/views/notifications
- Android vitals and app quality, Android Developers: https://developer.android.com/topic/performance/vitals
- Core app quality guidelines, Android Developers: https://developer.android.com/docs/quality-guidelines/core-app-quality
- Cronometer data sources and curation: https://support.cronometer.com/hc/en-us/articles/360018239472-Data-Sources
- Cronometer data confidence scores: https://support.cronometer.com/hc/en-us/articles/360042550452-Data-Confidence-Scores
- MyFitnessPal verified food check mark: https://support.myfitnesspal.com/hc/en-us/articles/360032273292-What-does-the-check-mark-mean
- MyFitnessPal Meal Scan FAQ: https://support.myfitnesspal.com/hc/en-us/articles/360045761612-Meal-Scan-FAQ
- MacroFactor algorithms and core philosophy: https://macrofactor.com/macrofactors-algorithms-and-core-philosophy/
- MacroFactor welcome and partial logging guidance: https://macrofactor.com/welcome/
- Noom food color system: https://www.noom.com/support/faqs/using-the-app/logging-and-tracking/food-and-water/2025/10/how-nooms-food-color-system-works/
- Fooducate features and food grades: https://fooducate.zendesk.com/hc/en-us/articles/7689965571355-Fooducate-What-is-Fooducate
- FatSecret Platform API food data verification/localization: https://platform.fatsecret.com/platform-api
- USDA FoodData Central API guide: https://fdc.nal.usda.gov/api-guide
- User perceptions of mobile health app credibility and continued use, BMC Public Health 2016: https://link.springer.com/article/10.1186/s12889-016-3808-0
- Barcode scanning food database quality assessment, Public Health Nutrition 2019: https://research.wur.nl/en/publications/food-identification-by-barcode-scanning-in-the-netherlands-a-qual/
- CSPI guide to food-tracking apps, Cronometer/MyFitnessPal comparison: https://www.cspi.org/article/our-guide-food-tracking-apps
- Just-in-Time Adaptive Interventions key components and design principles, Annals of Behavioral Medicine 2018: https://academic.oup.com/abm/article/52/6/446/4733473
- JITAI systematic review, International Journal of Behavioral Nutrition and Physical Activity 2019: https://link.springer.com/article/10.1186/s12966-019-0792-7
- Personalized JITAI scoping review, 2024: https://pmc.ncbi.nlm.nih.gov/articles/PMC11583291/
- Comparing self-monitoring strategies for weight loss in a smartphone app, JMIR mHealth and uHealth 2019: https://mhealth.jmir.org/2019/2/e12209/
- Weight loss associated with different patterns of self-monitoring using My Meal Mate, JMIR mHealth and uHealth 2017: https://mhealth.jmir.org/2017/2/e8/
- Smartphone app features for weight loss systematic review/meta-analysis, JMIR mHealth and uHealth 2022: https://mhealth.jmir.org/2022/4/e35479
- FDA How to Understand and Use the Nutrition Facts Label: https://www.fda.gov/food/new-nutrition-facts-label/how-understand-and-use-nutrition-facts-label
- FDA Daily Value on Nutrition and Supplement Facts Labels: https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels
- CDC Nutrition Facts Label and Your Health: https://www.cdc.gov/healthy-weight-growth/healthy-eating/nutrition-label.html
- CONSORT-EHEALTH reporting guideline for eHealth/mHealth interventions, JMIR 2011: https://www.jmir.org/2011/4/e126/
- CONSORT-AI extension for clinical trial reports involving AI, BMJ 2020: https://www.bmj.com/content/370/bmj.m3164
- SPIRIT-AI extension for clinical trial protocols involving AI, BMJ 2020: https://www.bmj.com/content/370/bmj.m3210
- DECIDE-AI reporting guideline for early-stage evaluation of AI decision support systems, Nature Medicine 2022: https://www.nature.com/articles/s41591-022-01772-9
- NIST AI Risk Management Framework: https://www.nist.gov/itl/ai-risk-management-framework
- WHO Monitoring and Evaluating Digital Health Interventions practical guide: https://iris.who.int/handle/10665/252183
- NICE Evidence Standards Framework for Digital Health Technologies: https://www.nice.org.uk/corporate/ecd7
- FDA Clinical Decision Support Software FAQ/guidance: https://www.fda.gov/medical-devices/software-medical-device-samd/clinical-decision-support-software-frequently-asked-questions-faqs
- FDA Artificial Intelligence in Software as a Medical Device: https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-software-medical-device
- FDA transparency principles for machine learning-enabled medical devices: https://www.fda.gov/medical-devices/software-medical-device-samd/transparency-machine-learning-enabled-medical-devices-guiding-principles
- ISO/IEC 25010:2023 product quality model: https://www.iso.org/cms/%20render/live/en/sites/isoorg/contents/data/standard/07/81/78176.html
- FAO/INFOODS Standards and Guidelines for food composition data: https://www.fao.org/infoods/infoods/standards-guidelines/en/
- FAO Food Composition Data: data quality, sampling, methods and confidence codes: https://www.fao.org/4/y4705e/y4705e06.htm
- FAO Food Composition Data: quality considerations in compilation: https://www.fao.org/4/y4705e/y4705e15.htm
- NCI Dietary Assessment Primer, validation concepts and measurement error: https://epi.grants.cancer.gov/dietary-assessment-primer/concepts/validation/
- NCI Dietary Assessment Primer, principles underlying recommendations: https://www.dietassessmentprimer.cancer.gov/approach/principles.html
- Bangor, Kortum, and Miller, interpreting SUS scores: https://docslib.org/doc/4268678/determining-what-individual-sus-scores-mean-adding-an-adjective
- Nielsen Norman Group usability sample-size principle, repost/reference: https://danq.me/2017/06/10/why-you-only-need-to-test-with-5-users/
- Measuring engagement in eHealth and mHealth behavior change interventions, JMIR 2018: https://www.jmir.org/2018/11/e292/
- A scoping review on using real-world data to evaluate mHealth applications, npj Digital Medicine 2026: https://www.nature.com/articles/s41746-026-02562-0
- RE-AIM planning and evaluation framework: https://re-aim.org/learn/what-is-re-aim/
- FDA Guidance for Industry: developing and using databases for nutrition labeling: https://www.fda.gov/Food/GuidanceRegulation/GuidanceDocumentsRegulatoryInformation/ucm063113.htm
- 21 CFR 101.9 nutrition labeling compliance criteria, eCFR: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9
- Nutrition5k dataset and evaluation scripts, Google Research: https://github.com/google-research-datasets/Nutrition5k
- Trust but verify: five approaches to ensure safe medical apps, BMC Medicine 2015: https://bmcmedicine.biomedcentral.com/articles/10.1186/s12916-015-0451-z
- Behavioral barriers to diet-quality app use, qualitative needs assessment: https://www.sciencedirect.com/science/article/abs/pii/S149940462300324X
- User perspectives of diet-tracking apps, reviews content analysis and topic modeling: https://pmc.ncbi.nlm.nih.gov/articles/PMC8103297/
- Food logging in naturalistic settings, MyFitnessPal usability and nutrient measurement challenges: https://www.sciencedirect.com/science/article/abs/pii/S0899900718303678
- MySwissFoodPyramid adherence retrospective cohort study: https://www.sciencedirect.com/science/article/pii/S2451958824000782
- Slip Buddy dietary lapse tracking app feasibility trial: https://pubmed.ncbi.nlm.nih.gov/33792547/
- OnTrack just-in-time adaptive intervention for weight loss: https://pubmed.ncbi.nlm.nih.gov/31602471/
- Microsoft Guidelines for Human-AI Interaction: https://www.microsoft.com/en-us/research/blog/guidelines-for-human-ai-interaction-design/
- Google People + AI Guidebook, Explainability and Trust: https://pair.withgoogle.com/guidebook-v2/chapters/explainability-trust/
- Microsoft AI overreliance risk mitigation framework: https://learn.microsoft.com/en-us/ai/playbook/technology-guidance/overreliance-on-ai/overreliance-on-ai

### Deep Research Sources (bổ sung 2026-05-07)

- Frontiers in Public Health 2024 — Systematic review: nutrition app + dietary behavior change: https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2024.1378571/full
- NIH/PubMed 2024 — Systematic reviews on self-monitoring BCTs: https://pmc.ncbi.nlm.nih.gov/articles/PMC8928602/
- JMIR 2024 — Behavior change techniques in mHealth apps: https://www.jmir.org/2024/1/e52129
- Cambridge Proceedings of the Nutrition Society 2025 — AI food recognition accuracy: https://www.cambridge.org/core/journals/proceedings-of-the-nutrition-society
- MacroFactor Algorithm Documentation — Adaptive TDEE methodology: https://macrofactorapp.com/algorithm/
- Cronometer Data Quality Documentation — Verified database approach: https://cronometer.com/data-sources/
- NIH Meta-analysis 2025 — JITAI/EMI effectiveness for health outcomes: https://pmc.ncbi.nlm.nih.gov/articles/PMC11803439/
- JMIR 2024 — PIC vs UIC in JITAI personalization: https://www.jmir.org/2024/1/e52129
- AFACI/Korea 2024 — Vietnam food composition database development: https://www.afaci.org/
- NIH/FRANI — AI food recognition pilot in Vietnam adolescents: https://reporter.nih.gov/search/HVH8eFBhFkKkFJ_Sy0rWTA/project-details/10631542
- Examine.com 2024 — USDA FoodData Central completeness analysis: https://examine.com/guides/food-databases/
- Optimove 2024 — User re-engagement deep linking best practices: https://www.optimove.com/resources/learning-center/customer-winback
- Autentika UX — Notification psychology and uninstall effects: https://autentika.pl/blog/push-notification-ux
- Pushwoosh 2024 — Multi-channel re-engagement strategies: https://www.pushwoosh.com/blog/re-engagement-campaigns/
