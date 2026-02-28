# KẾ HOẠCH NÂNG CẤP EATFITAI V4 (SÂU + RỘNG, LOCAL-FIRST, ƯU TIÊN AI ACCURACY)

Cập nhật lần cuối: 2026-02-27  
Phạm vi: bám sát mã nguồn thực tế trong repo `d:\EatFitAI_v1`, không giả định ngoài code.

---

## 1) Tóm tắt quyết định đã chốt

1. Giữ toàn bộ runtime ở local cho giai đoạn đồ án:
   - Backend chạy local.
   - SQL Server chạy local.
   - AI provider chạy local.
2. Mobile không gọi trực tiếp AI provider. Luồng chuẩn: `Mobile -> Backend -> AI Provider`.
3. Không bắt buộc lên cloud trong phase đồ án. Cloud chỉ là lộ trình hậu đồ án.
4. AI chỉ dùng được khi máy AI đang bật. Khi AI tắt, app vẫn chạy đầy đủ chức năng thường (manual/search/diary/stats/profile).
5. Database giữ SQL Server hiện tại, chỉ refactor theo hướng additive an toàn (không đập schema cũ).
6. Không triển khai UI “xóa tài khoản” trong phase này vì không phải nhu cầu người dùng mục tiêu.
7. Mục tiêu cao nhất: tăng độ chính xác AI + độ tin cậy hệ thống + số liệu benchmark bảo vệ đồ án.

---

## 2) Hiện trạng thực tế (đã kiểm tra từ code)

1. Auth Google đang chồng chéo:
   - `AuthService.GoogleLoginAsync` chưa implement và ném `NotImplementedException` tại `eatfitai-backend/Services/AuthService.cs:375` và `:380`.
   - Đồng thời có luồng Google signin riêng tại `eatfitai-backend/Controllers/GoogleAuthController.cs:74`.
2. Validate JWT chưa đồng nhất vì đang bỏ qua issuer/audience tại `eatfitai-backend/Services/AuthService.cs:177` và `:178`.
3. Mobile gọi upload avatar nhưng backend chưa có endpoint tương ứng:
   - FE gọi `POST /api/profile/avatar` tại `eatfitai-mobile/src/services/profileService.ts:113`.
   - Không tìm thấy route/avatar endpoint tương ứng trong thư mục controllers.
4. Voice mobile vẫn gọi trực tiếp AI provider:
   - `eatfitai-mobile/src/services/voiceService.ts:130` (`/voice/transcribe`)
   - `eatfitai-mobile/src/services/voiceService.ts:164` (`/voice/parse`)
5. Backend đang dùng song song 2 DbContext:
   - `EatFitAIDbContext` tại `eatfitai-backend/Program.cs:213`
   - `ApplicationDbContext` tại `eatfitai-backend/Program.cs:217`
6. Dữ liệu credibility đã có nền:
   - Migration `20260129114105_AddCredibilityFields` đã tồn tại.
   - `FoodItem` có `Source`, `IsVerified`, `VerifiedBy`, `UpdatedAt` tại `eatfitai-backend/DbScaffold/Models/FoodItem.cs`.
7. AI provider còn nhiều broad catch và startup side-effect:
   - `start_ollama_if_needed()` ở `ai-provider/app.py:25` và được gọi lúc import tại `ai-provider/app.py:82`.
   - Vẫn có `except:` tại `ai-provider/app.py:38`, `:68`, `:483` và nhiều chỗ khác.
   - `nutrition_llm.py` còn `except:` tại `:70`, `:218`, `:276`, `:503`.
8. Script dataset còn hardcoded API key:
   - `ai-provider/download_dataset.py:9`.
9. Build health hiện tại chưa xanh:
   - `dotnet test EatFitAI_v1.sln` fail do thiếu stack test (`xUnit`, `Moq`, `Microsoft.AspNetCore.Mvc.Testing`).
   - `npm run typecheck` fail do mismatch TS module + lỗi typings thực tế.
10. Hiện trạng cho thấy ưu tiên đúng phải là: ổn định contract + dữ liệu + reliability trước khi thêm tính năng lớn.

---

## 3) Mục tiêu đầu ra của bản nâng cấp

1. App demo ổn định ở cả 3 trạng thái:
   - AI ON.
   - AI OFF.
   - Network issue/timeout.
2. AI nhanh và chính xác hơn, có số liệu benchmark định lượng.
3. Dữ liệu dinh dưỡng có provenance và kiểm soát chất lượng rõ ràng.
4. Userflow nhập bữa ăn nhanh hơn, ít thao tác hơn, ít sửa tay hơn.
5. Tài liệu đồ án khớp 100% với code và kết quả đo.

---

## 4) Kiến trúc mục tiêu và thay đổi contract

### 4.1 Kiến trúc runtime (phase đồ án)

1. `eatfitai-mobile` gọi `eatfitai-backend`.
2. `eatfitai-backend` gọi `ai-provider` qua HTTP nội bộ LAN/local.
3. `eatfitai-backend` kết nối SQL Server local.
4. Nếu AI unavailable:
   - Backend trả `503 AI_UNAVAILABLE`.
   - FE tự chuyển luồng manual mà không crash.

### 4.2 Contract API cần chuẩn hóa

1. Auth Google:
   - Duy trì duy nhất `POST /api/auth/google/signin`.
   - Deprecate hoàn toàn nhánh phụ thuộc `GoogleLoginAsync` chưa implement.
2. Voice:
   - Thêm proxy backend cho `transcribe` và `parse`:
     - `POST /api/voice/transcribe`
     - `POST /api/voice/parse`
   - FE không gọi cổng `:5050` trực tiếp.
3. Nutrition AI:
   - Gom contract về namespace thống nhất: `/api/ai/nutrition/*`.
4. Error envelope chuẩn toàn hệ thống:
   - `traceId`, `errorCode`, `message`, `details`.
5. AI response chuẩn dùng chung FE/BE:
   - `source`, `confidence`, `fallbackUsed`, `latencyMs`, `modelVersion`.

### 4.3 Avatar strategy (chốt cho đồ án)

1. Chọn phương án an toàn: preset avatar (`avatarPresetId` hoặc `AvatarUrl` dạng preset key).
2. Upload file avatar thật chỉ mở sau nếu còn thời gian.

---

## 5) Kế hoạch triển khai 10 tuần (2 dev full-time)

### Giai đoạn A (Tuần 1-2) - Ổn định nền và contract

1. Sửa test infra backend để `dotnet test` chạy được.
2. Sửa TypeScript mobile để `npm run typecheck` xanh.
3. Hợp nhất Google auth về 1 flow.
4. Chốt error contract + AI response contract.
5. Deliverable:
   - Build/test/typecheck xanh.
   - Không còn auth flow chồng chéo.

### Giai đoạn B (Tuần 3-4) - Data pipeline cho AI accuracy

1. Thiết kế dataset ảnh món Việt 1k-3k ảnh có taxonomy rõ.
2. Chuẩn annotation guideline và quality gate.
3. Khóa split `train/val/test` để benchmark không “ảo”.
4. Tạo active-learning loop từ corrections trong app.
5. Deliverable:
   - Dataset `v1.1` có manifest, class-distribution, checklist chất lượng.

### Giai đoạn C (Tuần 5-6) - Tối ưu model ảnh + STT + parser

1. Vision benchmark: `yolov8n`, `yolov8s`, `best.pt` hiện tại trên cùng test set.
2. Test ONNX FP16/INT8 cho RTX 3050 6GB + CPU fallback.
3. STT benchmark: PhoWhisper hiện tại với model nhẹ hơn (đo WER + latency).
4. Parser hybrid rule-first + LLM fallback để giảm hallucination.
5. Benchmark 2-3 model Ollama 3B/4B cho nutrition Q&A.
6. Deliverable:
   - Bảng benchmark trước/sau.
   - Chốt model stack chính thức cho đồ án.

### Giai đoạn D (Tuần 7-8) - Tối ưu userflow/workflow

1. Xây “Quick Add Hub” hợp nhất search + AI scan + voice + recent/favorites.
2. Áp confidence-gated flow: confidence thấp bắt buộc confirm/edit.
3. Chuyển voice về backend proxy hoàn toàn.
4. Chuẩn fallback UX khi AI down.
5. Deliverable:
   - Giảm thời gian log bữa.
   - Non-AI flow chạy độc lập 100%.

### Giai đoạn E (Tuần 9) - SQL additive optimization + governance

1. Tạo migration additive cho alias/snapshot/inference event/rowversion.
2. Thêm index theo query thật từ diary/search/summary.
3. Data quality rule cho nutrition.
4. Chốt provenance policy (`source`, `verifiedBy`, `updatedAt`).
5. Deliverable:
   - Schema mới không phá API cũ.
   - Query trọng yếu cải thiện p95.

### Giai đoạn F (Tuần 10) - Hardening và output bảo vệ

1. Chạy full benchmark pack AI + latency + reliability + userflow.
2. Rehearsal demo 3 mode: AI ON / AI OFF / network issue.
3. Chốt bộ tài liệu bảo vệ: kiến trúc, benchmark, hạn chế, hướng mở rộng.
4. Deliverable:
   - Release candidate ổn định.
   - Bộ minh chứng số liệu đầy đủ.

---

## 6) Nâng cấp FE (chi tiết, hữu dụng)

1. Quick Add Hub:
   - Một điểm vào duy nhất cho thêm bữa.
   - Rút còn <= 3 thao tác từ Home đến Save.
2. AI confirm/edit bắt buộc:
   - Hiển thị confidence badge.
   - Cho chỉnh nhanh grams/portion trước khi lưu.
3. Fallback UX:
   - Nếu AI down, disable CTA AI + chuyển manual ngay.
4. Voice UX:
   - Composer hỗ trợ voice + text edit.
   - Cho user sửa câu lệnh trước khi execute.
5. Profile hoàn thiện:
   - Avatar preset, body metrics, goal, notification settings.
6. Bổ sung tính năng hữu dụng:
   - Barcode scan cho thực phẩm đóng gói.
   - Recent/Favorites rõ ràng tại luồng thêm bữa.
7. Không làm ở phase này:
   - Không thêm UI xóa tài khoản.

---

## 7) Nâng cấp BE (chi tiết, thực thi được)

1. Auth/JWT:
   - Gom Google signin về 1 flow.
   - Đồng bộ policy issuer/audience/expiry.
2. AI Gateway:
   - Tất cả AI call qua backend.
   - Thêm timeout/retry/circuit-breaker.
3. Contract chuẩn:
   - DTO lỗi và DTO AI dùng chung.
   - Không trả raw `ex.Message` cho client.
4. Observability:
   - Structured logging.
   - Correlation id xuyên FE -> BE -> AI.
5. Reliability:
   - Health endpoint cho AI availability.
   - Graceful degradation khi AI offline.

---

## 8) Nâng cấp Database (SQL Server local, additive an toàn)

1. Bảng `FoodAlias`:
   - Mục tiêu: map tên đồng nghĩa, không dấu, biến thể tiếng Việt.
   - Cột chính gợi ý: `Id`, `FoodItemId`, `Alias`, `AliasUnsigned`, `Locale`, `Confidence`, `CreatedAt`.
2. Bảng `FoodNutrientSnapshot`:
   - Mục tiêu: version hóa dữ liệu dinh dưỡng theo thời gian.
   - Cột chính gợi ý: `Id`, `FoodItemId`, `Calories`, `Protein`, `Carb`, `Fat`, `Source`, `SourceReference`, `VerifiedBy`, `CapturedAt`.
3. Bảng `AiInferenceEvent`:
   - Mục tiêu: theo dõi latency/model/fallback để tối ưu AI có số liệu.
   - Cột chính gợi ý: `Id`, `UserId`, `Feature`, `ModelVersion`, `LatencyMs`, `Confidence`, `FallbackReason`, `CreatedAt`.
4. Rowversion cho concurrency:
   - Thêm `rowversion` vào `MealDiary`, `NutritionTarget`, `User`.
5. Index cần bổ sung:
   - `MealDiary(UserId, EatenDate, IsDeleted)`.
   - `FoodItem(FoodNameUnsigned, IsDeleted)`.
   - `AiInferenceEvent(UserId, CreatedAt)`.
6. Data quality guard:
   - Chặn macro/calories âm.
   - Cảnh báo outlier theo rule.

---

## 9) Nâng cấp AI model/data (ngoài phạm vi code thuần)

1. Dataset engineering:
   - Thu thập 1k-3k ảnh món Việt thật theo điều kiện ánh sáng/góc chụp khác nhau.
   - Có hướng dẫn gán nhãn và checklist reject (blur/duplicate/wrong label).
2. Model selection:
   - Vision: benchmark nhiều biến thể YOLO trên cùng test set.
   - STT: benchmark PhoWhisper hiện tại với model nhẹ hơn.
   - Parser: hybrid rule-first + LLM fallback.
3. Inference optimization:
   - Warmup model khi start.
   - Quantization thử nghiệm.
   - Cache nhẹ cho truy vấn lặp.
4. Eval framework:
   - Có bộ test cố định và script chấm tự động.
   - Mỗi lần đổi model phải có bảng trước/sau.
5. Human-in-the-loop:
   - Lấy dữ liệu correction từ app làm backlog retrain.

---

## 10) KPI và benchmark bắt buộc

1. Vision F1 macro >= 0.82 trên test set khóa.
2. Vision latency p95 <= 2.5s (RTX 3050 6GB, ảnh demo chuẩn).
3. STT WER <= 15%; transcribe p95 <= 4s.
4. Intent parsing accuracy >= 92% cho `ADD_FOOD`, `LOG_WEIGHT`, `ASK_CALORIES`.
5. AI output parse/schema success >= 99%.
6. Crash-free sessions >= 99.5%.
7. Khi AI down: non-AI success flow = 100%.
8. 100% record food mới có `source` + `updatedAt`; record verified có reviewer trace.
9. Median time-to-log bữa <= 25s.

---

## 11) Test cases và kịch bản nghiệm thu

1. Auth E2E: login/register/refresh/google-signin qua một flow thống nhất.
2. Voice E2E: record -> transcribe -> parse -> execute -> diary update.
3. Vision E2E: chụp -> detect -> confirm/edit -> save -> summary update.
4. AI down: dừng AI provider, app vẫn chạy toàn bộ non-AI features.
5. Network chaos: timeout, malformed AI JSON, backend trả lỗi đúng envelope.
6. DB concurrency: 2 client sửa cùng entry, xử lý đúng theo rowversion.
7. Migration safety: chạy trên DB copy + rollback script.
8. Contract regression: FE type không vỡ khi đổi response AI/nutrition.
9. Security sanity: không còn hardcoded secret; không leak lỗi nội bộ.
10. Performance: đo p95 diary/search/summary trước và sau index.

---

## 12) Rủi ro chính và phương án khóa rủi ro

1. Training không tăng chất lượng đủ:
   - Khóa bằng benchmark gate trên test set cố định.
2. Scope quá rộng:
   - Chỉ mở phase kế tiếp khi phase trước đạt KPI tối thiểu.
3. Drift giữa 2 DbContext:
   - Chốt ownership từng module + roadmap giảm chồng lấn.
4. Voice phụ thuộc AI local:
   - Dùng backend proxy + retry + fallback UI.
5. Demo fail vì AI offline:
   - Chuẩn bị sẵn script AI ON/OFF + rehearsal định kỳ.

---

## 13) Phạm vi làm và không làm (để chống trượt scope)

1. Trong phạm vi:
   - Local-first runtime.
   - AI accuracy + reliability.
   - FE/BE/DB refactor có kiểm soát.
   - KPI/benchmark phục vụ bảo vệ đồ án.
2. Ngoài phạm vi phase đồ án:
   - Không migrate ngay lên Supabase/Postgres.
   - Không triển khai cloud production đầy đủ.
   - Không làm UI xóa tài khoản.

---

## 14) Output cuối kỳ bạn nhận được

1. Bản app ổn định để demo, chạy chắc cả AI ON/OFF.
2. Bộ benchmark định lượng AI + hiệu năng + reliability.
3. Bộ tài liệu đồ án:
   - Kiến trúc thực tế.
   - Bằng chứng chất lượng dữ liệu và mô hình.
   - Hạn chế hiện tại và lộ trình mở rộng cloud hậu đồ án.
4. Runbook vận hành:
   - Cách bật/tắt AI local.
   - Cách xử lý khi AI unavailable.
   - Checklist ngày bảo vệ.

---

## 15) Checklist triển khai ngay (tuần hiện tại)

1. Chốt branch thực thi và task board theo giai đoạn A.
2. Fix `dotnet test` (test package/reference) để có baseline xanh.
3. Fix `npm run typecheck` (TS module + typings lỗi).
4. Hợp nhất Google auth flow và chuẩn JWT policy.
5. Chuyển voice mobile sang gọi backend thay vì cổng AI trực tiếp.
6. Xóa hardcoded key trong `ai-provider/download_dataset.py`.
7. Định nghĩa thống nhất DTO lỗi + DTO AI response.

