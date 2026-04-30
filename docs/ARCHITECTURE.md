# Current Architecture of EatFitAI

Updated: `2026-04-23`

This document describes the current architecture of the repository. When there are discrepancies, prioritize:

## 1) Overview

EatFitAI is currently a local-first system with 4 main parts:

1. `eatfitai-mobile` - Expo / React Native app.
2. `eatfitai-backend` - ASP.NET Core Web API.
3. `ai-provider` - Flask service for vision, nutrition, and voice.
4. PostgreSQL (Supabase) - stores user, diary, profile, food, metrics, and other domain tables. (Local dev can use SQL Server or local PostgreSQL.)

Main runtime flows:

- Mobile -> Backend -> PostgreSQL (Supabase)
- Mobile -> Backend -> AI provider
- Mobile voice -> Backend proxy -> AI provider

The smoke and release lanes use data in `_logs/production-smoke/<timestamp>` and are described further in [TESTING_AND_RELEASE.md](TESTING_AND_RELEASE.md).

## 2) Repository Structure

- `eatfitai-mobile/src/app` - navigation, screens, and UI flows.
- `eatfitai-mobile/src/components` - reusable components.
- `eatfitai-mobile/src/services` - API client, auth, diary, voice, AI, profile, stats.
- `eatfitai-mobile/src/store` - Zustand stores.
- `eatfitai-mobile/src/i18n` - language strings, currently containing Vietnamese.
- `eatfitai-backend/Controllers` - HTTP endpoints.
- `eatfitai-backend/Services` - business logic.
- `eatfitai-backend/Repositories` - data access.
- `eatfitai-backend/DbScaffold` and `Migrations` - current EF models / schema.
- `ai-provider/app.py` - Flask entrypoint and AI routes.
- `scripts/cloud` - guards and scripts to check encoding / mojibake.
- `eatfitai-mobile/scripts` - smoke, release gates, and helpers to run cloud/local.

## 3) Mobile App

The mobile app is the main frontend of the product. Notable blocks:

- Navigation: `AppNavigator`, `AppTabs`, `StatsNavigator`.
- Auth flow: `Welcome`, `Login`, `Register`, `VerifyEmail`, `ForgotPassword`, `Onboarding`, `IntroCarousel`.
- Diary flow: `FoodSearch`, `FoodDetail`, `CustomDish`, `MealDiary`.
- AI flow: `AIScan`, `VisionHistory`, `RecipeSuggestions`, `RecipeDetail`, `NutritionInsights`, `NutritionSettings`, `DietaryRestrictions`.
- Profile flow: `Profile`, `EditProfile`, `BodyMetrics`, `GoalSettings`, `WeightHistory`, `ChangePassword`, `Notifications`, `About`, `PrivacyPolicy`.
- Stats flow: `Stats`, `WeekStats`, `MonthStats`.

Data/state patterns:

- `apiClient.ts` holds the current backend URL, retries, and discovery cache.
- `ipScanner.ts` scans LAN and verifies `/discovery`.
- `authTokens.ts`, `authSession.ts`, and `secureStore.ts` keep tokens secure.
- `useAuthStore`, `useDiaryStore`, `useProfileStore`, `useStatsStore`, `useVoiceStore` hold local state.

Voice currently goes through the backend proxy:

- `POST /api/voice/transcribe`
- `POST /api/voice/parse`
- `POST /api/voice/execute`
- `POST /api/voice/confirm-weight`

## 4) Backend

The backend is the business logic layer and standard API of the system.

### 4.1 Main areas

- Auth: registration, email verification, login, refresh token, forgot password, change password.
- Google auth: separate flows for Google sign-in/link.
- Profile: read/update/delete profiles, body metrics.
- Diary / food: search, custom dish, meal diary, favorites, water intake.
- AI: status, nutrition, vision, voice proxy, summary.
- Health/discovery: health checks and discovery endpoints for LAN scan by mobile.

### 4.2 Directory structure

- `Controllers` - map to HTTP endpoints.
- `Services` - handle business logic and orchestration.
- `Repositories` - data queries.
- `Models` / `DTOs` - contract between HTTP layer and data.
- `Tests` - existing backend tests.

### 4.3 Auth and Google

Canonical Google auth now uses only these backend endpoints:

- `POST /api/auth/google/signin` and `POST /api/auth/google/link` in `GoogleAuthController`.
- `GET /api/auth/google` was removed in Phase B and should return `404` or `405`.

`docs/AUTH_AND_INFRA.md` and the backend code are the most relevant sources when deciding which auth flow is active.

## 5) AI Provider

`ai-provider` is a Python Flask service for AI functionalities.

Main routes and capabilities:

- `GET /healthz`
- `GET /healthz/gemini`
- vision detection / nutrition advice / meal insight / cooking instructions
- voice parse / transcription support

Notable modules:

- `app.py` - Flask app and route wiring.
- `nutrition_llm.py` - nutrition logic.
- `stt_service.py` - speech-to-text.
- `gemini_pool.py` - manages pool / calls to Gemini.

## 6) Data and Storage

- PostgreSQL (Supabase) is the primary production runtime DB. Local dev can use SQL Server or PostgreSQL.
- The backend uses EF Core (Npgsql provider for production) and has the DbContext / scaffold present in the repo.
- Mobile saves tokens and some discovery cache in `AsyncStorage` / `SecureStore`.
- Smoke scripts log evidence into `_logs/production-smoke/<timestamp>` for release gating and post-checks.

## 7) Smoke and Release Infra

In `eatfitai-mobile/scripts`, there are main smoke lanes:

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

Common contract artifacts:

- `preflight-results.json`
- `auth-api-report.json`
- `user-api-report.json`
- `ai-api-report.json`
- `cleanup-report.json`
- `backend-non-ui-summary.json`
- `demo-seed.json`
- `regression-run.json`
- `metrics-baseline.json`

Current model:

- `auth-api` owns the registration/email verification flow using a disposable mailbox.
- `user-api` uses existing credentials and doesn't rely directly on the legacy `POST /api/auth/register`.
- `backend-non-ui` aggregates separate cloud gates with a separate code health baseline.

## 8) Important Notes When Making Changes

- Voice has now migrated to a backend proxy, so change endpoints on the backend before the client.
- If touching Google auth, verify both the legacy flow and the `GoogleAuthController` flow.
- Smoke reports should avoid writing raw secrets to JSON/console summaries.
- When fixing encoding issues, prioritize fixing the guard and the actual source rather than "recovering marks" from corrupted text.
- The standard gate for release is still located in [TESTING_AND_RELEASE.md](TESTING_AND_RELEASE.md).
