# Cloud Product Progress 2026-04-17

## Mục tiêu

Đưa EatFitAI về trạng thái gần `product-ready` nhất có thể cho flow end-user đi qua cloud:

- mobile -> render-backend -> render-ai-provider -> supabase
- auth, database, AI, và UI evidence phải có chứng cứ thật
- secret Render chỉ dùng local, không commit

## Những gì đã hoàn thành

### 1. Sửa live Render AI provider base URL

- Đã xác nhận backend live trước đó đang dùng sai:
  - `AIProvider__VisionBaseUrl = https://generativelanguage.googleapis.com`
- Đã cập nhật live env trên Render backend sang:
  - `https://eatfitai-ai-provider.onrender.com`
- Đã thêm `AIProvider__VoiceBaseUrl` cùng giá trị trên live backend
- Đã trigger `deploy_only` qua Render API
- Sau deploy, `GET /api/ai/status` đã trở lại:
  - `state = HEALTHY`
  - `providerUrl = https://eatfitai-ai-provider.onrender.com`
  - `consecutiveFailures = 0`
  - `modelLoaded = true`
  - `geminiConfigured = true`

Evidence:

- [preflight-results.json](D:/EatFitAI_v1/_logs/production-smoke/cloud-after-render-fix-20260417-0245/preflight-results.json)

### 2. Khóa cloud proof cho auth + health + DB

- `smoke:render:verify` pass
- `smoke:preflight` pass với auth bật thật:
  - `backendReady = 200`
  - `backendLive = 200`
  - `aiProviderHealthz = 200`
  - `login = 200`
  - `aiStatus = 200`
  - `refresh = 200`
- `smoke:seed:cloud` pass cho:
  - profile
  - meal diary
  - nutrition current
  - favorites
  - relogin

Evidence:

- [demo-seed.json](D:/EatFitAI_v1/_logs/production-smoke/cloud-after-render-fix-20260417-0245/demo-seed.json)
- [metrics-baseline.json](D:/EatFitAI_v1/_logs/production-smoke/cloud-after-render-fix-20260417-0245/metrics-baseline.json)

### 3. Regression sau khi sửa live config

`smoke:regression` với mutation bật cho kết quả:

- Search:
  - pass `4/4`
- Voice:
  - parse `5/5`
  - execute `3/3`
  - diary readback `1/1`
- Nutrition:
  - suggest `1/1`
  - apply `1/1`
- Scan:
  - primary pass `2/5`
  - usable primary results `2/5`
  - benchmark pass `2/2`

Evidence:

- [regression-run.json](D:/EatFitAI_v1/_logs/production-smoke/cloud-after-render-fix-20260417-0245/regression-run.json)

## Những gì đã vá trong code

### Backend

- Harden AI health gate / proxy:
  - [AIController.cs](D:/EatFitAI_v1/eatfitai-backend/Controllers/AIController.cs)
  - [AiHealthService.cs](D:/EatFitAI_v1/eatfitai-backend/Services/AiHealthService.cs)
  - [AiHealthServiceTests.cs](D:/EatFitAI_v1/eatfitai-backend/Tests/Unit/Services/AiHealthServiceTests.cs)
  - [AIVisionControllerTests.cs](D:/EatFitAI_v1/eatfitai-backend/Tests/Integration/Controllers/AIVisionControllerTests.cs)
- Preferences / profile cleanup / stale contract fixes:
  - [UserPreferenceService.cs](D:/EatFitAI_v1/eatfitai-backend/Services/UserPreferenceService.cs)
  - [UserService.cs](D:/EatFitAI_v1/eatfitai-backend/Services/UserService.cs)
  - [UserPreferenceServiceTests.cs](D:/EatFitAI_v1/eatfitai-backend/Tests/Unit/Services/UserPreferenceServiceTests.cs)
  - [UserServiceTests.cs](D:/EatFitAI_v1/eatfitai-backend/Tests/Unit/Services/UserServiceTests.cs)

### Mobile / smoke / release gate

- Thống nhất resolver credential cho cloud smoke:
  - [smoke-credentials.js](D:/EatFitAI_v1/eatfitai-mobile/scripts/lib/smoke-credentials.js)
  - [production-smoke-preflight.js](D:/EatFitAI_v1/eatfitai-mobile/scripts/production-smoke-preflight.js)
  - [production-smoke-regression.js](D:/EatFitAI_v1/eatfitai-mobile/scripts/production-smoke-regression.js)
  - [smokeCredentials.test.js](D:/EatFitAI_v1/eatfitai-mobile/__tests__/smokeCredentials.test.js)
- Fix stale mobile API path:
  - [useAuthStore.ts](D:/EatFitAI_v1/eatfitai-mobile/src/store/useAuthStore.ts)
  - [mealService.ts](D:/EatFitAI_v1/eatfitai-mobile/src/services/mealService.ts)
  - [authStore.test.ts](D:/EatFitAI_v1/eatfitai-mobile/__tests__/authStore.test.ts)
  - [mealService.test.ts](D:/EatFitAI_v1/eatfitai-mobile/__tests__/mealService.test.ts)
- Release-like Android and diagnostics hardening:
  - [build-android-preview.ps1](D:/EatFitAI_v1/eatfitai-mobile/scripts/build-android-preview.ps1)
  - [install-android-preview.ps1](D:/EatFitAI_v1/eatfitai-mobile/scripts/install-android-preview.ps1)
  - [automation-doctor.js](D:/EatFitAI_v1/eatfitai-mobile/scripts/automation-doctor.js)
  - [run-maestro.js](D:/EatFitAI_v1/eatfitai-mobile/scripts/run-maestro.js)
  - [product-release-gate.js](D:/EatFitAI_v1/eatfitai-mobile/scripts/product-release-gate.js)
  - [start-authenticated.yaml](D:/EatFitAI_v1/eatfitai-mobile/.maestro/subflows/start-authenticated.yaml)
  - [Screen.tsx](D:/EatFitAI_v1/eatfitai-mobile/src/components/Screen.tsx)
  - [IntroCarouselScreen.tsx](D:/EatFitAI_v1/eatfitai-mobile/src/app/screens/auth/IntroCarouselScreen.tsx)
  - [pho-bowl.jpg](D:/EatFitAI_v1/eatfitai-mobile/src/assets/pho-bowl.jpg)

### Appium evidence lane

- Lane mới cho cloud-proof:
  - [cloud-proof.android.js](D:/EatFitAI_v1/tools/appium/cloud-proof.android.js)
  - [common.js](D:/EatFitAI_v1/tools/appium/lib/common.js)
  - [package.json](D:/EatFitAI_v1/tools/appium/package.json)
  - [README.md](D:/EatFitAI_v1/tools/appium/README.md)
- Kế hoạch / runbook:
  - [24_PRODUCT_RELEASE_TEST_PLAN_2026-04-16.md](D:/EatFitAI_v1/docs/24_PRODUCT_RELEASE_TEST_PLAN_2026-04-16.md)

## Trạng thái hiện tại theo nhóm chức năng

### Đã usable qua cloud

- Auth email core
- Refresh token
- Search
- Profile cơ bản
- Meal diary CRUD qua seed/regression API lane
- Favorites
- Nutrition suggest/apply
- Voice text parse/execute/readback

### Đã cải thiện mạnh nhưng chưa product-ready hoàn toàn

- AI vision scan
  - từ `0/5` usable primary lên `2/5`
  - vẫn chưa đạt gate `scan -> result -> add meal -> diary`
- Voice text
  - usable
  - nhưng `sourceBreakdown` vẫn còn `backend-rule-fallback` chiếm đa số

### Chưa sẵn sàng

- Voice audio / STT cloud
  - provider hiện vẫn `ENABLE_STT=false`
- UI evidence bundle end-to-end
  - Appium lane mới đã tạo được artifact bước đầu
  - nhưng rerun cuối bị rớt ADB device nên chưa đủ screenshot/logcat bundle hoàn chỉnh

## Blocker còn lại

### 1. Cloud DB schema drift

Render logs xác nhận production DB đang thiếu schema so với code:

- `UserPreference.Allergies` không tồn tại
- `AILog.DurationMs` không tồn tại

Hệ quả:

- `GET /api/user/preferences` trả `500`
- `POST /api/user/preferences` trả `500`
- một phần flow `DELETE /api/profile` có thể trả `500`

Đây là drift ở production database, không phải chỉ bug controller/service.

### 2. Scan gate chưa đủ

- `scanGatePass = false`
- `scanToSaveCompletionPassed = false`
- hiện mới có regression API proof, chưa có UI proof hoàn chỉnh cho `scan -> save -> diary`

### 3. Evidence / risk gate chưa đủ

- `evidenceComplete = false`
- `riskScenariosPass = false`
- chưa có bundle đầy đủ:
  - mailbox
  - verification
  - onboarding
  - home
  - ai result
  - diary
  - logcat

## Artifact Appium đã có

- [cloud-proof-auth-home.png](D:/EatFitAI_v1/_logs/production-smoke/appium-cloud-proof-20260417-1/appium/2026-04-16T18-51-29-533Z-cloud-proof-auth-home.png)
- [cloud-proof-auth-home.xml](D:/EatFitAI_v1/_logs/production-smoke/appium-cloud-proof-20260417-1/appium/2026-04-16T18-51-29-533Z-cloud-proof-auth-home.xml)
- [cloud-proof-auth-home.json](D:/EatFitAI_v1/_logs/production-smoke/appium-cloud-proof-20260417-1/appium/2026-04-16T18-51-29-533Z-cloud-proof-auth-home.json)
- [cloud-proof-auth-failure.json](D:/EatFitAI_v1/_logs/production-smoke/appium-cloud-proof-20260417-2/appium/2026-04-16T18-53-00-794Z-cloud-proof-auth-failure.json)

## Việc cần làm tiếp

1. Vá production DB schema drift cho `ApplicationDbContext`:
   - `AILog.DurationMs`
   - `UserPreference` columns
2. Smoke lại:
   - `GET /api/user/preferences`
   - `POST /api/user/preferences`
   - `DELETE /api/profile`
3. Reconnect thiết bị và rerun:
   - `npm --prefix .\\tools\\appium run cloud-proof:android -- --output <session>`
4. Thêm hoặc hoàn tất lane `scan-to-save` UI proof
5. Chạy lại:
   - `smoke:metrics`
   - `smoke:rehearsal` sau khi có ít nhất 3 session đủ evidence
