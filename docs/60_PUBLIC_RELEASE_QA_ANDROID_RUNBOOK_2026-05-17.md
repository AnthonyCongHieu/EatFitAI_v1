# EatFitAI Android Public Release QA Runbook

Ngày tạo: 2026-05-17  
Release target: Android public release candidate  
Production backend: `https://eatfitai-api.duckdns.org`  
Production AI provider: `https://eatfitai-ai.duckdns.org`

## Mục tiêu

Runbook này biến checklist release thành các gate chạy được bằng npm script, có report JSON và bằng chứng từ thiết bị thật. Domain Render cũ `https://eatfitai-backend.onrender.com` là legacy/suspended, không được dùng làm production signal.

## Chuẩn bị máy QA

Trên Windows PowerShell:

```powershell
$env:ANDROID_SERIAL="<device_serial>"
$env:EATFITAI_ANDROID_TARGET="real-device"
$env:EATFITAI_DEVICE_BACKEND_URL="https://eatfitai-api.duckdns.org"
$env:EATFITAI_SMOKE_BACKEND_URL="https://eatfitai-api.duckdns.org"
$env:EATFITAI_SMOKE_AI_PROVIDER_URL="https://eatfitai-ai.duckdns.org"
$env:EATFITAI_RELEASE_GATE_DISPOSABLE_AUTH="1"
$env:EATFITAI_DEMO_MAIL_API="<mail_api_url_or_token_config>"
```

Yêu cầu local:

- Node 20.x
- Java 17
- Android SDK platform-tools / `adb`
- `scrcpy`
- Thiết bị Android thật đã bật USB debugging

## Lệnh xem kế hoạch

```powershell
npm --prefix .\eatfitai-mobile run qa:public-release:plan
```

Lệnh này chỉ in gate và command, không gọi backend, không build APK, không đụng thiết bị.

## Gate 0 — Preflight

```powershell
npm --prefix .\eatfitai-mobile run qa:public-release:preflight
```

Pass khi:

- `adb` thấy đúng `ANDROID_SERIAL`
- target là `real-device`
- doctor script xác nhận screenshot/screenrecord/UIAutomator best-effort đủ dùng

## Gate 1 — Code health

```powershell
npm --prefix .\eatfitai-mobile run qa:public-release:code
```

Bao gồm:

- mobile typecheck
- lint + guard không gọi trực tiếp AI provider
- mobile tests
- `.NET` tests
- Python tests cho `ai-provider`
- Python tests cho `scripts/cloud`

## Gate 2 — Production cloud smoke

```powershell
npm --prefix .\eatfitai-mobile run qa:public-release:cloud
```

Gate này mặc định yêu cầu disposable mailbox. Nếu thiếu `EATFITAI_DEMO_MAIL_API`, gate sẽ báo `blocked` thay vì fallback âm thầm sang account thật.

Bao gồm:

- backend/AI preflight
- auth API
- user/profile API
- AI API
- backend non-UI smoke
- regression smoke
- cleanup

## Gate 3 — Android preview build/install

```powershell
npm --prefix .\eatfitai-mobile run qa:public-release:android
```

Pass khi preview APK build được, install được vào đúng thiết bị thật và automation doctor/probe trong release gate không fail.

## Gate 4 — Real-device RC proof

```powershell
npm --prefix .\eatfitai-mobile run qa:public-release:device
```

Flow bắt buộc được script `device:rc-proof:android` gom lại:

- `login-real`
- `home-smoke`
- `full-tab-ui-smoke`
- `food-diary-readback`
- `food-search-ui-readback`
- `scan-save-readback`
- `voice-text-readback`
- `stats-profile-smoke`
- `backend-frontend-live-check`

Pass khi report trong `_logs/real-device-adb` không có crash/critical failure và readback API bắt buộc pass.

## Gate 5 — Visual QA

```powershell
npm --prefix .\eatfitai-mobile run qa:public-release:visual
```

Tester review screenshot/video để chốt:

- bottom navigation không che nội dung
- onboarding/ruler không lệch
- loading/empty/error states rõ
- MoChi/SmartAdd không cản thao tác chính
- scan/voice/stats/profile không vỡ layout

## Gate 6 — Final release gate

```powershell
npm --prefix .\eatfitai-mobile run qa:public-release:final
```

Chỉ chạy sau khi Gate 0–5 pass riêng lẻ. Đây là lệnh chốt cuối, bọc lại `release:gate -- all`.

## Chạy toàn bộ

```powershell
npm --prefix .\eatfitai-mobile run qa:public-release
```

Lệnh này chạy Gate 0–6 theo thứ tự và dừng ngay khi gate đầu tiên fail/blocked.

## Artifacts

Report tổng nằm tại:

```text
_logs/public-release-qa/<timestamp>/public-release-qa-report.json
```

Cloud smoke artifact nằm dưới:

```text
_logs/public-release-qa/<timestamp>/production-smoke
```

Device evidence vẫn nằm trong:

```text
_logs/real-device-adb
```

## Chuẩn chặn release

Không release nếu có một trong các điểm sau:

- Crash logcat hoặc critical failure trong RC proof
- backend/AI health không trả 200
- login/token/protected API readback fail
- mobile gọi trực tiếp AI provider thay vì backend
- target dùng Render legacy suspended
- disposable auth bị thiếu nhưng cloud gate vẫn cố fallback sang account thật
- phát hiện lỗi encoding/mojibake mới ở text tiếng Việt
