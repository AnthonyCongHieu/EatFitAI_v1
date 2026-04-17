# BÁO CÁO NGHIÊN CỨU HỢP NHẤT VÀ KẾ HOẠCH CẢI THIỆN TOÀN DIỆN EATFITAI_V1

- Dự án: `EatFitAI_v1`
- Ngày snapshot kỹ thuật: **26/02/2026**
- Tài liệu hợp nhất từ:
1. Báo cáo audit codebase hiện trạng (repo local).
2. Báo cáo nghiên cứu chiến lược và đề xuất cải tiến mở rộng.
- Mục tiêu: hợp nhất 2 báo cáo, sửa các điểm chưa chính xác, chuyển thành kế hoạch thực thi được ngay cho team 4-6 người.

## 1. Executive Summary
EatFitAI đã có nền tảng chức năng tốt cho bài toán ghi log dinh dưỡng bằng AI (ảnh + giọng nói) và theo dõi macro/calories cho thị trường Việt Nam. Tuy nhiên, ở thời điểm 26/02/2026, hệ thống còn các rủi ro P0/P1 có thể cản trực tiếp việc scale và phát hành production ổn định:

1. Bảo mật lõi còn yếu (SHA-256 trực tiếp cho password, JWT fallback key, CORS mở rộng, trả lỗi nội bộ ra client).
2. API/domain chưa nhất quán (route drift food detail, luồng Google auth chồng chéo, nutrition ownership bị tách mảnh).
3. AI reliability chưa đủ production-grade (cleanup file tạm bị tắt, health check Ollama dạng tĩnh, nhiều config hardcode).
4. Delivery discipline chưa chặt (chưa thấy pipeline CI/CD trong repo, test infra chưa chạy ổn định trên môi trường chuẩn).
5. Store readiness chưa đạt (chưa có Sign in with Apple dù có Google Sign-In; chưa có bộ submission artifacts đầy đủ: privacy/terms/public URL, HTTPS production-first).

Kết luận điều hành: nếu không xử lý các hạng mục P0 trong 14 ngày, mọi cải tiến tính năng sẽ tiếp tục tích lũy nợ kỹ thuật. Nếu xử lý đúng thứ tự P0 -> P1 -> P2, EatFitAI có thể chuyển từ trạng thái feature-driven sang reliable engineering trong 6 tháng, đồng thời giữ lợi thế định vị “VN-first + AI-first + local-food-depth”.

## 2. Current State Scorecard
| Trục | Điểm (0-10) | Root causes chính | Tác động kỹ thuật | Tác động sản phẩm | Tác động business |
|---|---:|---|---|---|---|
| Security & Privacy | 3 | SHA-256 trực tiếp; JWT fallback; CORS wildcard + credentials; lỗi lộ `ex.Message` | Tăng bề mặt tấn công, nguy cơ token/password compromise | Giảm niềm tin người dùng | Rủi ro pháp lý và sự cố bảo mật lớn |
| API & Architecture Consistency | 4 | Route drift; auth flow trùng; nutrition domain overlap; 2 DbContext chồng lấn | Tăng bug tích hợp, khó refactor | Trải nghiệm lỗi không nhất quán | Giảm tốc độ release |
| AI Quality & Reliability | 4 | Cleanup file tạm bị tắt; Ollama availability tĩnh; config hardcode | Dễ timeout/fail kéo dài, khó tự hồi phục | Tỷ lệ nhận diện sai/treo cao hơn | Tăng cost vận hành, giảm retention |
| Data Quality & Nutrition Governance | 4 | Chưa có governance rõ cho dữ liệu món Việt + versioning + confidence | Khó audit tính đúng đắn dữ liệu | Khuyến nghị dinh dưỡng thiếu ổn định | Khó tạo “data moat” bền vững |
| Mobile UX & Performance | 6 | State ownership chưa gọn; nhiều log debug; mạng phụ thuộc HTTP dev flow | Re-render/lệch cache, khó tối ưu | Tác vụ log bữa ăn chưa đủ mượt | Ảnh hưởng activation/D7 |
| Testing & QA | 3 | Test infra lỗi môi trường; coverage thấp ở lõi nghiệp vụ; thiếu E2E ổn định | Regression khó kiểm soát | Lỗi runtime lọt production | Chi phí sửa nóng tăng |
| DevOps & Observability | 3 | Chưa thấy CI workflow trong repo; thiếu metrics/tracing chuẩn | Khó phát hiện sớm sự cố | Sự cố kéo dài, khó triage | Giảm độ tin cậy vận hành |
| Store Readiness & Compliance | 3 | Thiếu Sign in with Apple; HTTPS/ATS chưa chuẩn production; thiếu legal pages hoàn chỉnh | Build/release dễ bị chặn | Chậm lên store | Chậm doanh thu và tăng chi phí go-to-market |

## 3. Top Findings (đã hợp nhất + hiệu đính)
> Sắp xếp theo mức độ `Critical -> High -> Medium`, có bằng chứng kỹ thuật tại repo hiện tại.

| # | Severity | Vấn đề gốc | Bằng chứng kỹ thuật | Giải pháp cụ thể | Effort | Impact | Rủi ro triển khai | Acceptance criteria | KPI theo dõi |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | Critical | Password hash dùng SHA-256 trực tiếp | `eatfitai-backend/Services/AuthService.cs:241,251,434`; `Data/DatabaseSeeder.cs:298-300` | Chuyển Argon2id/BCrypt + migrate dần lúc login | M | Chặn brute-force offline | Tăng CPU auth | 100% tài khoản mới dùng adaptive hash | `% adaptive hash users` |
| 2 | Critical | JWT key fallback mặc định yếu | `Program.cs:172`; `AuthService.cs:168,211`; `GoogleAuthController.cs:280` | Fail-fast nếu thiếu secret; dùng secret manager | S | Ngăn forge token | Lỗi boot nếu cấu hình sai | Không còn fallback trong code | `0 fallback secret` |
| 3 | Critical | CORS mở quá rộng (`*` + credentials) | `Program.cs:50,53,227` | Whitelist origin theo env; tách policy dev/prod | S | Giảm tấn công cross-origin | Có thể block client chưa khai báo | Origin lạ bị chặn, origin hợp lệ pass | `% CORS blocked (expected)` |
| 4 | Critical | Trả lỗi nội bộ ra client | Nhiều controller trả `ex.Message` (ví dụ `AIController.cs`, `AuthController.cs`) | Dùng `ProblemDetails` chuẩn RFC7807 + correlation id | M | Giảm rò rỉ nội bộ | Mất chi tiết nếu log kém | 4xx/5xx chuẩn JSON thống nhất | `% response chuẩn RFC7807` |
| 5 | Critical | Seeder có rủi ro gán password cho user hash null | `Data/DatabaseSeeder.cs:303,313` + seeding ở `Program.cs:190` | Loại bỏ logic này, tách path social/local account rõ | S | Ngăn account takeover | Ảnh hưởng dữ liệu test cũ | Seeder không thay đổi password social users | `0 social users bị gán hash` |
| 6 | High | Route drift food detail | Backend `FoodController.cs:10,71`; mobile `foodService.ts:148`; test `foodService.test.ts:92`; types `api.d.ts:173` | Chuẩn hóa `/api/food/{id}` + alias tạm tương thích | S | Giảm bug tích hợp FE/BE | Cần update client đồng bộ | FE/BE/tests cùng pass 1 contract | `404 rate endpoint food detail` |
| 7 | High | Auth Google chồng chéo, một nhánh chưa implement | `AuthController.cs:208` gọi `GoogleLoginAsync`; `AuthService.cs:326` ném `NotImplementedException`; tồn tại `GoogleAuthController` riêng | Chốt một flow canonical, deprecate flow còn lại | M | Giảm dead code và bug auth | Cần migration client | Chỉ còn 1 flow auth Google chính thức | `auth failure rate` |
| 8 | High | Nutrition domain bị phân mảnh nhiều controller | `AIController` + `NutritionController` cùng xử lý target/insight | Gom ownership về Nutrition domain service thống nhất | M | Dễ bảo trì logic | Refactor có regression | Có source of truth duy nhất cho nutrition | `defect density nutrition` |
| 9 | High | 2 DbContext chồng lấn | `DbScaffold/Data/EatFitAIDbContext.cs` và `Data/ApplicationDbContext.cs` | Quy định ranh giới rõ hoặc hợp nhất dần | M | Giảm drift schema/migration lỗi | Migration phức tạp | Quy tắc context ownership được tài liệu hóa | `% migration incident` |
| 10 | High | AI provider không cleanup file tạm | `ai-provider/app.py:246` (`os.remove(path)` bị comment) | Bật cleanup `try/finally`, retry nhẹ, cron sweep | S | Tránh đầy đĩa | Xóa nhầm file nếu path sai | Temp files được xóa sau request | `temp disk growth` |
| 11 | High | OLLAMA availability check tĩnh | `ai-provider/nutrition_llm.py:73` và nhiều nhánh dùng biến tĩnh | Đổi sang health-check runtime + TTL cache ngắn | M | Tăng khả năng tự hồi phục | Tăng số call health check | Ollama recover không cần restart app | `AI recovery time` |
| 12 | High | Hardcode môi trường mobile/AI URL | `src/config/env.ts`; `src/utils/imageHelpers.ts`; `voiceService.ts` fallback URL | Chuẩn hóa env config theo stage; cấm hardcode prod | S | Giảm lỗi deploy | Cần cập nhật script local dev | Không còn URL prod/dev hardcode | `config drift incidents` |
| 13 | High | Logging debug dày, có nguy cơ lộ dữ liệu | Nhiều `Console.WriteLine` backend + `console.log` mobile | Structured logging + redaction + log level policy | M | Tăng an toàn và quan sát | Mất log hữu ích nếu cấu hình sai | Mask PII/token trước khi lưu | `% logs with PII` |
| 14 | High | Thiếu pipeline CI/CD trong repo | Chưa thấy `.github/workflows` | Tạo pipeline lint/build/test/security tối thiểu | M | Tăng chất lượng merge | Build time tăng | PR không pass gate thì không merge | `CI pass rate` |
| 15 | High | Test infra chưa ổn định | Backend testhost missing dll; mobile test env lệch | Chuẩn hóa test command + lock toolchain | M | Giảm flaky | Cần sửa setup dev machines | `dotnet test` và `npm test` pass chuẩn | `flaky rate` |
| 16 | High | Store risk: có Google Sign-In nhưng thiếu Apple Sign-In | `package.json` có Google Sign-In; `app.json` chưa có Apple auth plugin | Thêm Sign in with Apple end-to-end | M | Tránh App Store reject | Cần Apple Dev setup | Login Apple hoạt động trên iOS build | `App Review pass` |
| 17 | High | ATS/HTTPS production chưa chuẩn hóa | Nhiều endpoint/dev flow còn HTTP | Buộc HTTPS production, ATS compatible | M | Tránh network block/reject | Cần cert + infra | iOS build pass ATS checks | `% HTTPS traffic` |
| 18 | Medium | API error schema chưa thống nhất | Các controller trả JSON lỗi khác nhau | Chuẩn hóa lỗi một format duy nhất | S | FE xử lý lỗi đơn giản hơn | Cần migrate FE parser | 100% endpoint theo schema lỗi mới | `frontend error parse failures` |
| 19 | Medium | OpenAPI typegen path có nguy cơ drift | script typegen output lệch hướng sử dụng | Chốt 1 output path + CI contract check | S | Giảm sai lệch type contract | Cần sửa script | Generated type luôn đồng bộ swagger | `contract drift count` |
| 20 | Medium | AI chưa có confidence-driven UX chuẩn | Luồng scan có chỉnh tay nhưng chưa tiêu chuẩn hóa threshold toàn hệ thống | Áp ngưỡng confidence + HITL bắt buộc với low-confidence | M | Tăng độ chính xác log | Có thể tăng thao tác user | Low-confidence luôn qua confirm UI | `HITL correction rate` |
| 21 | Medium | Observability thiếu metrics lõi AI | Chưa có tracing/metrics chuẩn inference | Thêm metrics: latency, timeout, confidence, fallback | M | Tối ưu AI dựa dữ liệu thật | Alert noise ban đầu | Dashboard hoạt động theo SLO | `p95 AI latency` |
| 22 | Medium | Chiến lược dữ liệu món Việt chưa có governance đầy đủ | Chưa có quy trình source/version/verified rõ | Thiết kế canonical taxonomy + review workflow | L | Tạo data moat dài hạn | Tốn nguồn lực data ops | Mỗi món có source + version + verified state | `% verified VN foods` |

## 4. Strategic Positioning (12 tháng)
### 4.1 Nên cạnh tranh bằng gì
1. Độ sâu món Việt có kiểm chứng (`local-food-depth`): ít hơn về số lượng nhưng mạnh về độ tin cậy.
2. UX log bữa ăn siêu ngắn (`capture -> confirm -> save`) với ảnh + giọng nói tiếng Việt.
3. AI có kiểm soát (confidence + HITL + telemetry) thay vì “AI tự quyết toàn bộ”.
4. Reliability trước tính năng mới: giảm fail/timeout, tăng niềm tin sử dụng hằng ngày.

### 4.2 Không nên cạnh tranh bằng gì
1. Không chạy theo số lượng thực phẩm khổng lồ kiểu toàn cầu khi chưa có governance.
2. Không mở rộng quá rộng sang coaching chuyên sâu tốn người (1:1 coach) trong 12 tháng đầu.
3. Không dàn trải nhiều feature ít dùng làm tăng phức tạp UX và vận hành.

### 4.3 Vị thế mục tiêu
- Định vị sản phẩm: “Trợ lý ghi log và điều chỉnh dinh dưỡng cho bữa ăn Việt, nhanh và đáng tin hơn các app global tại Việt Nam”.

## 5. Target Architecture & Operating Model
### 5.1 Kiến trúc mục tiêu khả thi cho team nhỏ
1. Giữ kiến trúc modular monolith cho backend trong 6 tháng tới (không tách microservice sớm).
2. API gateway/reverse proxy tại edge (Nginx/Traefik) cho TLS, rate-limit, routing.
3. AI provider vẫn tách process nhưng thêm reliability layer: queue nhẹ + timeout + health check runtime + fallback.
4. Data layer: chuẩn hóa ownership (DbContext/domain ownership), event nhẹ cho telemetry.

### 5.2 Mobile runtime
1. Android đã bật `newArchEnabled=true` và Hermes; cần benchmark thực tế thay vì giả định “chưa bật”.
2. Tách ownership state:
   - TanStack Query: server state.
   - Zustand: UI/local workflow state.
3. Chuẩn hóa offline queue cho meal log (đồng bộ khi online).

### 5.3 Operating model
1. Team 4-6 người theo sprint 2 tuần, 1 release train/2 tuần.
2. Definition of Done bắt buộc: lint + unit/integration tests + security checks + docs cập nhật.
3. Change approval theo risk: security/auth/AI core bắt buộc review 2 người.

## 6. Security Hardening Blueprint
| Hạng mục | Vấn đề gốc | Giải pháp | Effort | Trade-off | Acceptance criteria | KPI |
|---|---|---|---|---|---|---|
| Password Hashing | SHA-256 trực tiếp | Argon2id/BCrypt + migrate dần | M | Tăng CPU auth | 100% user mới dùng adaptive hash | `% adaptive hash` |
| JWT Secrets | Fallback key | Fail-fast, secret manager, rotation | S | Tăng độ phức tạp config | App không chạy nếu thiếu key | `0 fallback` |
| CORS | Allow all + credentials | Whitelist theo env | S | Dễ block client nếu thiếu config | Origin không hợp lệ bị chặn | `CORS violation trend` |
| Error Leak | Trả `ex.Message` | RFC7807 + correlation id | M | Cần logging tốt | Không lộ stack trace ra client | `% sanitized errors` |
| Social/Seeder | Gán hash cho hash-null users | Tách account type + bỏ logic seeder rủi ro | S | Cần migration dữ liệu | Không auto-set password social account | `account takeover incidents` |
| Logging Security | PII có thể lọt log | Redaction/token masking policy | M | Giảm tiện debug thô | Log production không chứa token/email full | `% PII redaction` |
| API brute-force | Thiếu hạn mức tại auth | Rate limiting theo IP/user | S | false-positive block | Hạn mức hiệu lực ở auth endpoints | `blocked auth attacks` |

## 7. API & Domain Refactor Blueprint
### 7.1 Contract governance
1. Chốt OpenAPI làm source of truth, versioned (`/api/v1/...`).
2. Contract tests (consumer-driven) cho endpoint quan trọng (auth, food detail, meal diary).
3. Quy tắc naming + error schema thống nhất toàn hệ.

### 7.2 Domain ownership
1. Auth domain: gom toàn bộ social/local login về 1 flow chuẩn.
2. Nutrition domain: 1 service/source-of-truth cho target + insight + recalc.
3. Food domain: route chuẩn hóa `/api/food/...`; giữ backward-compatibility ngắn hạn.
4. Data context: quy định rạch ròi context nào cho nghiệp vụ nào, tránh chồng lấn.

### 7.3 Delivery safeguards
1. Mỗi thay đổi API phải đi kèm:
   - OpenAPI update.
   - Contract tests.
   - Migration note cho mobile.

## 8. AI/Data Reliability Blueprint
### 8.1 AI reliability
1. Bật cleanup file tạm bắt buộc trong AI provider.
2. Thay biến trạng thái Ollama tĩnh bằng runtime health + timeout + retry có kiểm soát.
3. Chuẩn hóa response AI:
   - `confidence`
   - `source`
   - `fallbackUsed`
4. Với low-confidence: bắt buộc HITL confirm trước khi save.

### 8.2 Data governance (VN-first)
1. Thiết kế canonical taxonomy món Việt: nhóm món -> món chuẩn -> biến thể vùng miền.
2. Mỗi bản ghi có metadata:
   - `source`
   - `version`
   - `verified`
   - `updatedAt`
3. Pipeline kiểm tra chất lượng dữ liệu:
   - range checks
   - consistency checks
   - duplicate detection

### 8.3 AI governance
1. Model/version registry cho YOLO + LLM prompts.
2. Theo dõi drift bằng tín hiệu thực tế (accept/reject/correct rate).
3. Human-in-the-loop dữ liệu hiệu chỉnh cho chu kỳ retrain định kỳ.

## 9. UX/Retention Blueprint
### 9.1 Mục tiêu UX trọng tâm
1. Giảm thao tác log meal: `<= 3 bước`.
2. Tăng tỉ lệ hoàn thành flow scan -> save.
3. Giảm thời gian phản hồi AI thấy được trên UI.

### 9.2 Các cải tiến ưu tiên
1. Luồng scan theo confidence:
   - High confidence: xác nhận nhanh.
   - Low confidence: bắt buộc chỉnh/sửa.
2. Tách state ownership để giảm re-render và stale state.
3. Offline-first cho add meal (queue và sync).
4. Nâng chất gamification thực dụng (streak + weekly review có hành động).

### 9.3 Chỉ số đích sản phẩm
1. Logging completion rate >= 80%.
2. D7 retention +8 điểm %, D30 retention +5 điểm % sau 2 quý.
3. AI acceptance rate >= 70% (không chỉnh sửa).

## 10. DevOps/QA Blueprint
### 10.1 Pipeline tối thiểu bắt buộc
1. Lint -> Build -> Unit test -> Integration test -> Security scan -> Artifact.
2. PR bị block nếu fail bất kỳ gate nào.
3. Dependency scanning và secret scanning bắt buộc.

### 10.2 Test strategy
1. Backend:
   - Unit test service lõi.
   - Integration test với database cô lập (testcontainers).
2. Mobile:
   - Unit test store/service trọng yếu.
   - E2E smoke flow (auth, scan, save meal).
3. Contract tests cho FE/BE.

### 10.3 Observability
1. Structured logging + correlation id xuyên suốt backend/AI.
2. Metrics bắt buộc:
   - API p95
   - error rate
   - AI timeout/fallback rate
   - queue lag
3. Alert + runbook theo mức độ sự cố.

## 11. Store Submission Blueprint (đã hiệu đính)
### 11.1 iOS
1. Bắt buộc Sign in with Apple nếu giữ Google Sign-In.
2. Bắt buộc HTTPS/ATS-compatible cho production traffic.
3. Privacy Policy + Terms public URL, mô tả rõ dữ liệu health/AI usage.
4. Quyền camera/micro/photo mô tả rõ nghiệp vụ trong metadata.

### 11.2 Apple Age Assurance / Declared Age Range (cập nhật cách diễn đạt)
1. Không ghi cứng “bắt buộc toàn cầu”.
2. Áp dụng theo vùng/pháp lý: cần thiết kế readiness layer để bật theo jurisdiction, không hardcode logic tuyệt đối.
3. Action: tạo policy matrix theo thị trường mục tiêu trước submission.

### 11.3 Android
1. Data Safety form chính xác với dữ liệu ảnh/giọng nói.
2. Permission tối thiểu (least privilege).
3. Build/release checklist rõ ràng cho internal -> closed -> production track.

## 12. Prioritized Roadmap
### 12.1 Giai đoạn 0 (0-14 ngày, P0)
1. Khóa security baseline: password hash, JWT fallback, CORS, error sanitization, seeder fix.
2. Sửa API drift food detail + hợp nhất flow Google auth.
3. Bật cleanup file tạm AI + runtime health check.
4. Khởi tạo CI pipeline tối thiểu + test command ổn định.
5. Chốt HTTPS production path + chuẩn bị Sign in with Apple.

**Exit criteria**
1. Không còn fallback secret/hash yếu trong runtime.
2. Endpoint critical có contract rõ + test pass.
3. AI provider không tích lũy file tạm.

### 12.2 Giai đoạn 1 (2-8 tuần, P1)
1. Contract governance + API versioning.
2. Refactor nutrition ownership về source-of-truth.
3. HITL confidence UX + telemetry pipeline.
4. Testcontainers/integration + E2E smoke.
5. Logging redaction + observability dashboard.

**Exit criteria**
1. CI pass rate >= 95%.
2. Logging completion flow cải thiện có số đo.
3. App đủ điều kiện internal beta ổn định.

### 12.3 Giai đoạn 2 (2-6 tháng, P2)
1. Data moat món Việt (taxonomy + verified data pipeline).
2. AI model quality loop (retrain từ feedback thực tế).
3. Tăng chất gamification/retention loop.
4. Tối ưu release cadence và production SLO.

**Exit criteria**
1. D7/D30 tăng theo mục tiêu.
2. AI acceptance rate đạt ngưỡng.
3. Có thể submit store với compliance checklist hoàn chỉnh.

## 13. Top 30 Action Backlog (ưu tiên tuyệt đối)
| # | Priority | Hạng mục | Owner role | Effort | Dependencies | Acceptance |
|---:|---|---|---|---|---|---|
| 1 | P0 | Migrate SHA-256 -> Argon2id/BCrypt | Backend | M | None | Hash mới áp dụng + migrate dần |
| 2 | P0 | Remove JWT fallback secret | Backend | S | None | App fail-fast khi thiếu key |
| 3 | P0 | Restrict CORS by env whitelist | Backend | S | #2 | Origin lạ bị chặn |
| 4 | P0 | RFC7807 error handling middleware | Backend | M | #2 | Không trả `ex.Message` trực tiếp |
| 5 | P0 | Fix seeder social/hash-null risk | Backend | S | #1 | Social account không bị auto-set hash |
| 6 | P0 | Fix food detail route contract | FE+BE | S | #4 | FE/BE/tests thống nhất `/api/food/{id}` |
| 7 | P0 | Consolidate Google auth flow | FE+BE | M | #4 | Chỉ còn 1 flow canonical |
| 8 | P0 | Enable temp file cleanup AI | MLOps | S | None | Temp file không tăng theo thời gian |
| 9 | P0 | Runtime Ollama health strategy | MLOps | M | #8 | Recover khi Ollama restart |
| 10 | P0 | Create minimal CI workflow | DevOps | M | None | PR có lint/build/test gates |
| 11 | P1 | Fix backend testhost reliability | Backend | M | #10 | `dotnet test` ổn định |
| 12 | P1 | Fix mobile test environment | Mobile | M | #10 | `npm test` ổn định |
| 13 | P1 | Add integration tests (DB isolated) | Backend | M | #11 | Endpoint critical có integration tests |
| 14 | P1 | Add E2E smoke flow mobile | Mobile QA | M | #12 | Auth + scan + save chạy xanh |
| 15 | P1 | Structured logging + redaction | BE+MLOps | M | #4 | Không log PII/token |
| 16 | P1 | Add metrics dashboard v1 | DevOps | M | #15 | Có p95/error/AI timeout dashboard |
| 17 | P1 | Sign in with Apple E2E | Mobile+Backend | M | #7 | Login Apple chạy trên iOS build |
| 18 | P1 | HTTPS production baseline + ATS checks | DevOps+Mobile | M | #17 | iOS networking pass ATS path |
| 19 | P1 | OpenAPI contract governance | Architect+BE | S | #6 | API docs/versioning rõ |
| 20 | P1 | Typegen path and contract drift check | Mobile+BE | S | #19 | Type generated đồng bộ API |
| 21 | P2 | VN food canonical taxonomy | Data+BE | L | #19 | Taxonomy v1 hoàn chỉnh |
| 22 | P2 | Verified data workflow + metadata | Data+Product | L | #21 | Món có source/version/verified |
| 23 | P2 | HITL telemetry training loop | MLOps+BE | M | #20 | Correction data vào retrain set |
| 24 | P2 | Confidence policy optimization | MLOps | M | #23 | Ngưỡng confidence tối ưu theo cohort |
| 25 | P2 | Offline meal queue + sync | Mobile | M | #14 | Add meal offline và sync thành công |
| 26 | P2 | Gamification v2 (streak + weekly actions) | Mobile+BE | M | #25 | Tăng completion rate có đo lường |
| 27 | P2 | Incident runbooks + on-call checklist | DevOps | S | #16 | Có runbook cho top sự cố |
| 28 | P2 | Privacy/Terms legal hardening | Product+Legal | S | #18 | Trang public + nội dung chuẩn |
| 29 | P2 | Release train 2-week cadence | EM+Tech Lead | S | #10 | Release đúng nhịp, giảm hotfix |
| 30 | P2 | Security review monthly ritual | Tech Lead+Security | S | #1-#5 | Báo cáo security định kỳ |

## 14. First 10 PRs to Open Tomorrow
1. `feat(security): replace sha256 password hashing with argon2id/bcrypt + progressive rehash`
2. `chore(auth): remove jwt fallback secret and fail-fast on missing Jwt:Key`
3. `feat(api): add global ProblemDetails (RFC7807) and sanitize exception responses`
4. `fix(cors): replace wildcard origin with environment whitelist policy`
5. `fix(seeder): remove password assignment for hash-null/social users`
6. `fix(api-contract): normalize food detail endpoint to /api/food/{id} and update mobile service/tests`
7. `refactor(auth): consolidate google login flow and deprecate not-implemented path`
8. `fix(ai-provider): enable temp file cleanup with try/finally`
9. `feat(ai-reliability): implement runtime ollama health check with TTL cache`
10. `ci: add minimal quality gates workflow (lint/build/test + dependency scan)`

## 15. KPI Dashboard Spec
### 15.1 Technical KPIs
1. API p95 latency: `< 200ms` (non-AI), AI requests `< 3s` (p95).
2. Error rate 5xx: `< 0.1%`.
3. CI pass rate: `>= 95%`.
4. Flaky tests: `< 2%`.
5. AI timeout rate: giảm theo tháng.

### 15.2 Product KPIs
1. Meal logging completion rate: `>= 80%`.
2. D7 retention: `+8 điểm %`.
3. D30 retention: `+5 điểm %`.
4. Average time-to-log per meal: giảm theo sprint.

### 15.3 AI/Data KPIs
1. AI acceptance rate: `>= 70%`.
2. HITL correction rate: theo dõi theo món/cohort (dùng để retrain).
3. % verified VN food records: tăng theo tháng.
4. Confidence distribution drift: cảnh báo khi lệch ngưỡng.

## 16. Open Questions (cần chốt ở sprint planning)
1. Hạ tầng GPU thực tế đủ cho YOLO + PhoWhisper + LLM đồng thời không?
2. Có cần fallback cloud provider khi cụm Ollama local suy giảm không?
3. Chu kỳ retrain từ HITL nên là 2 tuần hay 4 tuần theo năng lực data ops hiện tại?
4. Governance nguồn dữ liệu món Việt: ai chịu trách nhiệm final approval?
5. Phạm vi thị trường phát hành đầu tiên để áp đúng compliance matrix (bao gồm age assurance theo vùng)?
6. Chiến lược monetization 6-12 tháng: freemium nào phù hợp để không làm hỏng UX cốt lõi?
7. Ngưỡng SLO nào được chấp nhận cho AI flows để cân bằng chi phí hạ tầng?
8. Cần tiêu chuẩn hóa một schema sự kiện analytics thống nhất từ mobile tới backend không?

---

## Phụ lục A - Điểm hiệu đính quan trọng so với bản nháp ban đầu
1. Không kết luận tuyệt đối “New Architecture chưa bật”: trong repo Android đã có `newArchEnabled=true` và Hermes bật; cần benchmark runtime thực tế thay vì kết luận cứng.
2. Không diễn đạt cứng “Declared Age Range bắt buộc toàn cầu”: cần policy theo vùng pháp lý.
3. Điều chỉnh nhận định CI/CD: trong repo hiện tại chưa thấy workflow sẵn, do đó roadmap ưu tiên phải bắt đầu từ pipeline tối thiểu.
4. Các số liệu quy mô codebase đã chuẩn hóa theo snapshot local hiện tại.

## Phụ lục B - Mức độ tin cậy
1. **Cao**: các phát hiện có bằng chứng trực tiếp trong repo (security/API/AI temp files/config).
2. **Trung bình**: các khuyến nghị benchmark thị trường và chiến lược cạnh tranh (phụ thuộc biến động sản phẩm đối thủ theo thời gian).
3. **Trung bình-thấp**: các dự báo retention/business nếu chưa có telemetry production đầy đủ.
