# Testing And Release

Cập nhật: `2026-04-24`

Tài liệu này là runbook hiện hành cho kiểm thử và phát hành EatFitAI. Android UI automation hiện dùng **ADB + UIAutomator best-effort + scrcpy**, không dùng framework helper APK.

## Gates Chính

| Gate | Mục tiêu | Lệnh |
|---|---|---|
| Code | Backend, mobile, AI unit/static checks | `npm --prefix .\eatfitai-mobile run release:gate -- code` |
| Android build | Build/install preview APK và probe máy thật | `npm --prefix .\eatfitai-mobile run release:gate -- android` |
| Device evidence | Đọc evidence ADB mới nhất | `npm --prefix .\eatfitai-mobile run release:gate -- device` |
| Cloud | Render verify, preflight, regression, metrics, rehearsal | `npm --prefix .\eatfitai-mobile run release:gate -- cloud` |

Full gate:

```powershell
npm --prefix .\eatfitai-mobile run release:gate -- all
```

## Android Real-Device Lane

### Cài công cụ

ADB đến từ Android SDK `platform-tools`. Cài `scrcpy` để quan sát và điều khiển live:

```powershell
winget install --id Genymobile.scrcpy -e
```

Real-device lane luôn yêu cầu pin serial rõ ràng:

```powershell
$env:ANDROID_SERIAL="a12c6888629b"
$env:EATFITAI_ANDROID_TARGET="real-device"
```

Với Xiaomi/MIUI, bật trên điện thoại:

- Developer options
- USB debugging
- USB debugging (Security settings)
- Install via USB nếu cần cài APK

### Doctor

```powershell
npm --prefix .\eatfitai-mobile run device:doctor:android
```

Doctor kiểm tra:

- `adb` và thiết bị online
- app `com.eatfitai.app` đã cài
- `scrcpy`
- `screencap`
- `screenrecord`
- UIAutomator dump best-effort
- cảnh báo MIUI/device policy

UIAutomator dump có thể báo `could not get idle state` trên một số ROM. Đây là warning, không tự động kết luận app fail.

Nếu `ANDROID_SERIAL` hoặc `EATFITAI_ANDROID_TARGET=real-device` chưa được set, real-device lane sẽ dừng sớm để tránh chạy nhầm emulator hoặc thiết bị khác.

### Quan sát live bằng scrcpy

```powershell
npm --prefix .\eatfitai-mobile run device:scrcpy:android
```

Lệnh này wake/unlock, launch app mặc định, rồi mở cửa sổ scrcpy theo serial đang chọn.

### Probe không phá dữ liệu

```powershell
npm --prefix .\eatfitai-mobile run device:probe:android
```

Probe thực hiện:

- clear logcat
- wake/unlock
- force-stop app
- launch app bằng `monkey`
- chụp `01-launch.png`
- thử dump `ui.xml`
- lưu `crash-logcat.txt`
- lưu `tail-logcat.txt`
- ghi `report.json`

### Auth-entry flow nhỏ

```powershell
npm --prefix .\eatfitai-mobile run device:auth-entry:android
```

Flow này chỉ kiểm tra khả năng tap/type vào màn login:

- launch app
- tap ô email
- nhập `EATFITAI_DEVICE_PROBE_EMAIL` hoặc mặc định `probe@demo.com`
- tap ô password
- nhập `EATFITAI_DEVICE_PROBE_PASSWORD` hoặc mặc định `Probe12345`
- hide keyboard
- tap `Đăng nhập`
- chụp screenshot sau từng bước

ADB text đi qua bàn phím Android thật. Nếu bàn phím đang ở tiếng Việt/Telex, một số chuỗi có thể bị rewrite. Vì vậy flow luôn lưu screenshot để xác minh text thực tế.

### RC proof trên giao diện thật

```powershell
npm --prefix .\eatfitai-mobile run device:rc-proof:android
```

RC proof chạy lần lượt các mode bắt buộc:

- `login-real`
- `home-smoke`
- `full-tab-ui-smoke`
- `food-diary-readback`
- `food-search-ui-readback`
- `scan-save-readback`
- `voice-text-readback`
- `stats-profile-smoke`
- `backend-frontend-live-check`

Các lệnh riêng tương ứng với từng mode trong `device:rc-proof`:

```powershell
npm --prefix .\eatfitai-mobile run device:login-real:android
npm --prefix .\eatfitai-mobile run device:home-smoke:android
npm --prefix .\eatfitai-mobile run device:full-tab-ui-smoke:android
npm --prefix .\eatfitai-mobile run device:food-diary-readback:android
npm --prefix .\eatfitai-mobile run device:food-search-ui-readback:android
npm --prefix .\eatfitai-mobile run device:scan-save-readback:android
npm --prefix .\eatfitai-mobile run device:voice-text-readback:android
npm --prefix .\eatfitai-mobile run device:stats-profile-smoke:android
npm --prefix .\eatfitai-mobile run device:backend-frontend-live-check:android
```

Có thể chạy riêng các mode mới khi debug:

```powershell
npm --prefix .\eatfitai-mobile run device:full-tab-ui-smoke:android
npm --prefix .\eatfitai-mobile run device:food-search-ui-readback:android
npm --prefix .\eatfitai-mobile run device:backend-frontend-live-check:android
```

Vòng debug nhanh trên thiết bị flaky không nên chờ UIAutomator quá lâu:

```powershell
$env:EATFITAI_DEVICE_FAST_ADB="1"
$env:EATFITAI_DEVICE_SKIP_UI_DUMP="1"
$env:EATFITAI_DEVICE_WAIT_CAP_MS="1800"
$env:EATFITAI_DEVICE_ADB_TIMEOUT_CAP_MS="6000"
$env:EATFITAI_DEVICE_API_TIMEOUT_MS="15000"
npm --prefix .\eatfitai-mobile run device:food-search-ui-readback:android
```

Fast mode bỏ qua perf snapshot và dùng screenshot + foreground làm evidence degraded; RC proof cuối cùng vẫn nên chạy không bật `EATFITAI_DEVICE_FAST_ADB` để lấy đủ `gfxinfo`, `framestats`, và `meminfo`.

Các mode readback bắt buộc phải chứng minh được đăng nhập, Home marker, không có crash logcat, và API readback mandatory thành công. `backend-frontend-live-check` ghi thêm checkpoint theo từng màn hình gồm timestamp, screenshot, UI dump, logcat tail, API latency/readback, cùng snapshot `gfxinfo`, `framestats`, và `meminfo`.

## Evidence

Evidence mới nằm ở:

```text
_logs/real-device-adb/<timestamp>-<mode>/
```

Các file quan trọng:

- `report.json`
- `01-launch.png`
- `02-email.png`
- `03-password.png`
- `04-after-login-tap.png`
- `crash-logcat.txt`
- `tail-logcat.txt`
- `ui.xml` hoặc warning trong `report.json`
- `screenrecord.mp4` nếu chạy helper với `--record`
- `startup-am-start-w.txt`, `*-gfxinfo.txt`, `*-gfxinfo-framestats.txt`, `*-meminfo.txt` khi mode có performance evidence

`_logs/` là generated evidence và không commit.

## Production Smoke API

Cloud/API smoke không phụ thuộc Android UI framework.

Runbook RC cloud đã khóa nằm ở [27_RC_CLOUD_RUNBOOK_2026-04-26.md](27_RC_CLOUD_RUNBOOK_2026-04-26.md). Khi cần chốt RC sau deploy, ưu tiên runbook đó vì nó bao gồm cả deploy backend + AI provider, Render verify, warm-up AI provider, và thứ tự smoke tuần tự.

```powershell
npm --prefix .\eatfitai-mobile run smoke:render:verify
npm --prefix .\eatfitai-mobile run smoke:preflight
npm --prefix .\eatfitai-mobile run smoke:auth:api
npm --prefix .\eatfitai-mobile run smoke:user:api
npm --prefix .\eatfitai-mobile run smoke:ai:api
```

Before deploying a backend runtime that depends on schema drift repair, run schema bootstrap as a one-shot operation and keep its JSON report with the smoke artifacts:

```powershell
$env:EATFITAI_SCHEMA_BOOTSTRAP="1"
$env:EATFITAI_SCHEMA_BOOTSTRAP_REPORT="_logs/production-smoke/<timestamp>/schema-bootstrap-report.json"
dotnet run --project .\eatfitai-backend\EatFitAI.API.csproj -- --schema-bootstrap --schema-bootstrap-report $env:EATFITAI_SCHEMA_BOOTSTRAP_REPORT
```

Auth smoke now also verifies the Phase A legacy Google contract: `GET /api/auth/google` must return `410 Gone` with `X-EatFitAI-Deprecated-Endpoint` pointing to `POST /api/auth/google/signin`. Only remove the legacy route after this smoke evidence and backend logs show no unexpected legacy callers.

For AI provider production, configure Gemini usage state with:

```text
GEMINI_USAGE_STATE_STORE=postgres
GEMINI_USAGE_STATE_DATABASE_URL=<Supabase/PostgreSQL connection string>
```

After deploy, verify `/healthz/gemini` reports `gemini_usage_state_store=postgres` and `gemini_usage_state_store_degraded=false`. Local development can keep `GEMINI_USAGE_STATE_STORE=file`.

Fixture ảnh dùng cho AI smoke nằm ở:

```text
tools/fixtures/scan-demo
```

Nếu cần override manifest:

```json
{
  "fixtureRootHint": "tools/fixtures/scan-demo"
}
```

## Validation Log

### 2026-04-26 Function/AI improvement validation

- Mobile focused Jest batch: PASS, 13 suites / 83 tests.
- Mobile typecheck: PASS.
- Mobile lint and no-direct-AI-provider guard: PASS.
- Backend targeted AI/voice/diary/auth/analytics batch: PASS, 61 tests.
- Mojibake guard: PASS.
- Secret tracking guard: PASS.
- Primary-path readiness unit gate: PASS via `primaryPathReadiness.test.js` and `backendNonUiSummary.test.js`.
- Cloud primary-path smoke and real-device RC proof: not run in this local validation pass because they require live smoke credentials, deployed services, and/or a connected Android device. Release readiness must still require those reports to show `primaryPath.passed === true`; fallback/offline/local evidence is not accepted as pass.

## Debug Khi Fail

1. Mở scrcpy để nhìn màn hình thật.
2. Chạy `device:probe:android` để lấy baseline screenshot/logcat.
3. Nếu UI tree fail, đọc screenshot trước; không coi UIAutomator warning là app crash.
4. Nếu text nhập sai, đổi keyboard sang English hoặc bật `EATFITAI_DEVICE_TAP_KEYBOARD_GLOBE=1` trước `login-real`; runner cũng dùng `CTRL+A` + delete để tránh append text cũ.
5. Nếu app không launch, kiểm tra `adb shell cmd package resolve-activity --brief com.eatfitai.app`.
6. Nếu logcat crash trống nhưng UI sai, lưu screenshot và note trạng thái trong release evidence.
