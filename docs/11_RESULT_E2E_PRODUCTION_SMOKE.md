# Result E2E Production Smoke

Cập nhật: `2026-04-09`

Tài liệu này mô tả lane smoke production cho flow:

`temp-mail -> register -> verify email -> onboarding -> reopen -> home -> AI Result -> AddMealFromVision -> diary readback`

Mục tiêu:

- xác nhận mobile đang hit `https://eatfitai-backend.onrender.com`, không phải `10.0.2.2`
- xác nhận cloud path thật là `mobile -> Render backend -> Render ai-provider -> Supabase`
- giới hạn số request để không đi quá budget production
- lưu evidence đầy đủ cho auth, onboarding, AI Result, diary write/readback

## Runtime rules

1. Không sửa `.env.development` để đổi lane mặc định.
2. Chỉ dùng lane riêng `start-mobile-cloud-smoke.ps1` cho smoke production.
3. Không gọi `teach-label` trên production.
4. Mỗi run chỉ dùng `1` account disposable mới tạo.
5. Nếu `register-with-verification` còn treo hoặc Temp-Mail không nhận mail sau cửa sổ chờ, dừng full E2E và chốt blocker `auth-delivery`.

## Local model parity

AI provider local ưu tiên:

1. `ai-provider/best.pt`
2. `ai-provider/yolov8s.pt`

Để đồng bộ model local:

```powershell
powershell -ExecutionPolicy Bypass -File .\sync-ai-provider-model.ps1
```

Mặc định script sẽ copy từ:

- `C:\Users\pc2\Downloads\best.pt`
- `C:\Users\pc2\Downloads\yolov8s.pt`

## Start session

PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-mobile-cloud-smoke.ps1
```

Script sẽ:

1. nạp env Android/JDK từ `_config/dev-env.ps1`
2. ép `EXPO_PUBLIC_API_BASE_URL=https://eatfitai-backend.onrender.com`
3. chạy `generate-local-ip.js`
4. chạy `check-api-target.js`
5. chạy `production-smoke-preflight.js`
6. khởi tạo `request-budget.json`
7. start Expo với output session riêng trong `_logs/production-smoke/<timestamp>`

## Session artifacts

Mỗi session sẽ có:

- `preflight-results.json`
- `request-budget.json`
- `fixture-manifest.json`
- `manual-checklist.md`

Nếu đã có account smoke:

```powershell
$env:EATFITAI_SMOKE_EMAIL='your-temp-mail@example.com'
$env:EATFITAI_SMOKE_PASSWORD='your-password'
node .\eatfitai-mobile\scripts\production-smoke-preflight.js
```

## Request budget

Budget mặc định mỗi run:

- `healthPerEndpoint = 2`
- `registerWithVerification = 1`
- `resendVerification = 1`
- `verifyEmail = 2`
- `login = 1`
- `refresh = 1`
- `aiStatus = 1`
- `visionDetect = 6`
- `mealDiaryWrite = 3`

Các lệnh budget:

```powershell
node .\eatfitai-mobile\scripts\production-smoke-budget.js status
node .\eatfitai-mobile\scripts\production-smoke-budget.js hit registerWithVerification 1 "register temp-mail"
node .\eatfitai-mobile\scripts\production-smoke-budget.js hit verifyEmail 1 "verify code accepted"
node .\eatfitai-mobile\scripts\production-smoke-budget.js hit visionDetect 1 "primary egg fixture"
node .\eatfitai-mobile\scripts\production-smoke-budget.js hit mealDiaryWrite 1 "add meal from vision"
node .\eatfitai-mobile\scripts\production-smoke-budget.js note "mail arrived after 75 seconds"
```

Nếu `hit` làm vượt limit, script sẽ fail và coi như phải dừng run.

## Temp-Mail lane chuẩn

1. Mở [temp-mail.org/vi](https://temp-mail.org/vi/) trên Chrome trong VM trước khi đăng ký.
2. Copy đúng địa chỉ mailbox đang hiển thị, không gõ tay nếu tránh được.
3. Dùng chính mailbox đó để đăng ký trên app.
4. Sau khi submit register, giữ tab Temp-Mail mở sẵn.
5. Poll inbox mỗi `15s` trong tối đa `180s`.
6. Nếu chưa có mail, dùng `resend-verification` đúng `1` lần, chờ cooldown `60s`, rồi poll thêm tối đa `180s`.
7. Mã verify có TTL `15 phút`; nếu đã chờ quá lâu và còn dưới `5 phút`, bỏ mailbox đó và tạo account mới.

## Gallery fixture lane

Vì emulator không có camera, chỉ dùng gallery.

Tạo một thư mục fixture riêng trong thư viện VM, ví dụ:

`EatFitAI Smoke 2026-04-09`

### Primary gate fixtures

- `egg`
- `banana`
- `rice`
- `broccoli`
- `spinach`

Mỗi class nên có:

- `1` ảnh primary
- `1` ảnh backup

### Benchmark only

- `chicken`
- `beef`
- `pork`

Không dùng riêng `chicken/beef/pork` làm release gate, vì audit cũ đã từng ghi nhận `no detections`.

### Tiêu chí chọn ảnh

- chỉ có `1` món chính
- món chiếm phần lớn khung hình
- nền đơn giản
- không collage
- không watermark lớn
- không tay/người che
- file dưới `10MB`

### Quy ước tên file

- `ai-primary-egg-01.jpg`
- `ai-primary-rice-01.jpg`
- `ai-primary-broccoli-01.jpg`
- `ai-benchmark-chicken-01.jpg`
- `ai-benchmark-beef-01.jpg`

## Manual smoke checklist

1. Chạy session bằng `start-mobile-cloud-smoke.ps1`.
2. Xác nhận `preflight-results.json` cho thấy:
   - `GET /healthz = 200`
   - `GET /health/live = 200`
   - `GET /health/ready = 200`
3. Mở Temp-Mail và copy mailbox.
4. Đăng ký account trên app với format display name `Smoke Result YYYYMMDD-HHMM`.
5. Record budget `registerWithVerification`.
6. Chờ mail verify tới Temp-Mail.
7. Nhập đúng mã 6 số vào `VerifyEmailScreen`.
8. Record budget `verifyEmail`.
9. Hoàn tất onboarding với profile cố định:
   - `fullName = Smoke Result`
   - `gender = male`
   - `age = 30`
   - `heightCm = 170`
   - `weightKg = 70`
   - `goal = maintain`
   - `activityLevel = moderate`
10. Pass onboarding khi thấy `auth-onboarding-result-card`, không phải `auth-onboarding-error-card`.
11. Đóng hẳn app, mở lại, pass khi vào `home-screen`.
12. Chạy preflight lại với `EATFITAI_SMOKE_EMAIL/PASSWORD`.
13. Record budget `login`, `refresh`, `aiStatus`.
14. Từ home, vào quick add scan.
15. Xác nhận `ai-scan-status-badge`, `ai-scan-gallery-button`, `ai-scan-capture-button`.
16. Chạy trước fixture `primary`.
17. Với mỗi lần detect, record budget `visionDetect`.
18. Nếu có result usable, vào `vision-add-meal-screen`.
19. Đổi meal type và tăng grams ít nhất `1` lần.
20. Confirm save và record budget `mealDiaryWrite`.
21. Quay lại diary/home summary và xác nhận item vừa ghi xuất hiện.
22. Chỉ sau khi có ít nhất `1` primary pass end-to-end mới chạy benchmark `chicken/beef/pork`.

## Evidence checklist

- `preflight-results.json`
- `request-budget.json`
- screenshot mailbox Temp-Mail
- screenshot email chứa mã verify
- screenshot verify success / onboarding result
- screenshot home sau reopen
- screenshot AI Result
- screenshot diary sau save
- logcat quanh:
  - register / verify
  - onboarding
  - AI detect / diary save

## Pass / fail gates

### Pass tối thiểu

- health công khai đều `200`
- register không treo
- Temp-Mail nhận được mã trong cửa sổ chờ
- verify thành công và vào onboarding
- onboarding ra `result card`
- mở lại app vào thẳng `home-screen`
- `login` và `refresh` thành công
- ít nhất `1` primary fixture đi trọn `gallery -> result -> AddMealFromVision -> diary`

### Fail ngay

- `register-with-verification` treo quá lâu
- mail không tới sau khi hết cửa sổ chờ và đã resend đúng quy trình
- onboarding chỉ ra `error card`
- AI scan treo, rơi khỏi flow, hoặc báo network fail rõ ràng
- vượt budget request

## Known limits

- `api/ai/status` cần auth; không có account thì preflight chỉ kiểm tra public health.
- `jest-expo` hiện không ổn định ở `__tests__/aiService.test.ts`, nên Jest không phải gate của lane này.
- Nếu chưa có CLI automation khác, lane này vẫn dùng manual smoke trên emulator làm gate chính.
