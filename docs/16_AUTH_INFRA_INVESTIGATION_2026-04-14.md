# Auth + Infra Investigation 2026-04-14

## Summary

This document captures the current investigation status for:

- Google sign-in failure
- Forgot-password and production email delivery
- Shared-infrastructure risk across mobile, backend, admin, Render, Supabase, and Vercel
- A practical remediation plan for reliability now and for scaling beyond a few concurrent internal testers

Evidence labels used in this document:

- `Verified from repo`
- `Verified from live API / live mailbox`
- `Verified from official docs`
- `Inference / recommendation`

## 1. Google Sign-In

### 1.1 What the mobile UI will show

- `Verified from repo`: [LoginScreen.tsx](E:/tool%20edit/eatfitai_v1/eatfitai-mobile/src/app/screens/auth/LoginScreen.tsx) shows the toast title `Đăng nhập Google thất bại` and uses `e?.message || 'Vui lòng thử lại'` for the detail message at lines 113-114.
- `Verified from repo`: [useAuthStore.ts](E:/tool%20edit/eatfitai_v1/eatfitai-mobile/src/store/useAuthStore.ts) throws `Không thể khởi tạo Google Sign-In. Kiểm tra EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID và env mobile.` at line 251 if Google native configuration fails before the backend call.

### 1.2 Mobile-side root cause

- `Verified from repo`: [google.config.ts](E:/tool%20edit/eatfitai_v1/eatfitai-mobile/src/config/google.config.ts) requires `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`; if missing, validation fails.
- `Verified from repo`: [eatfitai-mobile/.env.development](E:/tool%20edit/eatfitai_v1/eatfitai-mobile/.env.development) does not contain `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
- `Verified from repo`: [googleAuthService.ts](E:/tool%20edit/eatfitai_v1/eatfitai-mobile/src/services/googleAuthService.ts) explicitly states Android setup requires `google-services.json`.
- `Verified from repo`: no `google-services.json` exists under `eatfitai-mobile/android/app/src`.

Conclusion:

- `Verified from repo`: the current mobile app is not fully configured for native Google Sign-In.

### 1.3 Backend-side root cause

- `Verified from repo`: mobile sends Google login to `POST /api/auth/google/signin` from [useAuthStore.ts](E:/tool%20edit/eatfitai_v1/eatfitai-mobile/src/store/useAuthStore.ts) line 267.
- `Verified from repo`: [GoogleAuthController.cs](E:/tool%20edit/eatfitai_v1/eatfitai-backend/Controllers/GoogleAuthController.cs) returns `503` with `Google Sign-in chua duoc cau hinh tren may chu` when no Google client IDs are configured at line 96.
- `Verified from live API`: `POST https://eatfitai-backend.onrender.com/api/auth/google/signin` currently returns:

```json
{
  "status": 503,
  "error": "Google Sign-in chua duoc cau hinh tren may chu"
}
```

Conclusion:

- `Verified from live API / live mailbox`: production backend Google Sign-In is not configured.

### 1.4 Final diagnosis for Google login

- `Verified from repo`: mobile-side Google config is incomplete.
- `Verified from live API / live mailbox`: backend-side Google config is also incomplete.

Practical impact:

- `Inference / recommendation`: even if mobile native setup is fixed first, users will still fail until Render backend gets valid `Google__WebClientId` and platform client IDs.
- `Inference / recommendation`: even if backend env is fixed first, current mobile build will still fail until the Expo/native Google config is completed and the app is rebuilt.

## 2. Forgot Password and Email Delivery

### 2.1 UI behavior

- `Verified from repo`: [ForgotPasswordScreen.tsx](E:/tool%20edit/eatfitai_v1/eatfitai-mobile/src/app/screens/auth/ForgotPasswordScreen.tsx) shows:
  - `Đã gửi mã xác minh` at line 78
  - `Gửi mã thất bại` at line 86
  - `Mã hợp lệ` at line 101
  - `Đổi mật khẩu thành công` at line 114
  - `Đổi mật khẩu thất bại` at line 121

Important UI caveat:

- `Verified from repo`: the screen moves from `verify` to `newPassword` locally in `onVerifyCode` without calling the backend to validate the code first.
- `Inference / recommendation`: this is a UX flaw, not a mail-delivery bug. Users can enter any code, only to fail later on the reset step.

### 2.2 Email transport

- `Verified from repo`: [EmailService.cs](E:/tool%20edit/eatfitai_v1/eatfitai-backend/Services/EmailService.cs) sends through the Brevo HTTP API, not SMTP.
- `Verified from repo`: if Brevo config is missing in production, [EmailService.cs](E:/tool%20edit/eatfitai_v1/eatfitai-backend/Services/EmailService.cs) throws `Brevo email is not configured.` at line 139.
- `Verified from repo`: [AuthController.cs](E:/tool%20edit/eatfitai_v1/eatfitai-backend/Controllers/AuthController.cs) maps this failure to `503` with `smtp_unavailable` on `forgot-password`.

### 2.3 Live verification of forgot-password and email sending

- `Verified from live API / live mailbox`: `POST https://eatfitai-backend.onrender.com/api/auth/forgot-password` for `eatfit833921@deltajohnsons.com` returned `200` with `Mã đặt lại đã được gửi tới email của bạn.`
- `Verified from live API / live mailbox`: the same mailbox received the reset email with subject `EatFitAI - Mã đặt lại mật khẩu`.
- `Verified from live API / live mailbox`: the latest received reset code was `019871`.
- `Verified from live API / live mailbox`: `POST /api/auth/reset-password` with that code returned `200` and `Đặt lại mật khẩu thành công`.
- `Verified from live API / live mailbox`: login with the new password then succeeded immediately.

Conclusion:

- `Verified from live API / live mailbox`: production forgot-password is working end-to-end with a real mailbox.
- `Verified from live API / live mailbox`: production email sending is currently working.

### 2.4 Email verification path

- `Verified from repo`: email verification codes are stored on the `User` row via `VerificationCode` and `VerificationCodeExpiry` in [AuthService.cs](E:/tool%20edit/eatfitai_v1/eatfitai-backend/Services/AuthService.cs) lines 645-646 and 789-790.
- `Verified from live API / live mailbox`: registration emails were also delivered to the same live mailbox.

Conclusion:

- `Verified from live API / live mailbox`: production mail sending is not the current blocker. Google Sign-In is the blocker.

## 3. Current Infra Contradictions

### 3.1 Render email source-of-truth mismatch

- `Verified from repo`: [render.yaml](E:/tool%20edit/eatfitai_v1/render.yaml) still declares `Smtp__Host`, `Smtp__Port`, `Smtp__User`, `Smtp__Password`, and `Smtp__FromEmail`.
- `Verified from repo`: [10_SUPABASE_RENDER_CLOUD_SETUP.md](E:/tool%20edit/eatfitai_v1/docs/10_SUPABASE_RENDER_CLOUD_SETUP.md) says production must use `Brevo__ApiKey`, `Brevo__SenderEmail`, and `Brevo__SenderName` at lines 72-74.
- `Verified from repo`: the same document says Render free web services cannot use outbound SMTP ports and therefore production mail uses the Brevo HTTPS API at line 82.
- `Verified from live API / live mailbox`: live production mail is in fact using Brevo successfully.

Conclusion:

- `Verified from repo`: `render.yaml` is stale and does not match the actual production mail path.
- `Inference / recommendation`: a future recreate/redeploy from blueprint can silently break email if this mismatch is not corrected.

### 3.2 Secret leak in repo

- `Verified from repo`: [appsettings.Development.json](E:/tool%20edit/eatfitai_v1/eatfitai-backend/appsettings.Development.json) contains a real Supabase connection string with password embedded.

Conclusion:

- `Verified from repo`: this is an active secret exposure and should be treated as compromised.

### 3.3 Database connection mode mismatch

- `Verified from repo`: [appsettings.Development.json](E:/tool%20edit/eatfitai_v1/eatfitai-backend/appsettings.Development.json) uses the Supabase pooler on port `6543` with `Pooling=false`.
- `Verified from repo`: [10_SUPABASE_RENDER_CLOUD_SETUP.md](E:/tool%20edit/eatfitai_v1/docs/10_SUPABASE_RENDER_CLOUD_SETUP.md) explicitly says the long-lived .NET backend should use Supavisor session mode on port `5432` at line 80.
- `Verified from repo`: [Program.cs](E:/tool%20edit/eatfitai_v1/eatfitai-backend/Program.cs) classifies `5432` as `supavisor-session` and `6543` as `supavisor-transaction`.

Conclusion:

- `Verified from repo`: repo guidance and repo development config disagree.
- `Inference / recommendation`: `6543` plus `Pooling=false` is the wrong default for a long-lived .NET backend and increases connection churn risk.

### 3.4 Background load already exists

- `Verified from repo`: [Program.cs](E:/tool%20edit/eatfitai_v1/eatfitai-backend/Program.cs) registers both `AiHealthBackgroundService` and `AdminRuntimeSnapshotBackgroundService` at lines 548 and 576.
- `Verified from repo`: [AiHealthService.cs](E:/tool%20edit/eatfitai_v1/eatfitai-backend/Services/AiHealthService.cs) polls `/healthz` every 30 seconds by default.
- `Verified from repo`: [AdminRuntimeSnapshotCache.cs](E:/tool%20edit/eatfitai_v1/eatfitai-backend/Services/AdminRuntimeSnapshotCache.cs) refreshes every 5 seconds by default.
- `Verified from repo`: [GeminiRuntimeProjectService.cs](E:/tool%20edit/eatfitai_v1/eatfitai-backend/Services/GeminiRuntimeProjectService.cs) loads runtime project state from `ApplicationDbContext` and runs `ToListAsync()` inside `LoadGroupedProjectsAsync()` at lines 481-487.

Conclusion:

- `Verified from repo`: even before user traffic, the backend already creates continuous background activity.
- `Inference / recommendation`: this supports the concern that two devs or a small amount of concurrent activity can expose configuration weaknesses early.

### 3.5 Reset-password is not multi-instance safe

- `Verified from repo`: [AuthService.cs](E:/tool%20edit/eatfitai_v1/eatfitai-backend/Services/AuthService.cs) stores password reset codes in `IMemoryCache`, not in the database.
- `Verified from repo`: reset codes are written with `_memoryCache.Set(...)` at lines 471 and 488 and read via `_memoryCache.TryGetValue(...)` at line 510.
- `Verified from repo`: email verification codes are persisted in the database, but password reset codes are not.

Conclusion:

- `Verified from repo`: forgot-password currently works on a single healthy instance.
- `Inference / recommendation`: password reset becomes fragile under restart, redeploy, or multi-instance scale because the code can be generated on one instance and validated on another.

## 4. Admin / Vercel Status

- `Verified from repo`: this workspace does not contain a live `eatfitai-admin` application codebase.
- `Verified from repo`: [EatFitAI_Admin_Documentation.md](E:/tool%20edit/eatfitai_v1/docs/EatFitAI_Admin_Documentation.md) is a blueprint for a future separate admin app, likely Next.js on Vercel.

Implication:

- `Inference / recommendation`: the admin architecture should be treated as future-facing. The correct design choice is to keep admin as a separate frontend deployment and avoid direct browser access to the database for privileged operations.

## 5. Official Docs That Matter

### 5.1 Supabase

- `Verified from official docs`: Supabase says deployed apps usually need at least two environments and supports separate development, staging, and production environments, with staging/preview via branching.
  - Source: [Supabase Deployment & Branching](https://supabase.com/docs/guides/deployment)

### 5.2 Render

- `Verified from official docs`: Render supports running multiple instances of web services, private services, and background workers to handle additional load, and load-balances traffic across instances.
  - Source: [Render Scaling](https://render.com/docs/scaling)
- `Verified from official docs`: Render recommends background workers for long-running asynchronous work that should not sit in the critical request path.
  - Source: [Render Background Workers](https://render.com/docs/background-workers)

### 5.3 Vercel

- `Verified from official docs`: Vercel documents `attachDatabasePool()` for Functions and says it should be called right after creating the pool so idle clients are released before functions suspend.
  - Source: [Vercel `@vercel/functions` API Reference](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package)
- `Verified from official docs`: Vercel supports custom environments with branch tracking and separate environment-variable pulls for staging-like setups.
  - Source: [Vercel Custom Environments](https://vercel.com/docs/deployments/environments#custom-environments)

## 6. What This Means for the “2 Devs Today, 100 Users Later” Question

### 6.1 Can two devs interfere with each other today?

Yes.

- `Verified from repo`: both devs can hit the same shared Supabase and Render resources if they point to the same backend and database.
- `Verified from repo`: the backend already has background polling and two DbContexts on the same connection string.
- `Inference / recommendation`: if small internal load already causes errors, that is an early indicator of weak connection strategy, weak environment isolation, or brittle background activity.

### 6.2 Does 100 users automatically mean failure?

No.

- `Verified from official docs`: both Render and Vercel provide scaling primitives.
- `Inference / recommendation`: the system fails at 100 users only if connection handling, background work placement, environment isolation, and observability remain weak.

### 6.3 The real problem

The real problem is not “100 users”.

The real problem is the combination of:

- shared environments
- stale configuration sources
- leaked secrets
- wrong connection defaults
- reset flow depending on in-memory state
- background jobs attached directly to the request-serving backend

## 7. Practical Fix Plan

### Phase 0: Stop hidden risk first

1. `Verified from repo` -> `Inference / recommendation`: rotate the leaked Supabase password immediately, because it is committed in [appsettings.Development.json](E:/tool%20edit/eatfitai_v1/eatfitai-backend/appsettings.Development.json).
2. `Verified from repo` -> `Inference / recommendation`: remove real credentials from repo and compiled output copies under `bin/`.
3. `Verified from repo` -> `Inference / recommendation`: align [render.yaml](E:/tool%20edit/eatfitai_v1/render.yaml) with Brevo so blueprint deploys cannot revert email back to dead SMTP settings.

### Phase 1: Restore auth correctness

1. `Inference / recommendation`: complete mobile Google native setup:
   - add `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - add platform client IDs as needed
   - add `google-services.json`
   - rebuild the app
2. `Inference / recommendation`: configure Render backend env for:
   - `Google__WebClientId`
   - `Google__AndroidClientId`
   - `Google__IosClientId`
3. `Inference / recommendation`: keep the UI toast, but improve backend error mapping so server misconfiguration becomes a clearer operator-visible issue.
4. `Inference / recommendation`: change forgot-password UX so the verify step actually validates the reset code before moving to the new-password screen.

### Phase 2: Make auth resilient across restarts and scale

1. `Verified from repo` -> `Inference / recommendation`: move password reset codes out of `IMemoryCache` into a shared store:
   - preferred: database table with hashed code, expiry, consumed flag
   - alternative: shared Redis cache with TTL
2. `Inference / recommendation`: keep email verification in the database as it is already closer to multi-instance safe behavior.
3. `Inference / recommendation`: add rate limits per email and per IP for forgot-password and resend verification endpoints.

### Phase 3: Fix DB connection strategy

1. `Verified from repo` -> `Inference / recommendation`: standardize long-lived backend connections on Supavisor session mode (`5432`) instead of the current dev example on `6543`.
2. `Verified from repo` -> `Inference / recommendation`: remove `Pooling=false` from application connection strings.
3. `Inference / recommendation`: review whether `AddDbContextPool` is appropriate for the two EF Core contexts after validating service lifetimes and any ambient transaction assumptions.
4. `Inference / recommendation`: keep health checks lightweight and make sure they do not amplify incident load.

### Phase 4: Reduce unnecessary background pressure

1. `Verified from repo` -> `Inference / recommendation`: raise the admin runtime snapshot interval from the current 5 seconds, or make it on-demand / event-driven.
2. `Inference / recommendation`: keep AI provider health polling separate from DB-heavy admin runtime polling.
3. `Verified from official docs` -> `Inference / recommendation`: move genuinely asynchronous work to a dedicated worker lane instead of keeping it inside the request-serving backend process.

### Phase 5: Separate environments properly

1. `Verified from official docs` -> `Inference / recommendation`: split Supabase into clear development, staging, and production environments, or use branching for staging/preview.
2. `Inference / recommendation`: keep Render backend and AI provider env groups separate per environment.
3. `Verified from official docs` -> `Inference / recommendation`: if admin is built on Vercel, use custom environments and branch tracking for preview/staging instead of pointing every branch at production resources.

### Phase 6: Design the future admin correctly

1. `Inference / recommendation`: admin on Vercel should not expose direct privileged DB access from the browser.
2. `Inference / recommendation`: preferred path is:
   - browser admin UI on Vercel
   - privileged admin API on backend
   - backend talks to Supabase/Postgres with controlled pooled connections
3. `Verified from official docs` -> `Inference / recommendation`: if any Vercel server-side functions talk to Postgres directly, use pooled URLs and `attachDatabasePool()`.

## 8. Execution Order

Recommended order of implementation:

1. Rotate leaked DB credentials and remove them from repo
2. Align `render.yaml` with Brevo env names
3. Fix Google env on backend and mobile, then rebuild mobile
4. Move reset codes from `IMemoryCache` to shared persistence
5. Standardize DB connection strings and remove `Pooling=false`
6. Reduce or redesign 5-second admin runtime polling
7. Split environments for dev/staging/prod
8. Build admin as a separate frontend, not as a direct DB client

## 9. Bottom Line

- `Verified from live API / live mailbox`: forgot-password and production email sending are working now.
- `Verified from live API / live mailbox`: Google sign-in is not working now because both mobile and backend config are incomplete.
- `Verified from repo`: the current backend is functional but not yet architected safely for restart-heavy or multi-instance auth flows.
- `Inference / recommendation`: if two devs can already interfere with each other on shared infrastructure, that is an early warning. The correct response is not to fear concurrency; it is to fix environment isolation, connection strategy, background workload placement, and shared-state design before scale exposes them harder.
