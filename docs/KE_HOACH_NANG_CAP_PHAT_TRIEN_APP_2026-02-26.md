# KẾ HOẠCH NÂNG CẤP THỰC THI EATFITAI (CANONICAL EXECUTION PLAN)

- Dự án: `EatFitAI_v1`
- Phiên bản: `v2-hợp nhất` (26/02/2026)
- Mục tiêu: chuyển từ `feature-driven` sang `reliable engineering` trong 6 tháng.

## 1. Phạm vi tài liệu
Tài liệu này là **kế hoạch thực thi chuẩn**, dùng để điều phối sprint và release.

Phân tích sâu, bằng chứng kỹ thuật và backlog đầy đủ nằm tại:
1. [BÁO CÁO NGHIÊN CỨU HỢP NHẤT](./BAO_CAO_DANH_GIA_CONG_NGHE_VA_CACH_LAM_HIEN_TAI_2026-02-26.md)

## 2. Đánh giá nhanh kế hoạch hiện tại
### 2.1 Điểm mạnh
1. Ưu tiên đúng thứ tự P0 -> P1 -> P2.
2. Bám đúng rủi ro lõi của repo: security, API consistency, AI reliability, test/CI, store readiness.
3. Có KPI và roadmap theo giai đoạn, phù hợp team 4-6 người.

### 2.2 Điểm cần chỉnh (đã chỉnh trong bản hợp nhất)
1. Không kết luận sai trạng thái New Architecture: Android đang bật `newArchEnabled=true` và Hermes.
2. Không diễn đạt cứng "Declared Age Range bắt buộc toàn cầu"; áp dụng theo vùng pháp lý.
3. Tránh trùng lặp nhiều bản roadmap; chốt 1 nguồn thực thi để tránh lệch ưu tiên.

## 3. Mục tiêu 6 tháng
1. Security baseline đạt chuẩn production cho auth/API.
2. API contract ổn định, giảm bug tích hợp FE/BE.
3. AI có cơ chế fallback và telemetry theo confidence.
4. Test + CI quality gate đủ chặn regression.
5. Đủ điều kiện submission lên App Store/Google Play.

## 4. Nguyên tắc thực thi
1. `Security-first`: mọi hạng mục P0 bảo mật phải hoàn tất trước tính năng mới.
2. `Contract-first`: thay đổi API phải có OpenAPI + contract test.
3. `Measure-first`: không ship nếu không có chỉ số theo dõi.
4. `One owner, one deadline`: mỗi action item có owner rõ ràng.

## 5. Roadmap chuẩn (không trùng lặp)
## Giai đoạn 0 (0-14 ngày, P0 bắt buộc)
### Mục tiêu
Khóa toàn bộ rủi ro có thể gây sự cố production/reject store ngay lập tức.

### Deliverables bắt buộc
1. Migrate password hash sang adaptive hash (Argon2id/BCrypt) + progressive rehash.
2. Gỡ JWT fallback secret, fail-fast khi thiếu key.
3. Siết CORS theo whitelist môi trường.
4. Chuẩn hóa lỗi API theo RFC7807, không lộ `ex.Message` ra client.
5. Sửa seeder/social-account logic rủi ro.
6. Chuẩn hóa route food detail `/api/food/{id}`.
7. Hợp nhất flow Google auth (không còn nhánh NotImplemented).
8. Bật cleanup file tạm AI provider.
9. Đổi check Ollama từ static sang runtime health-check.
10. Dựng CI workflow tối thiểu: lint -> build -> unit test.

### Exit criteria
1. `0` fallback secret trong runtime.
2. `0` endpoint lộ lỗi nội bộ.
3. Temp file AI không tăng tích lũy theo thời gian.
4. PR không pass gate thì không merge.

## Giai đoạn 1 (2-8 tuần, P1)
### Mục tiêu
Ổn định chất lượng delivery + tăng độ tin cậy sản phẩm.

### Deliverables
1. Ổn định test infra backend/mobile.
2. Integration tests cho luồng lõi (auth, meal, AI detect).
3. Contract governance (OpenAPI versioning + typegen drift check).
4. Structured logging + redaction + correlation id.
5. Dashboard v1: p95 latency, error rate, AI timeout, CI pass rate.
6. Sign in with Apple end-to-end.
7. HTTPS production baseline + ATS-compatible path.

### Exit criteria
1. CI pass rate >= 95%.
2. Flaky test rate < 2%.
3. App có thể chạy internal beta với pipeline ổn định.

## Giai đoạn 2 (2-6 tháng, P2)
### Mục tiêu
Tạo lợi thế cạnh tranh bền vững (VN-first + AI-first + local-food-depth).

### Deliverables
1. Canonical taxonomy món Việt + workflow verified data.
2. Confidence-driven HITL loop -> data retrain pipeline.
3. Offline queue cho meal logging + sync strategy.
4. Gamification v2 (streak + weekly review actions).
5. Release train 2 tuần/lần + monthly security review.

### Exit criteria
1. Logging completion >= 80%.
2. AI acceptance >= 70%.
3. D7 +8 điểm %, D30 +5 điểm % (theo cohort).

## 6. Backlog ưu tiên thực thi (Top 12 từ backlog chuẩn)
1. Replace SHA-256 password hashing.
2. Remove JWT fallback secret.
3. Restrict CORS by env whitelist.
4. Global RFC7807 error handling.
5. Fix seeder/social hash-null risk.
6. Normalize food detail route contract.
7. Consolidate Google auth flow.
8. Enable AI temp file cleanup.
9. Runtime Ollama health strategy.
10. Create minimal CI quality gates.
11. Stabilize backend/mobile test infra.
12. Sign in with Apple + HTTPS/ATS baseline.

Chi tiết backlog đầy đủ 30 hạng mục, dependencies, effort, KPI:
1. [Mục 13 trong báo cáo hợp nhất](./BAO_CAO_DANH_GIA_CONG_NGHE_VA_CACH_LAM_HIEN_TAI_2026-02-26.md#13-top-30-action-backlog-ưu-tiên-tuyệt-đối)

## 7. KPI vận hành bắt buộc
### Technical
1. Non-AI API p95 < 200ms.
2. AI API p95 < 3s.
3. 5xx < 0.1%.
4. CI pass >= 95%.

### Product
1. Logging completion >= 80%.
2. D7 +8 điểm %, D30 +5 điểm %.

### AI/Data
1. AI acceptance >= 70%.
2. HITL correction rate theo dõi theo món/cohort.
3. % món VN có source/version/verified tăng theo tháng.

## 8. Cơ chế quản trị
1. Sprint 2 tuần, review KPI hàng tuần.
2. Change review bắt buộc 2 người cho auth/security/AI core.
3. DoD bắt buộc: lint + test + security check + docs update.

## 9. Chuẩn hóa tài liệu (để không trùng lặp)
### Canonical docs
1. `docs/BAO_CAO_DANH_GIA_CONG_NGHE_VA_CACH_LAM_HIEN_TAI_2026-02-26.md` (phân tích sâu + backlog đầy đủ).
2. `docs/KE_HOACH_NANG_CAP_PHAT_TRIEN_APP_2026-02-26.md` (kế hoạch thực thi chuẩn - tài liệu này).

### Deprecated docs (chuyển hướng)
1. `docs/MASTER_WORKFLOW_PLAN_2026.md`
2. `docs/KE_HOACH_PHAT_TRIEN.md`

## 10. Kết luận hành động
1. 14 ngày đầu chỉ tập trung P0 và không mở thêm scope mới.
2. Sau khi khóa P0, chuyển ngay sang P1 để ổn định pipeline và store readiness.
3. P2 chỉ bắt đầu khi P0/P1 đạt exit criteria.
