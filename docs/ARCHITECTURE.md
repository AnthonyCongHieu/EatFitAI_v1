# Kiến trúc hiện tại của EatFitAI

Cập nhật: `2026-04-19`

Tài liệu này mô tả trạng thái code hiện tại của repo, dựa trên source và tài liệu đang có. Đây không phải là roadmap.

## 1) Tổng quan

EatFitAI hiện là hệ thống local-first với 4 phần chính:

1. `eatfitai-mobile` - app Expo / React Native.
2. `eatfitai-backend` - ASP.NET Core Web API.
3. `ai-provider` - Flask service cho vision, nutrition và voice.
4. SQL Server local - lưu user, diary, profile, food, metrics và các bảng domain khác.

Luồng runtime chính:

- Mobile -> Backend -> SQL Server
- Mobile -> Backend -> AI provider
- Mobile voice -> Backend proxy -> AI provider

Các lane smoke và release dùng dữ liệu trong `_logs/production-smoke/<timestamp>` và được mô tả thêm trong [TESTING_AND_RELEASE.md](TESTING_AND_RELEASE.md).

## 2) Cấu trúc repo

- `eatfitai-mobile/src/app` - navigation, screens và flow UI.
- `eatfitai-mobile/src/components` - component dùng lại.
- `eatfitai-mobile/src/services` - API client, auth, diary, voice, AI, profile, stats.
- `eatfitai-mobile/src/store` - Zustand stores.
- `eatfitai-mobile/src/i18n` - chuỗi ngôn ngữ, hiện có tiếng Việt.
- `eatfitai-backend/Controllers` - endpoint HTTP.
- `eatfitai-backend/Services` - business logic.
- `eatfitai-backend/Repositories` - truy cập dữ liệu.
- `eatfitai-backend/DbScaffold` và `Migrations` - mô hình EF / schema đang dùng.
- `ai-provider/app.py` - entrypoint Flask và route AI.
- `scripts/cloud` - guard và script kiểm tra encoding / mojibake.
- `eatfitai-mobile/scripts` - smoke, release gate và helper chạy cloud/local.

## 3) Mobile app

Mobile app là frontend chính của sản phẩm. Những khối đáng chú ý:

- Navigation: `AppNavigator`, `AppTabs`, `StatsNavigator`.
- Auth flow: `Welcome`, `Login`, `Register`, `VerifyEmail`, `ForgotPassword`, `Onboarding`, `IntroCarousel`.
- Diary flow: `FoodSearch`, `FoodDetail`, `CustomDish`, `MealDiary`.
- AI flow: `AIScan`, `VisionHistory`, `RecipeSuggestions`, `RecipeDetail`, `NutritionInsights`, `NutritionSettings`, `DietaryRestrictions`.
- Profile flow: `Profile`, `EditProfile`, `BodyMetrics`, `GoalSettings`, `WeightHistory`, `ChangePassword`, `Notifications`, `About`, `PrivacyPolicy`.
- Stats flow: `Stats`, `WeekStats`, `MonthStats`.

Data/state pattern:

- `apiClient.ts` giữ URL backend hiện tại, retry và discovery cache.
- `ipScanner.ts` scan LAN và verify `/discovery`.
- `authTokens.ts`, `authSession.ts` và `secureStore.ts` giữ token an toàn.
- `useAuthStore`, `useDiaryStore`, `useProfileStore`, `useStatsStore`, `useVoiceStore` giữ state cục bộ.

Voice hiện tại đi qua backend proxy:

- `POST /api/voice/transcribe`
- `POST /api/voice/parse`
- `POST /api/voice/execute`
- `POST /api/voice/confirm-weight`

## 4) Backend

Backend là lớp business logic và API chuẩn của hệ thống.

### 4.1 Các mảng chính

- Auth: đăng ký, xác minh email, đăng nhập, refresh token, quên mật khẩu, đổi mật khẩu.
- Google auth: luồng riêng cho sign-in/link Google.
- Profile: đọc/cập nhật/xóa hồ sơ, body metrics.
- Diary / food: search, custom dish, meal diary, favorites, water intake.
- AI: status, nutrition, vision, voice proxy, summary.
- Health/discovery: health checks và discovery endpoint cho mobile LAN scan.

### 4.2 Cấu trúc thư mục

- `Controllers` - ánh xạ HTTP endpoints.
- `Services` - xử lý nghiệp vụ và orchestration.
- `Repositories` - truy vấn dữ liệu.
- `Models` / `DTOs` - contract giữa tầng HTTP và data.
- `Tests` - test backend hiện có.

### 4.3 Auth và Google

Hiện code vẫn có hai lớp Google auth:

- `POST /api/auth/google/signin` và `POST /api/auth/google/link` trong `GoogleAuthController`.
- `GET /api/auth/google` trong `AuthController` vẫn tồn tại như nhánh legacy.

`docs/AUTH_AND_INFRA.md` và code backend là nguồn phù hợp nhất khi cần quyết định luồng auth nào đang sống.

## 5) AI provider

`ai-provider` là service Python Flask cho các chức năng AI.

Những route và năng lực chính:

- `GET /healthz`
- `GET /healthz/gemini`
- vision detection / nutrition advice / meal insight / cooking instructions
- voice parse / transcription support

Các module nổi bật:

- `app.py` - Flask app và route wiring.
- `nutrition_llm.py` - logic dinh dưỡng.
- `stt_service.py` - speech-to-text.
- `gemini_pool.py` - quản lý pool / gọi Gemini.

## 6) Dữ liệu và lưu trữ

- SQL Server là DB runtime chính.
- Backend dùng EF Core và có cả DbContext / scaffold hiện hữu trong repo.
- Mobile lưu token và một số cache discovery trong `AsyncStorage` / `SecureStore`.
- Smoke scripts ghi evidence vào `_logs/production-smoke/<timestamp>` để phục vụ release gate và hậu kiểm.

## 7) Smoke và release infra

Trong `eatfitai-mobile/scripts` có các lane smoke chính:

- `production-smoke-preflight.js`
- `production-smoke-auth-api.js`
- `production-smoke-user-api.js`
- `production-smoke-ai-api.js`
- `production-smoke-cleanup.js`
- `production-smoke-backend-non-ui.js`
- `production-smoke-seed-cloud.js`
- `production-smoke-regression.js`
- `production-smoke-metrics.js`
- `production-smoke-rehearsal.js`

Contract artifact thường gặp:

- `preflight-results.json`
- `auth-api-report.json`
- `user-api-report.json`
- `ai-api-report.json`
- `cleanup-report.json`
- `backend-non-ui-summary.json`
- `demo-seed.json`
- `regression-run.json`
- `metrics-baseline.json`

Mô hình hiện tại:

- `auth-api` sở hữu luồng đăng ký/xác minh email bằng mailbox disposable.
- `user-api` dùng credentials đã có sẵn và không tự dựa vào legacy `POST /api/auth/register`.
- `backend-non-ui` tổng hợp cloud gate riêng với baseline code health riêng.

## 8) Điểm cần lưu ý khi thay đổi

- Voice hiện đã chuyển qua backend proxy, nên đổi endpoint ở backend trước khi đổi client.
- Nếu đụng auth Google, cần kiểm tra cả luồng legacy và luồng `GoogleAuthController`.
- Smoke reports nên tránh ghi secrets thô vào JSON/console summary.
- Khi sửa encoding, ưu tiên sửa guard và source thật thay vì “phục hồi dấu” từ text bị hỏng.
- Gate chuẩn cho release vẫn nằm trong [TESTING_AND_RELEASE.md](TESTING_AND_RELEASE.md).
