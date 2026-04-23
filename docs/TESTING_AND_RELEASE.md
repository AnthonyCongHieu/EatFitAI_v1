# Kiểm thử và phát hành

Cập nhật: `2026-04-18`

## Tổng quan

Tài liệu này gộp các quy trình kiểm thử và phát hành cho EatFitAI:

- Gate kiểm thử product-grade
- Runbook vận hành thiết bị thật
- Smoke production qua cloud
- Maestro automation suites

---

## Gate kiểm thử

### Gate 0 — Môi trường

```powershell
npm --prefix .\eatfitai-mobile install
npm --prefix .\tools\appium install
npm --prefix .\eatfitai-mobile run automation:doctor
```

Lưu ý:
- Nếu app trên máy Android là build `DEBUGGABLE`, `automation:doctor` phải thấy Metro đang listen ở `http://127.0.0.1:8081`
- Cho release gate Android, build phải là `release-like` không `DEBUGGABLE`

### Gate 1 — Code

```powershell
dotnet test .\EatFitAI_v1.sln
npm --prefix .\eatfitai-mobile run typecheck
npm --prefix .\eatfitai-mobile run lint
npm --prefix .\eatfitai-mobile run guard:no-direct-ai-provider
```

### Gate 2 — Android automation

```powershell
npm --prefix .\eatfitai-mobile run build:android:preview
npm --prefix .\eatfitai-mobile run install:android:preview
npm --prefix .\eatfitai-mobile run automation:doctor
npm --prefix .\eatfitai-mobile run appium:smoke
```

Lane Android mặc định cho release gate hiện là Appium-only. Các flow `appium:edge:android` và
`cloud-proof:android` vẫn hữu ích cho debug/evidence sâu hơn, nhưng không còn nằm trên critical
path của Gate 2.

### Gate 3 — Chứng nhận thiết bị thật

Evidence bundle trong `_logs/production-smoke/<timestamp>` phải có:

- `preflight-results.json`
- `request-budget.json`
- `session-observations.json`
- `regression-run.json`
- `metrics-baseline.json`
- Screenshot và logcat theo checklist

Điều kiện pass tối thiểu trong `session-observations.json`:

- `reopenHome.passed = true`
- `scanToSave.passed = true`
- `scanToSave.diaryReadbackPassed = true`
- `nutritionApply.passed = true`
- `stability.crashObserved = false`
- `stability.freezeObserved = false`

### Gate 4 — Cloud

```powershell
npm --prefix .\eatfitai-mobile run smoke:render:verify
npm --prefix .\eatfitai-mobile run smoke:preflight
npm --prefix .\eatfitai-mobile run smoke:regression
npm --prefix .\eatfitai-mobile run smoke:metrics
npm --prefix .\eatfitai-mobile run smoke:rehearsal
```

Một lệnh gộp gate:

```powershell
npm --prefix .\eatfitai-mobile run release:gate
```

Hoặc chạy từng gate:

```powershell
node .\eatfitai-mobile\scripts\product-release-gate.js environment
node .\eatfitai-mobile\scripts\product-release-gate.js code
node .\eatfitai-mobile\scripts\product-release-gate.js android
node .\eatfitai-mobile\scripts\product-release-gate.js device
node .\eatfitai-mobile\scripts\product-release-gate.js cloud
```

---

## Legacy Maestro Suites

| Suite | Lệnh | Ghi chú |
|---|---|---|
| Tổng hợp | `maestro:hero:android` | Chạy tất cả |
| Auth đầy đủ | `maestro:auth-full:android` | Clear app data trước |
| Onboarding | `maestro:onboarding:android` | Clear app data trước |
| Nhật ký thủ công | `maestro:manual-diary:android` | Dùng lane authenticated |
| AI scan lưu | `maestro:ai-scan-save:android` | Contract lane cho màn scan entry |
| Dinh dưỡng | `maestro:nutrition:android` | Dùng lane authenticated |
| Voice text | `maestro:voice-text:android` | Dùng lane authenticated |
| Profile & Stats | `maestro:profile-stats:android` | Dùng lane authenticated |

Lưu ý:
- Đây là lane legacy/manual, không còn là release gate Android chính thức
- Với máy Android thật, phải mở khóa máy và bật tùy chọn developer cho phép cài helper APK qua USB/ADB
- Build debug + Metro chỉ để debug, không đủ điều kiện pass release gate Android

---

## Runbook thiết bị thật

### Chuẩn bị

1. Cắm thiết bị Android thật qua USB
2. Bật `USB debugging`
3. Đảm bảo máy tính và điện thoại cùng LAN nếu dùng Metro qua `--host lan`
4. Dùng Node `20.x`

Kiểm tra:

```powershell
adb devices -l
```

### Khởi động backend local

Backend auth flow không cần AI provider để test login/forgot/reset.

```powershell
Invoke-WebRequest http://127.0.0.1:5247/health -UseBasicParsing
```

### Khởi động Metro cho thiết bị thật

```powershell
cd .\eatfitai-mobile
npm run dev:device -- --clear --port 8081
```

Reverse cổng:

```powershell
adb reverse tcp:8081 tcp:8081
```

### Khởi chạy app

```powershell
adb shell am start -S -W -n com.eatfitai.app/.MainActivity
```

### Quy tắc bắt buộc sau mỗi lần restart

1. Cold-launch app
2. Kiểm tra state ngay sau restart
3. Nếu thấy warning `Open debugger to view warnings.` → bấm `x` trước
4. Chỉ sau khi warning biến mất mới tiếp tục vào intro/welcome/login

### Nguyên tắc debug UI

1. Ưu tiên Appium `getPageSource()` + screenshot
2. Không tin `adb uiautomator dump` trên máy Xiaomi/MIUI
3. Nếu cần attach vào app đang mở, dùng WebdriverIO `remote()` với `appium:autoLaunch=false` và `appium:noReset=true`
4. Nếu `UiAutomator2` crash → dùng `adb logcat -d` và `adb shell dumpsys` để xác nhận flow thực tế

---

## Smoke Production qua Cloud

### Quy tắc chạy

1. Không sửa `.env.development` để đổi lane mặc định
2. Chỉ dùng lane riêng `start-mobile-cloud-smoke.ps1` cho smoke production
3. Mỗi run chỉ dùng 1 account disposable mới tạo

### Khởi chạy session

```powershell
powershell -ExecutionPolicy Bypass -File .\start-mobile-cloud-smoke.ps1
```

### Health contract chính thức

- Backend: `GET /health/live = 200`, `GET /health/ready = 200`
- AI provider: `GET /healthz = 200`

### Request budget mặc định

| Endpoint | Giới hạn |
|---|---:|
| Health mỗi endpoint | 2 |
| Register with verification | 1 |
| Resend verification | 1 |
| Verify email | 2 |
| Login | 1 |
| Refresh | 1 |
| AI status | 1 |
| Vision detect | 8 |
| Meal diary write | 3 |

### Điều kiện pass tối thiểu

- Health công khai đều `200`
- Register không treo
- Temp-Mail nhận được mã trong cửa sổ chờ
- Verify thành công và vào onboarding
- Onboarding ra `result card`
- Mở lại app vào thẳng `home-screen`
- Login và refresh thành công
- Ít nhất 1 primary fixture đi trọn `gallery → result → AddMealFromVision → diary`

### Điều kiện fail ngay

- Register treo quá lâu
- Mail không tới sau khi hết cửa sổ chờ và đã resend đúng quy trình
- Onboarding chỉ ra `error card`
- AI scan treo, rơi khỏi flow, hoặc báo network fail rõ ràng
- Vượt budget request

---

## Secret contract

Bắt buộc:

- `RENDER_API_KEY`
- `EATFITAI_DEMO_EMAIL` / `EATFITAI_DEMO_PASSWORD`
- `EATFITAI_SMOKE_EMAIL` / `EATFITAI_SMOKE_PASSWORD`

Quy ước:

- `RENDER_API_KEY` đọc từ shell env hoặc Windows user env
- Không ghi key vào repo, `.env` tracked, markdown, JSON hay screenshot

---

## Trạng thái cloud hiện tại

- `eatfitai-backend`: service id `srv-d7arf2svjg8s73em138g`, branch `hieu_deploy/production`, auto deploy `yes`
- `eatfitai-ai-provider`: service id `srv-d7arf2kvjg8s73em1360`, branch `hieu_deploy/production`, auto deploy `yes`

Push branch `hieu_deploy/production` lên `origin` sẽ tự động rollout cloud cho cả 2 service.

---

## Thứ tự release khuyến nghị

1. Chạy Gate 0 và Gate 1
2. Chạy Gate 2 trên Android automation
3. Chạy lane real-device và cập nhật evidence bundle
4. Chạy Gate 4 sau khi Render rollout xong
5. Chỉ coi lane ổn định khi `smoke:rehearsal` xác nhận 3 session gần nhất đều pass

---

## Voice: nguồn sự thật

Từ ngày `2026-04-16`, lane test và release gate phải bám code hiện tại:

- mobile → backend `/api/voice/transcribe`
- mobile → backend `/api/voice/parse`

Không test theo tài liệu cũ mô tả mobile gọi trực tiếp AI provider cho voice parse/transcribe.
