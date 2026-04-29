# Đánh Giá Production Readiness - 2026-04-25

Tài liệu này ghi lại đánh giá sâu hơn về tình trạng hiện tại của EatFitAI sau khi:

- Loại bỏ Appium/Maestro khỏi automation path active.
- Chuyển Android real-device lane sang ADB + UIAutomator best-effort + scrcpy.
- Harden AI provider deploy health bằng lazy YOLO loading và policy `best.pt`.
- Kiểm tra lại codebase, tài liệu active, evidence logs, Render live health, và các giới hạn hạ tầng.

## 1. Kết Luận Ngắn

EatFitAI hiện là **release-candidate mạnh**, nhưng **chưa đạt 100% production**.

| Góc nhìn | Ước lượng |
|---|---:|
| Nếu tính cả tình trạng Render/quota/deploy hiện tại | 72-76% |
| Nếu tạm bỏ blocker Render quota và chỉ nhìn codebase + test lane | 85-88% |

Điểm mấu chốt: code và release lane đã tốt hơn rõ rệt, nhưng commit mới nhất chưa chạy được trên production thật vì Render build pipeline đã chạm quota. Do đó chưa thể coi là production-ready đầy đủ.

## 2. Trạng Thái Git Và Evidence Hiện Có

### Git

- Branch: `hieu_deploy/production`
- Latest pushed commit: `5fde338 fix(render): harden ai provider deploy health`
- Working tree tại thời điểm đánh giá: sạch.

### Code Gate

Evidence gần nhất:

```text
_logs/production-smoke/2026-04-24T18-07-37-217Z/release-gate-report.json
```

Kết quả chính:

- `dotnet test`: pass, 168 backend tests.
- NuGet vulnerability gate: pass, không có high/critical findings.
- Mobile typecheck: pass.
- Mobile lint: pass.
- Direct AI provider guard: pass.
- Mobile Jest: pass, 28 suites / 104 tests.
- Mobile production audit: pass theo gate high/critical, còn moderate advisories được ghi nhận riêng.
- Mojibake guard: pass.
- Secret tracking guard: pass.
- AI provider unit tests: pass, 37 tests, 1 skipped.

Rủi ro còn lại trong code gate:

- Jest pass nhưng có warning open handle: cần xử lý để giảm nguy cơ CI treo/flaky.
- AI provider app-level test trong môi trường local vẫn chưa chứng minh full Flask + torch + ultralytics import path cho production Docker.

## 3. Android Real-Device Lane

Evidence gần nhất:

```text
_logs/real-device-adb/2026-04-24T18-01-59-110Z-doctor/report.json
_logs/real-device-adb/2026-04-24T18-01-09-970Z-probe/report.json
_logs/real-device-adb/2026-04-24T17-59-22-016Z-auth-entry/report.json
```

Thiết bị:

- Serial: `a12c6888629b`
- OEM: Xiaomi / MIUI
- Package: `com.eatfitai.app`

Kết quả:

- `scrcpy`: OK.
- ADB online device: OK.
- App installed: OK.
- Screenshot/screencap: OK.
- Probe launch + foreground: OK.
- Auth-entry: nhập email/password vào đúng màn login và chụp screenshot sau từng bước.

Giới hạn:

- UIAutomator dump có warning trên MIUI. Đây là expected warning theo runbook, không tự kết luận app fail.
- Auth-entry dùng probe credential mặc định, nên chỉ chứng minh khả năng tap/type và navigation tới login, chưa chứng minh login thật.
- Chưa có full user journey trên thiết bị thật: login thật -> onboarding/home -> AI scan -> save diary -> readback.

Mức đạt: **80-85%** cho device lane.

## 4. Cloud Và Render

### Tình trạng live health

Các endpoint live hiện phản hồi:

- Backend `/health/live`: HTTP 200.
- Backend `/health/ready`: HTTP 200.
- AI provider `/healthz`: HTTP 200.
- AI provider `/healthz/gemini`: HTTP 200.

AI provider live tại thời điểm kiểm tra có:

- `model_loaded=true`
- `model_file=best.pt`
- `model_type=yolov8-custom-eatfitai`
- `model_load_error=null`
- Gemini configured.
- 5 Gemini projects còn available.

### Blocker quan trọng

Evidence:

```text
_logs/production-smoke/2026-04-24T18-20-20-096Z/render-verify.json
```

Kết quả:

- Backend latest deploy: `build_failed`
- AI provider latest deploy: `build_failed`
- Cả hai deploy đều trỏ đúng commit `5fde338`
- Branch matches: true
- Auto deploy: yes

Nguyên nhân đã xác định từ Render dashboard/operator evidence: workspace đã chạm monthly included pipeline minutes. Screenshot vận hành cho thấy pipeline minutes ở mức khoảng `503 min / 500 min`.

Hệ quả:

- Production live vẫn chạy artifact cũ.
- Commit `5fde338` chưa được chứng minh trên cloud runtime thật.
- Không thể đóng `release:gate -- cloud` cho tới khi build pipeline được mở lại.

## 5. Render Free Plan Không Đủ Cho Production

`render.yaml` hiện vẫn cấu hình cả hai service ở `plan: free`:

- `eatfitai-backend`
- `eatfitai-ai-provider`

Theo tài liệu chính thức của Render:

- Free web service không được khuyến nghị cho production.
- Free service spin down sau 15 phút không có inbound traffic.
- Mỗi workspace có 750 Free instance hours mỗi tháng.
- Nếu dùng hết pipeline minutes, Render disable new builds cho phần còn lại của tháng nếu không có payment method hoặc bị spend limit chặn.
- Existing deploys vẫn có thể tiếp tục chạy, nhưng deploy mới không thể build.

Nguồn:

- [Render Deploy for Free](https://render.com/docs/free)
- [Render Build Pipeline](https://render.com/docs/build-pipeline)
- [Render Web Services](https://render.com/docs/web-services)

Nhận định:

- Với 2 web services, nếu cố keep-alive cả backend và AI provider trên free tier thì chi phí instance hours sẽ vượt 750 giờ/tháng.
- Free tier phù hợp preview/hobby/testing, không phù hợp production có user thật.
- Keep-alive bằng UptimeRobot/Cron-job chỉ giảm cold start, không giải quyết instance hour budget và pipeline quota.

Mức đạt cloud/ops hiện tại: **55-65%**.

## 6. AI Provider Và AI Scan

Điểm đã tốt:

- `app.py` đã lazy-load YOLO khi gọi `/detect`, giúp `/healthz` nhẹ hơn cho Render health check.
- Production policy yêu cầu `best.pt`; generic YOLO fallback bị tắt bằng `ALLOW_GENERIC_YOLO_FALLBACK=false`.
- `render.yaml` đã khai báo `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, và `ALLOW_GENERIC_YOLO_FALLBACK=false` cho AI provider.
- Live old artifact hiện có `best.pt` loaded.

Rủi ro còn lại:

- Commit mới chứa lazy-load/policy chưa deploy thành công lên production.
- Cần chạy scan thật sau deploy mới để xác nhận:
  - `/detect` tải đúng `best.pt`.
  - Không fallback sang `yolov8s.pt`.
  - Backend mapping + scan-to-save + diary readback pass.
- AI provider vẫn dùng torch/ultralytics trong Docker image, khá nặng cho free tier/starter thấp.
- First request `/detect` có thể chậm vì model load/download nếu chưa warm.

Mức đạt AI provider: **78-82%**.

## 7. Backend/API

Điểm đã tốt:

- `/health/ready` có DB readiness check.
- Backend production config validation đã có trong `Program.cs`.
- Rate limiting đã partition theo user/IP ở các policy chính.
- Mobile không gọi trực tiếp AI provider; đi qua backend.
- Telemetry endpoint và mobile telemetry queue đã có.
- Crashlytics dependency và errorTracking service đã được nối ở mobile.
- Brevo config đã có trong `render.yaml`, không còn phụ thuộc SMTP stale trong blueprint.

Rủi ro còn lại:

- `/api/ai/status` yêu cầu auth nên smoke unauthenticated không kiểm được trực tiếp.
- Background load còn tồn tại:
  - `AiHealthService` poll `/healthz` mặc định 30 giây.
  - `AdminRuntimeSnapshotBackgroundService` mặc định 30 giây, còn controller snapshot interval 5 giây cho SSE/runtime flow.
- Cần xác nhận production telemetry thực sự nhận và query được dữ liệu thật sau deploy mới.
- Cần audit tiếp các branch trả lỗi 500/503 để tránh leak chi tiết nội bộ nếu còn sót.

Mức đạt backend/API: **85%**.

## 8. Mobile/Product

Điểm đã tốt:

- Expo/React Native app có auth, onboarding, diary, stats, scan, voice proxy, barcode, weekly review.
- Analytics wrapper đã không còn là stub đơn giản; đang gửi qua backend telemetry queue.
- Error tracking có Crashlytics + telemetry fallback.
- Android real-device debug lane hiện thực tế hơn Appium/Maestro vì có screenshot/logcat/scrcpy.

Rủi ro còn lại:

- Voice UI còn một số TODO/demo path trong component cũ, cần phân định rõ active/inactive.
- Manual logging speed chưa đủ mạnh: favorites/recent/common/same-as-yesterday vẫn là P1 gap.
- AI scan reliability cần full flow: scan -> review -> save -> diary readback.
- iOS production chưa có evidence tương đương Android; `GoogleService-Info.plist` chưa thấy trong repo.
- Một số docs/checklist nói analytics/error tracking đã xong, nhưng cần live dashboard/evidence sau deploy để gọi là production-grade.

Mức đạt mobile/product: **75-80%**.

## 9. Security Và Secrets

Điểm đã tốt:

- Secret tracking guard pass.
- Mojibake guard pass.
- Active docs đã có policy không gửi secrets qua chat/email/ticket.
- AI provider internal endpoints đã yêu cầu internal token.
- Render env keys đã được cấu hình theo hướng không commit secrets vào repo.

Rủi ro cần xử lý:

- Render API key đã từng được paste vào chat trong quá trình vận hành. Phải rotate key này trên Render dashboard.
- Cần đảm bảo không có secrets trong `_logs` trước khi chia sẻ evidence ra ngoài.
- Production secrets chỉ nên nằm trong Render/Supabase/Firebase dashboards.

Mức đạt security hiện tại: **82-88%**, với điều kiện rotate key đã lộ qua chat.

## 10. Appium/Maestro Cleanup

Active path:

- `eatfitai-mobile/package.json` không còn Appium/Maestro scripts.
- `docs/TESTING_AND_RELEASE.md` đã chuyển sang ADB + UIAutomator + scrcpy.
- Fixture smoke đã chuyển sang `tools/fixtures/scan-demo`.

Drift còn sót:

- `.serena/memories/*` còn nhắc Appium/Maestro cũ.
- Đây không phải runtime path, nhưng có thể làm agent/tooling tương lai đọc nhầm.

Khuyến nghị:

- Dọn hoặc rewrite `.serena/memories` để đồng bộ với lane mới.
- Không rewrite `docs/archive/**` nếu mục tiêu là giữ lịch sử.

## 11. Bảng Readiness Theo Mảng

| Mảng | Mức đạt | Ghi chú |
|---|---:|---|
| Code/static quality | 92-95% | Gate pass, còn Jest open-handle warning |
| Android real-device lane | 80-85% | Probe/auth-entry pass, thiếu full logged-in journey |
| Backend/API | 85% | Health/config/rate-limit tốt, cần live cloud gate |
| AI provider | 78-82% | Policy tốt, cần verify deploy mới + first scan |
| Cloud/ops | 55-65% | Render free/quota là blocker lớn |
| Product completeness | 75-80% | P0 mạnh, P1/P2 còn nhiều |
| Security | 82-88% | Guard pass, cần rotate key đã paste chat |

## 12. Đường Đi Ngắn Nhất Để Đạt 100%

1. Rotate Render API key đã bị paste vào chat.
2. Mở lại Render build pipeline:
   - thêm payment method/raise spend limit,
   - hoặc chờ reset quota,
   - hoặc chuyển ít nhất backend sang paid instance.
3. Redeploy commit `5fde338` cho cả backend và AI provider.
4. Chạy:

```powershell
npm --prefix .\eatfitai-mobile run smoke:render:verify
npm --prefix .\eatfitai-mobile run release:gate -- cloud
```

5. Sau deploy mới, gọi AI scan thật để xác nhận:
   - `model_file=best.pt`
   - `model_load_error=null`
   - không generic fallback
   - scan-to-save + diary readback pass.
6. Chạy Android full gate trên thiết bị thật:

```powershell
npm --prefix .\eatfitai-mobile run release:gate -- android
npm --prefix .\eatfitai-mobile run release:gate -- device
```

7. Cấp smoke credential thật/staging thật, rồi test:
   - login,
   - onboarding/home,
   - food search,
   - barcode,
   - AI scan,
   - save diary,
   - weekly review,
   - logout/login lại.
8. Fix Jest open-handle warning bằng `--detectOpenHandles`.
9. Dọn `.serena/memories` Appium/Maestro stale references.
10. Xác nhận dashboard vận hành:
    - Render deploy/health,
    - Supabase DB,
    - Firebase Crashlytics,
    - backend telemetry,
    - UptimeRobot/Cron-job nếu còn dùng free/best-effort.

## 13. Production Decision

Không nên gọi bản hiện tại là **100% production** cho tới khi:

- Commit mới nhất đã deploy thành công.
- Cloud gate pass.
- Android full device gate pass.
- Full smoke user journey có evidence.
- AI scan với `best.pt` pass trên production artifact mới.
- Render free/quota không còn là điểm chặn vận hành.

Trạng thái đúng hơn ở thời điểm này:

> **Production candidate, code mostly ready, cloud deployment blocked, full E2E production evidence not closed.**
