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

## Phụ lục: Kế hoạch nâng cấp bản đơn giản cho team 2 sinh viên

### 0) Chốt phạm vi
1. Kế hoạch này chỉ để **đọc code + phân tích + lên plan**, **không sửa code ngay**.
2. Mục tiêu: app vẫn chạy ổn, nhưng nâng lên mức dễ debug, tin cậy hơn, đẹp hơn, và sẵn sàng Store.
3. Cách làm: chia nhỏ theo sprint, mỗi sprint có kết quả đo được, tránh “đập đi làm lại”.

### 1) Tóm tắt hiện trạng (fact-based)
1. Có lỗi Unicode/mojibake ở nhiều file mobile/backend (ký tự `�`, chữ tiếng Việt vỡ).
2. Mobile hiện có lỗi typecheck/test env (xung đột dependency + lỗi type thực tế), nên “chạy được” nhưng chưa “green” về kỹ thuật.
3. Backend có nhiều chỗ xử lý lỗi chưa thống nhất (vừa middleware chuẩn, vừa trả `ex.Message` thủ công ở controller).
4. Auth/Google flow đang bị chồng 2 luồng endpoint, dễ drift.
5. Workflow onboarding/auth có nguy cơ lệch stack điều hướng (auth state và màn onboarding chưa thống nhất).
6. DB đang có dấu hiệu 2 context + model trùng tên, khó debug/migration về sau.
7. UI có nhiều màn hình quá dài (700+ dòng), khó bảo trì, khó sửa nhanh.
8. Store readiness chưa đủ chắc (Sign in with Apple, policy, metadata, checklist phát hành).

### 2) Mục tiêu kỹ thuật sau nâng cấp
1. Repo “xanh”: backend build/test cơ bản pass, mobile typecheck pass, test quan trọng pass.
2. Không còn lỗi Unicode trong text hiển thị và code comment quan trọng.
3. Lỗi API trả về một chuẩn duy nhất, mobile parse ổn định.
4. Workflow user rõ ràng: đăng ký/login/verify/onboarding/AI scan/save diary không vòng lặp lỗi.
5. AI output có mức tin cậy (confidence) + fallback khi AI không chắc.
6. Có checklist đầy đủ để nộp iOS + Android.
7. Source code gọn, chia lớp rõ, dễ debug cho team 2 người.

### 3) Quyết định kiến trúc (đã chốt để khỏi phải chọn lại)
1. **Giữ kiến trúc hiện tại**: Mobile (Expo RN) + Backend (.NET) + AI Provider (Flask), không tách microservice thêm.
2. **Backend contract-first nhẹ**: OpenAPI làm chuẩn giao tiếp, mobile dùng client thống nhất.
3. **Một chuẩn lỗi API**: `application/problem+json` cho 4xx/5xx.
4. **Một nguồn logic dinh dưỡng chính**: backend quyết định final nutrition; AI chỉ gợi ý + confidence.
5. **Một DB context chuẩn** (chốt 1 context làm “owner”), context còn lại đưa vào lộ trình gom.
6. **Dev/prod tách rõ**: discovery LAN chỉ dùng dev, production không phụ thuộc scan IP.

### 4) Thay đổi public API / interface / type (bắt buộc)
1. Chuẩn lỗi API:
   - Trả về: `type`, `title`, `status`, `detail`, `instance`, `traceId`.
   - Mobile phải parse theo schema này trước.
2. AI response chuẩn:
   - Thêm/giữ rõ: `label`, `confidence`, `source`, `modelVersion`.
   - Nếu `confidence` thấp: backend trả cờ yêu cầu người dùng xác nhận.
3. Auth contract:
   - Giữ format token hiện tại để không phá app.
   - Chỉ đổi xử lý nội bộ và error message.
4. Discovery:
   - `/discovery` giữ cho dev.
   - Build production không gọi flow này.
5. Food endpoints:
   - Giữ endpoint cũ trong 1 sprint (compat).
   - Thêm nhãn deprecated, sau đó gom về route chuẩn.

### 5) Kế hoạch triển khai theo sprint (team 2 người)

### Sprint 0 (2-3 ngày) — “Làm sạch nền”
1. Unicode cleanup:
   - Quét toàn repo lỗi `�` và mojibake.
   - Chuyển file text/code về UTF-8 thống nhất.
   - Ưu tiên các file đang ảnh hưởng UI và message.
2. Build baseline:
   - Chốt 1 cách cài mobile dependency ổn định (lockfile + version pin).
   - Backend test project restore/build ổn định.
3. Kết quả cần đạt:
   - Không còn text vỡ ở màn hình chính.
   - Có tài liệu “cách chạy local 1 lệnh” cho 2 bạn.

Phân công:
1. Bạn A: backend/test env.
2. Bạn B: mobile dependency + unicode UI.
3. Cả hai: review chéo.

### Sprint 1 (1 tuần) — “Ổn định lỗi và debug”
1. Backend:
   - Chuẩn hóa error handling, bỏ trả `ex.Message` trực tiếp ở controller.
   - Log có `traceId`, mask token/PII, giảm log rác.
2. Mobile:
   - Chuẩn adapter parse lỗi mới (vẫn tương thích lỗi cũ trong 1 sprint).
   - Hiển thị lỗi thân thiện khi backend/AI down.
3. Kết quả cần đạt:
   - Lỗi 4xx/5xx trả cùng 1 schema.
   - Có thể tra 1 lỗi từ mobile sang backend bằng `traceId`.

### Sprint 2 (1 tuần) — “Workflow và Userflow chuẩn”
1. Rà toàn bộ flow:
   - Register -> Verify -> Onboarding -> Home.
   - Login/Google -> Onboarding nếu chưa hoàn thành.
   - AI Scan -> Confirm -> Save Diary.
2. Sửa các điểm chồng luồng:
   - Một nguồn sự thật cho auth state.
   - Onboarding route rõ ở stack phù hợp.
3. Kết quả cần đạt:
   - Không còn loop điều hướng.
   - 6 flow chính chạy liên tục không crash.

### Sprint 3 (1 tuần) — “Tăng độ tin cậy AI”
1. Confidence policy:
   - Đặt ngưỡng chung (ví dụ: high/medium/low).
   - Low confidence thì bắt buộc user confirm.
2. Telemetry AI:
   - Ghi `latency`, `confidence`, `fallback`, `user correction`.
3. Fallback khi AI lỗi:
   - AI provider down -> app vẫn cho nhập tay/search.
4. Kết quả cần đạt:
   - Không có tình huống AI lỗi làm chặn ghi meal.
   - Bắt đầu đo được “AI đúng đến đâu”.

### Sprint 4 (1 tuần) — “UI/UX chuyên nghiệp hơn”
1. Design system nhẹ:
   - Màu, font, spacing, radius, shadow thống nhất.
2. Tách màn hình quá dài:
   - Mỗi màn >700 dòng tách thành container + hook + component.
3. Tối ưu hiệu năng:
   - Giảm re-render, tối ưu list, loading/skeleton nhất quán.
4. Kết quả cần đạt:
   - UI đồng bộ, nhìn gọn.
   - Màn chính mượt hơn (đo bằng thời gian mở màn và FPS tương đối).

### Sprint 5 (1 tuần) — “Store readiness”
1. iOS:
   - Nếu giữ Google login => thêm Sign in with Apple.
   - ATS/HTTPS đúng chuẩn.
   - Privacy Policy/Terms link hoạt động.
2. Android:
   - Data Safety khai đúng.
   - Quyền camera/mic/storage tối thiểu cần thiết.
3. Kết quả cần đạt:
   - Checklist pre-submit đầy đủ cho cả 2 store.
   - Có build thử nội bộ (TestFlight/Internal testing).

### Sprint 6 (1 tuần) — “DB + CI + docs canonical”
1. DB:
   - Chốt 1 DbContext chính.
   - Lập kế hoạch gom context/model trùng, không làm gãy runtime.
   - Thêm index cho truy vấn thường dùng (meal diary, user, date).
2. CI tối thiểu:
   - Backend: restore/build/test.
   - Mobile: install/typecheck/test.
   - AI: syntax/lint check.
3. Docs:
   - Giữ 2 file canonical:
     - [BAO_CAO_DANH_GIA_CONG_NGHE_VA_CACH_LAM_HIEN_TAI_2026-02-26.md](./BAO_CAO_DANH_GIA_CONG_NGHE_VA_CACH_LAM_HIEN_TAI_2026-02-26.md)
     - [KE_HOACH_NANG_CAP_PHAT_TRIEN_APP_2026-02-26.md](./KE_HOACH_NANG_CAP_PHAT_TRIEN_APP_2026-02-26.md)
4. Kết quả cần đạt:
   - PR nào cũng qua quality gate cơ bản.
   - Người mới vào team đọc 2 file là nắm được toàn dự án.

### 6) Kế hoạch xử lý Unicode (chi tiết, dễ làm)
1. Quét lỗi:
   - Tìm ký tự `�` và chuỗi tiếng Việt vỡ trong repo.
2. Chốt chuẩn:
   - Toàn bộ code/docs dùng UTF-8.
3. Sửa theo mức ưu tiên:
   - Ưu tiên text hiển thị người dùng thấy trước.
   - Sau đó comment/dev docs.
4. Chặn tái phát:
   - Thêm rule editorconfig/gitattributes về encoding.
   - PR checklist có mục “Unicode/encoding”.
5. Acceptance:
   - Không còn text vỡ ở màn chính/auth/stats/settings.
   - Snapshot UI không còn ký tự lỗi.

### 7) Kế hoạch tối ưu database (thực tế cho team 2 người)
1. Chọn context owner:
   - Dùng context nào hiện đang bao phủ nghiệp vụ chính làm chuẩn.
2. Lập bảng mapping:
   - Model nào trùng tên, model nào chỉ dùng tạm.
3. Gom dần:
   - Sprint 6 chỉ gom lớp truy cập trước.
   - Migration dữ liệu lớn làm sau khi app ổn định.
4. Quy tắc mới:
   - Mỗi bảng có owner rõ.
   - Không tạo model trùng tên khác namespace nếu không bắt buộc.
5. Acceptance:
   - Tài liệu ERD đơn giản có thật.
   - Query chính có index, API không chậm đi.

### 8) Checklist App Store + Google Play (bắt buộc)
1. iOS:
   - Sign in with Apple (nếu có Google sign-in).
   - ATS/HTTPS.
   - Privacy policy URL.
   - Mô tả quyền camera/mic rõ, không text lỗi Unicode.
2. Android:
   - Data Safety form đầy đủ.
   - Privacy policy URL public.
   - Permission tối thiểu.
3. Cả hai:
   - Ảnh screenshot chuẩn.
   - Điều khoản sử dụng/riêng tư truy cập được.
   - Build release chạy qua smoke test 10 phút.

### 9) Test cases bắt buộc trước mỗi release
1. Auth:
   - Register, verify OTP, login, logout, refresh token.
2. Workflow:
   - Login mới có onboarding.
   - User cũ vào thẳng Home.
3. AI:
   - Scan thành công.
   - Scan confidence thấp -> bắt xác nhận.
   - AI down -> nhập tay vẫn lưu được meal.
4. Data:
   - Save meal, sửa meal, xóa meal, stats cập nhật đúng.
5. Error:
   - 400/401/404/500 đúng schema.
   - Mobile hiển thị lỗi dễ hiểu.
6. Store smoke:
   - iOS/Android release build mở app, login, scan, save meal không crash.

### 10) KPI kỹ thuật cho team 2 người (dễ đo)
1. Build pass rate CI >= 90%.
2. Mobile typecheck pass 100% trước merge.
3. Lỗi 5xx có traceId: 100%.
4. Lỗi Unicode còn lại: 0 ở màn người dùng nhìn thấy.
5. AI correction rate giảm theo sprint (mục tiêu ban đầu < 35%).
6. Tỷ lệ hoàn thành log meal > 75% trong test nội bộ.

### 11) Rủi ro chính và cách giảm
1. Rủi ro: sửa error schema làm mobile lỗi parse.
   - Giảm: hỗ trợ parse 2 schema trong 1 sprint.
2. Rủi ro: refactor màn lớn gây bug.
   - Giảm: tách nhỏ theo PR, giữ behavior cũ, có test flow chính.
3. Rủi ro: siết log quá chặt khó debug.
   - Giảm: giữ log level theo môi trường, có debug flag dev.
4. Rủi ro: gom DB quá sớm làm gãy dữ liệu.
   - Giảm: chỉ gom access layer trước, migration dữ liệu làm sau.

### 12) Assumptions và default đã chốt
1. Team 2 người, ưu tiên tốc độ + an toàn, không làm kiến trúc quá nặng.
2. App hiện chạy được; mục tiêu là tăng độ ổn định và chất lượng.
3. Không microservice hóa trong giai đoạn này.
4. Không đổi nghiệp vụ cốt lõi trong Sprint 0-2.
5. Mọi thay đổi đi theo PR nhỏ, rollback được.
6. Tất cả triển khai dựa trên nhánh mới nhất bạn đang dùng, không dùng `main` cũ làm chuẩn.