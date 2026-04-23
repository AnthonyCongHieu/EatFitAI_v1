# Testing and Release

Updated: `2026-04-23`

## Overview

This document consolidates the testing and release processes for EatFitAI:

- Product-grade testing gate
- Real device operation runbook
- Production smoke via cloud
- Automation framework (Appium primary, Maestro legacy)
- Keep-alive strategy for Render Free Tier

---

## Testing Gate

### Gate 0 — Environment

```powershell
npm --prefix .\eatfitai-mobile install
npm --prefix .\tools\appium install
npm --prefix .\eatfitai-mobile run automation:doctor
```

Notes:
- If the app on an Android device is built as `DEBUGGABLE`, `automation:doctor` must see Metro listening on `http://127.0.0.1:8081`
- For Android release gate, the build must be `release-like` and not `DEBUGGABLE`

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

The default Android lane for the release gate is currently **Appium-only** (WebDriverIO + UiAutomator2).

Main framework: `tools/appium/`
- `sanity.android.js` — Basic smoke/sanity test
- `cloud-proof.android.js` — Evidence capture for cloud verification
- `lib/common.js` (755 lines) — Helpers: element fallbacks, ADB fallback, gesture, screenshot, logcat

The `appium:edge:android` and `cloud-proof:android` flows are still useful for deep debug/evidence, but are no longer on the critical path of Gate 2.

### Gate 3 — Real device certification

The evidence bundle in `_logs/production-smoke/<timestamp>` must contain:

- `preflight-results.json`
- `request-budget.json`
- `session-observations.json`
- `regression-run.json`
- `metrics-baseline.json`
- Screenshots and logcat according to the checklist

Minimum passing conditions in `session-observations.json`:

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

A combined gate command:

```powershell
npm --prefix .\eatfitai-mobile run release:gate
```

Or run each gate individually:

```powershell
node .\eatfitai-mobile\scripts\product-release-gate.js environment
node .\eatfitai-mobile\scripts\product-release-gate.js code
node .\eatfitai-mobile\scripts\product-release-gate.js android
node .\eatfitai-mobile\scripts\product-release-gate.js device
node .\eatfitai-mobile\scripts\product-release-gate.js cloud
```

---

## Legacy Maestro Suites

| Suite | Command | Notes |
|---|---|---|
| Comprehensive | `maestro:hero:android` | Run all |
| Full Auth | `maestro:auth-full:android` | Clear app data first |
| Onboarding | `maestro:onboarding:android` | Clear app data first |
| Manual Diary | `maestro:manual-diary:android` | Uses authenticated lane |
| AI scan save | `maestro:ai-scan-save:android` | Contract lane for scan entry screen |
| Nutrition | `maestro:nutrition:android` | Uses authenticated lane |
| Voice text | `maestro:voice-text:android` | Uses authenticated lane |
| Profile & Stats | `maestro:profile-stats:android` | Uses authenticated lane |

Notes:
- **This is a legacy/manual lane**, no longer an official Android release gate (since 2026-04-23)
- Replacement framework: Appium (WebDriverIO + UiAutomator2) — see Gate 2
- Reason for migration: Appium is stronger than Maestro in fallback cascades (element click → mobile gesture → pointer actions → adb tap), integrated artifacts (screenshot + page source + logcat), and handling stale elements
- For real Android devices, the device must be unlocked and developer options must allow installing helper APKs via USB/ADB
- Debug build + Metro is only for debugging, not eligible to pass Android release gate

---

## Real Device Runbook

### Preparation

1. Plug in real Android device via USB
2. Enable `USB debugging`
3. Ensure computer and phone are on the same LAN if using Metro via `--host lan`
4. Use Node `20.x`

Check:

```powershell
adb devices -l
```

### Start local backend

The backend auth flow does not require AI provider to test login/forgot/reset.

```powershell
Invoke-WebRequest http://127.0.0.1:5247/health -UseBasicParsing
```

### Start Metro for real device

```powershell
cd .\eatfitai-mobile
npm run dev:device -- --clear --port 8081
```

Reverse port:

```powershell
adb reverse tcp:8081 tcp:8081
```

### Launch app

```powershell
adb shell am start -S -W -n com.eatfitai.app/.MainActivity
```

### Mandatory rules after each restart

1. Cold-launch app
2. Check state immediately after restart
3. If seeing the `Open debugger to view warnings.` warning → click `x` first
4. Continue to intro/welcome/login only after the warning disappears

### UI Debugging Principles

1. Prioritize Appium `getPageSource()` + screenshots
2. Do not trust `adb uiautomator dump` on Xiaomi/MIUI devices
3. If needing to attach to an already open app, use WebdriverIO `remote()` with `appium:autoLaunch=false` and `appium:noReset=true`
4. If `UiAutomator2` crashes → use `adb logcat -d` and `adb shell dumpsys` to confirm actual flow

---

## Production Smoke via Cloud

### Execution rules

1. Do not modify `.env.development` to change default lanes
2. Only use the dedicated lane `start-mobile-cloud-smoke.ps1` for production smoke
3. Each run must use 1 newly created disposable account

### Launch session

```powershell
powershell -ExecutionPolicy Bypass -File .\start-mobile-cloud-smoke.ps1
```

### Official health contract

- Backend: `GET /health/live = 200`, `GET /health/ready = 200`
- AI provider: `GET /healthz = 200`

### Default request budget

| Endpoint | Limit |
|---|---:|
| Health per endpoint | 2 |
| Register with verification | 1 |
| Resend verification | 1 |
| Verify email | 2 |
| Login | 1 |
| Refresh | 1 |
| AI status | 1 |
| Vision detect | 8 |
| Meal diary write | 3 |

### Minimum passing conditions

- Public health points all return `200`
- Register does not hang
- Temp-Mail receives the code within the waiting window
- Verification succeeds and proceeds to onboarding
- Onboarding yields a `result card`
- Reopening the app goes straight to `home-screen`
- Login and refresh succeed
- At least 1 primary fixture completes the `gallery → result → AddMealFromVision → diary` flow

### Immediate failure conditions

- Register hangs for too long
- Mail does not arrive after waiting window expires and resend was followed correctly
- Onboarding only yields an `error card`
- AI scan hangs, drops out of flow, or shows clear network failure
- Exceeds request budget

---

## Secret contract

Required:

- `RENDER_API_KEY`
- `EATFITAI_DEMO_EMAIL` / `EATFITAI_DEMO_PASSWORD`
- `EATFITAI_SMOKE_EMAIL` / `EATFITAI_SMOKE_PASSWORD`

Conventions:

- `RENDER_API_KEY` is read from shell env or Windows user env
- Do not write keys to repo, tracked `.env`, markdown, JSON, or screenshots

---

## Current cloud status

- `eatfitai-backend`: service id `srv-d7arf2svjg8s73em138g`, branch `hieu_deploy/production`, auto deploy `yes`
- `eatfitai-ai-provider`: service id `srv-d7arf2kvjg8s73em1360`, branch `hieu_deploy/production`, auto deploy `yes`

Pushing branch `hieu_deploy/production` to `origin` will automatically trigger a cloud rollout for both services.

---

## Keep-alive strategy

### Problem

Render Free Tier spins down services after 15 minutes of no inbound traffic. Cold-start wake-up takes ~30-60 seconds.

### Options

| Option | Tool | Pros | Cons |
|---|---|---|---|
| **A. UptimeRobot** | [uptimerobot.com](https://uptimerobot.com) | Monitoring + Alert + Uptime report | Minimum interval is 5 minutes |
| **B. Cron-job** | [cron-job.org](https://cron-job.org) | Active ping, intervals from 1 minute | No uptime reporting |
| **C. Both (recommended)** | UptimeRobot + cron-job.org | Guaranteed keep-alive + monitoring | Requires accounts on both |

### Endpoints to ping

| Service | Endpoint | Interval |
|---|---|---|
| Backend | `https://<backend-url>/health/live` | 5 minutes |
| AI Provider | `https://<ai-provider-url>/healthz` | 5 minutes |

### Instance hours warning

Render Free provides 750 hours/month/workspace. Keep-alive **2 always-on services** = ~1440 hours → **EXCEEDS budget**.

Solution:
- Only keep-alive the **backend** (critical), let AI provider sleep + use fallback formula
- Or upgrade 1 service to Render Starter ($7/month)

Detailed guide: see Appendix A (UptimeRobot) and Appendix B (Cron-job) in `STABILIZATION_PLAN.md`.

---

## Recommended release order

1. Run Gate 0 and Gate 1
2. Run Gate 2 on Android automation
3. Run real-device lane and update evidence bundle
4. Run Gate 4 after Render rollout finishes
5. Consider the lane stable only when `smoke:rehearsal` confirms the last 3 sessions all pass

---

## Voice: source of truth

From `2026-04-16`, test lanes and release gates must adhere to current code:

- mobile → backend `/api/voice/transcribe`
- mobile → backend `/api/voice/parse`

Do not test according to old documentation describing mobile calling AI provider directly for voice parse/transcribe.
