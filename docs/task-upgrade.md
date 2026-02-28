# KẾ HOẠCH TASK NÂNG CẤP V2 - CHẾ ĐỘ AI CỤC BỘ CAPSTONE

Cập nhật: 2026-02-27  
Phạm vi: đồ án tốt nghiệp, kiến trúc Hybrid AI Local (AI chạy máy local, app vẫn dùng được khi AI offline).

---

## 1) Chế độ đã chốt

1. AI chạy local trên máy riêng (Ollama + Vision + STT).
2. Mobile không gọi trực tiếp AI local, đi qua Backend.
3. SQL Server local là nguồn dữ liệu chính trong giai đoạn đồ án.
4. Khi AI offline: chỉ tắt tính năng AI, các tính năng thường vẫn hoạt động.

---

## 2) Mục tiêu "chạm trần" cho bản đồ án

1. Ổn định mức production-grade cho đồ án: build xanh, không crash, có fallback rõ ràng.
2. Nâng cấp AI theo hướng kỹ thuật cao: có đo độ tin cậy, có schema output, có router model/fallback.
3. Tăng chất lượng vận hành: quan sát được, test được, replay được lỗi, demo được AI ON/OFF.
4. Tạo nền tảng mở rộng sau đồ án: có lộ trình lên cloud về sau mà không phải viết lại.

---

## 3) KPI kỹ thuật mục tiêu

1. Tỷ lệ crash-free mobile: >= 99.5%.
2. API non-AI p95: < 300ms (LAN/dev).
3. AI request p95: < 3.5s với ảnh chuẩn demo.
4. Tỷ lệ fallback AI hợp lệ khi AI local down: 100%.
5. Tỷ lệ pass CI: 100% (backend test + mobile typecheck + lint).

---

## 4) Backlog triển khai theo luồng

## Luồng S0 - Nền tảng bắt buộc (P0)

- [ ] S0-01: Sửa toàn bộ lỗi `dotnet test` để test backend chạy xanh.
- [ ] S0-02: Sửa toàn bộ lỗi `npm run typecheck` ở mobile.
- [ ] S0-03: Chuẩn hóa CI chạy đúng bộ lệnh local.
- [ ] S0-04: Hoàn tất flow hồ sơ người dùng trên mobile (avatar, mục tiêu, chỉ số, cài đặt thông báo).
- [ ] S0-05: Bổ sung màn Privacy Policy có URL public và link trong app.
- [ ] S0-06: Xóa secrets hardcoded, chuyển sang env/user-secrets.

## Luồng S1 - Nâng cấp lõi AI Local (P1, tác động lớn)

- [ ] S1-01: Chuẩn hóa contract AI response (thống nhất `data`, `source`, `confidence`, `fallbackUsed`, `errorCode`).
- [ ] S1-02: Bắt buộc LLM trả JSON theo schema (structured output) để giảm lỗi parse.
- [ ] S1-03: Thêm model router theo ngữ cảnh:
  - Vision -> Nutrition parser -> Formula fallback.
  - Rule: nếu confidence thấp hoặc timeout thì chuyển fallback ngay.
- [ ] S1-04: Bổ sung AI health state machine:
  - `HEALTHY`, `DEGRADED`, `DOWN`.
  - Backend cache trạng thái trong khoảng ngắn để giảm ping thừa.
- [ ] S1-05: Tạo hàng đợi AI job nhẹ (in-memory queue + cancellation token) để chống nghẽn khi nhiều request cùng lúc.
- [ ] S1-06: Chuẩn hóa timeout/retry/circuit-breaker cho mọi call sang AI local.
- [ ] S1-07: Lưu AI decision log có kiểm soát (prompt version, model, latency, fallback reason) để debug.

## Luồng S2 - Chất lượng mô hình và dữ liệu (P1/P2)

- [ ] S2-01: Quantize model Vision sang ONNX INT8 cho máy yếu, đo lại latency/accuracy.
- [ ] S2-02: Xây benchmark nội bộ cho ảnh món ăn VN (top-1, top-3, phân bố confidence).
- [ ] S2-03: Thiết lập bộ test hồi quy AI:
  - ảnh chuẩn A/B.
  - input voice mẫu.
  - expected range calories/macros.
- [ ] S2-04: Prompt/version registry nhẹ (file-based) để rollback prompt nhanh.
- [ ] S2-05: Tạo data quality pipeline mini:
  - validate đơn vị, macro sum, outlier calories.
  - reject dữ liệu bẩn trước khi vào DB.

## Luồng S3 - SQL Server nâng cấp chiều sâu (P1)

- [ ] S3-01: Thêm temporal tables cho bảng nhạy cảm (profile, meal entries) để audit lịch sử.
- [ ] S3-02: Tạo index strategy dựa trên query thật (food search, meal timeline, analytics range).
- [ ] S3-03: Thêm optimistic concurrency (`rowversion`) cho các cập nhật quan trọng.
- [ ] S3-04: Script backup/restore + diễn tập restore 1 lần/tuần.
- [ ] S3-05: Tách migration script rõ cho môi trường demo và môi trường dev.

## Luồng S4 - Mobile Pro UX + ưu tiên offline (P1)

- [ ] S4-01: Offline-first cache với React Query persistence cho các màn non-AI.
- [ ] S4-02: Smart sync khi online lại (retry queue cho action ghi dữ liệu).
- [ ] S4-03: Trạng thái AI rõ ràng trên UI:
  - Badge "AI offline".
  - Disable CTA AI.
  - Gợi ý phương án nhập tay.
- [ ] S4-04: Skeleton/loading strategy thống nhất cho các màn nặng.
- [ ] S4-05: Chống double-submit và race-condition ở các form chính.
- [ ] S4-06: Nâng accessibility (font scale, contrast, touch target, voice hints).

## Luồng S5 - Quan sát hệ thống, độ tin cậy, bảo mật (P1)

- [ ] S5-01: Structured logging toàn hệ thống (correlation-id xuyên mobile -> backend -> AI).
- [ ] S5-02: OpenTelemetry traces + metrics cơ bản cho API và AI proxy.
- [ ] S5-03: Dashboard vận hành tối thiểu:
  - request rate.
  - error rate.
  - p95 latency.
  - AI availability.
- [ ] S5-04: Feature flags + kill-switch cho module AI để tắt nóng khi có sự cố.
- [ ] S5-05: Contract tests (mobile-service vs backend DTO) để tránh vỡ API ngầm.
- [ ] S5-06: Chaos test nhỏ cho các kịch bản:
  - AI timeout.
  - AI trả malformed JSON.
  - DB reconnect chậm.

## Luồng S6 - Kỹ thuật phát hành và chuẩn bị bảo vệ demo (P0/P1)

- [ ] S6-01: Hoàn chỉnh EAS config + build profile Android internal.
- [ ] S6-02: Staged rollout bằng channel (internal -> beta) cho OTA update.
- [ ] S6-03: Bộ script demo 3 kịch bản:
  - AI ON.
  - AI OFF.
  - Network chập chờn.
- [ ] S6-04: Bộ dữ liệu demo cố định để bảo đảm chạy ổn định ngày bảo vệ.
- [ ] S6-05: Runbook sự cố 1 trang (restart AI, kiểm tra DB, fallback mode).

---

## 5) Nhóm tính năng "Pro Max" nên thêm vào task

- [ ] F-01: Barcode scanner + tra cứu nhanh thực phẩm đóng gói.
- [ ] F-02: Voice + text hybrid input trong cùng một composer.
- [ ] F-03: Nutrition coach card giải thích "vì sao" AI gợi ý như vậy (explainability).
- [ ] F-04: Weekly AI review tự động với insight ưu tiên theo mục tiêu cá nhân.
- [ ] F-05: Meal plan generator theo ngân sách, mục tiêu cân nặng và lịch tập.
- [ ] F-06: Smart reminders theo hành vi thực tế (không spam, có learning đơn giản).
- [ ] F-07: Health Connect đồng bộ bước chân và calories burned (Android).

---

## 6) Kỹ thuật cấp cao nên đưa vào task (không bắt buộc làm hết)

- [ ] T-01: Structured Outputs cho LLM (JSON schema).
- [ ] T-02: Circuit breaker + retry policy chuẩn cho AI proxy.
- [ ] T-03: Model quantization ONNX để tối ưu tốc độ trên phần cứng yếu.
- [ ] T-04: Temporal tables + rowversion cho audit và chống đè dữ liệu.
- [ ] T-05: OpenTelemetry end-to-end tracing.
- [ ] T-06: Query persistence offline-first cho mobile.
- [ ] T-07: Staged rollout OTA bằng EAS Update channel.
- [ ] T-08: Bộ AI eval regression có baseline và ngưỡng fail rõ ràng.

---

## 7) Ưu tiên thi công đề xuất

1. Tuần 1-2: S0 + S6-01 (green baseline, release được).
2. Tuần 3-4: S1 + S4 + S5 (độ ổn định và UX khi AI offline/timeout).
3. Tuần 5-6: S3 + một phần S2 (nâng chất lượng dữ liệu và model).
4. Sau mốc đồ án: hoàn thiện phần còn lại của S2, S5, F-series.

---

## 8) Tiêu chí hoàn thành (Definition of Done) cho bản "Capstone AI Local"

1. App chạy ổn ở cả 2 chế độ AI ON và AI OFF.
2. Các tính năng không AI hoạt động đầy đủ khi AI local tắt.
3. AI response có schema chuẩn, có confidence và lý do fallback.
4. Có dashboard theo dõi lỗi/latency cơ bản.
5. Có thể rollback nhanh qua feature flag và fallback mode.
6. Có kịch bản demo lặp lại được 100% cho ngày bảo vệ.

---

## 9) Ghi chú quyết định kiến trúc

1. Chưa chuyển Supabase/Postgres trong giai đoạn đồ án để tránh rủi ro migration.
2. Chưa ép full-cloud production trong giai đoạn đồ án.
3. Thiết kế task theo hướng cloud-ready để sau đồ án có thể nâng cấp dần.

---

## 10) Tài liệu kỹ thuật tham chiếu (official)

1. Ollama Structured Outputs: https://docs.ollama.com/capabilities/structured-outputs
2. ONNX Runtime Quantization: https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html
3. React Query Persistence (AsyncStorage): https://tanstack.com/query/v5/docs/framework/react/plugins/createAsyncStoragePersister
4. SQL Server Temporal Tables: https://learn.microsoft.com/en-us/sql/relational-databases/tables/temporal-tables
5. SQL Server `rowversion`: https://learn.microsoft.com/en-us/sql/t-sql/data-types/rowversion-transact-sql
6. .NET HTTP Resilience (retry/circuit breaker): https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience
7. .NET Observability with OpenTelemetry: https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-prgrja-example
8. Expo EAS Update rollout/channels: https://docs.expo.dev/eas-update/deployment/

