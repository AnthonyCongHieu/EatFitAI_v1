# EatFitAI v1 Public APK Release Checklist - 2026-05-23

Last updated: 2026-05-23 15:15 ICT.

This file is the resume-safe source of truth for the v1 public APK run.

## 1. Release State

| Item | Value | Status |
| --- | --- | --- |
| Release type | Public APK v1 | LOCKED |
| Initial requested source | `e97f57ba459562e47f1d0849a143f401f6e4a8f0` | RECORDED |
| Deployed/runtime candidate SHA | `d367ac679671a91657ab7cce25ad2201ee11ce6d` | DEPLOYED |
| Current local HEAD | Latest pushed evidence commit; verify with `git rev-parse HEAD` after resume | VERIFIED |
| Current origin SHA | Latest pushed `origin/codex/admin-control-plane-v1`; verify with `git rev-parse origin/codex/admin-control-plane-v1` after resume | VERIFIED |
| Current worktree | Clean except ignored/generated local artifacts | VERIFIED |
| Repo root | `E:\tool edit\eatfitai_v1` | VERIFIED |
| API base URL | `https://eatfitai-api.duckdns.org` | VERIFIED |
| AI provider URL | `https://eatfitai-ai.duckdns.org` | VERIFIED |
| Android target | `a12c6888629b`, `2201116SG`, Android 13 | VERIFIED EARLIER; CURRENTLY OFFLINE |
| Android package | `com.eatfitai.app` | VERIFIED |
| APK version | `versionName=1.0.0`, `versionCode=1` | VERIFIED |
| SSH key | `$HOME\.ssh\eatfitai_lightsail_ap_southeast_1.pem` | VERIFIED |
| Final release decision | Blocked until final device rerun and strict video source policy are satisfied | BLOCKED |

## 2. Production Deploy

Production is split across two hosts. The single-instance deploy script was not used.

| Target | Host | Before SHA | Deployed SHA | Service | Status |
| --- | --- | --- | --- | --- | --- |
| Backend API | `ubuntu@18.141.119.165` | `219ac572882217e89778eb7bb576b18c8e81f044` | `d367ac679671a91657ab7cce25ad2201ee11ce6d` | `eatfitai-backend` | PASS |
| AI provider | `ubuntu@3.0.208.56` | `7eb07fb8cb4dec481b235a10e22f3413693b881d` | `d367ac679671a91657ab7cce25ad2201ee11ce6d` | `eatfitai-ai` | PASS |

Post-deploy health, rechecked 2026-05-23 15:14 ICT:

| Endpoint | Result |
| --- | --- |
| `https://eatfitai-api.duckdns.org/health/live` | 200 |
| `https://eatfitai-api.duckdns.org/health/ready` | 200 |
| `https://eatfitai-ai.duckdns.org/healthz` | 200 |
| `https://eatfitai-ai.duckdns.org/healthz/gemini` | 200 |

Infra config checks:

| Item | Result | Notes |
| --- | --- | --- |
| Backend private AI provider URL | PASS | Kept on private host URL `http://172.26.11.92:5050`. |
| R2 public media base URL | PASS | Configured and media egress guard passed. |
| Health response redaction | PASS | No private AI URL or raw secrets exposed by public health. |
| Schema bootstrap | PASS | Disabled by config. |
| AI quota state store | RISK | `GEMINI_USAGE_STATE_STORE=file`; no `GEMINI_USAGE_STATE_DATABASE_URL` was available. If policy requires Postgres quota state, public release remains blocked. |

## 3. Code, Cloud, and API Gates

| Gate | Result | Evidence |
| --- | --- | --- |
| UTF-8/mojibake guard | PASS | `python scripts\cloud\check_mojibake.py` inside code gate |
| Secret guard | PASS | `python scripts\cloud\check_secret_tracking.py`; media egress guard PASS |
| Mobile typecheck/lint/Jest | PASS | `_logs\public-release-qa\2026-05-23T03-32-47-518Z\public-release-qa-report.json` |
| Backend `.NET` tests | PASS | 400 tests passed in code gate |
| AI provider pytest | PASS | 268 passed, 15 skipped in code gate |
| Cloud/API smoke | PASS | `_logs\public-release-qa\2026-05-23T04-41-49-561Z\public-release-qa-report.json` |
| Disposable cleanup | PASS | Included in cloud gate |
| API coverage inventory | PASS WITH MANUAL GAPS | Cloud gate covered public API families; Google login, camera/barcode edges, recipe detail, notification settings, and admin-only paths remain manual/recorded gaps. |

Cloud/API coverage included auth, profile, diary, food search/detail/custom/recent/favorites, water, summary, analytics, nutrition loop, AI status/quota/vision/nutrition/recipes/labels, voice parse/process/execute, storage/media, notifications, subscription, support feedback, mobile config, telemetry, health/discovery, and admin/control-plane authz/read-only checks.

## 4. APK Build and Install

| Item | Result |
| --- | --- |
| Android release gate report | `_logs\public-release-qa\2026-05-23T04-49-14-933Z\public-release-qa-report.json` |
| Nested Android gate report | `_logs\public-release-qa\2026-05-23T04-49-14-933Z\production-smoke\release-gate-report.json` |
| APK artifact | `eatfitai-mobile\android\app\build\outputs\apk\release\app-release.apk` |
| APK SHA256 | `B6C6CA530F51EE154A2EEFCE4D3C31978295B62E7590A08082B0585587C43F2F` |
| APK size | `160385277` bytes |
| Clean install | PASS |
| Package id | `com.eatfitai.app` |
| Version | `versionName=1.0.0`, `versionCode=1` |
| Build flags | Non-debuggable; package flags did not include `DEBUGGABLE` |
| Launch smoke | PASS; app launched and crash buffer was empty |

## 5. Real-Device Evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Demo seed account | PASS | `_logs\device-release-session\2026-05-23T05-41-54Z-seed\demo-seed.json` |
| Disposable demo cleanup | PASS | Temporary production account deleted after device/video block; local DPAPI credential file removed |
| RC proof | PASS | `_logs\real-device-adb\2026-05-23T06-16-58-528Z-rc-proof\report.json` |
| Focused food search/readback after fix | PASS DEGRADED | `_logs\real-device-adb\2026-05-23T06-11-43-011Z-food-search-ui-readback\report.json` |
| Latest full automated P0 suite | FAIL | `_logs\apk-e2e-full\2026-05-23T07-22-27-180Z\suite-summary.json` |
| Latest P0 summary | 108 total, 11 pass, 1 fail, 96 not run | Failure: `DIARY-01-open-diary-by-tab` |
| Latest P0 failure root cause | API readback login returned transport error `fetch failed`; UI reached Diary and marker checks passed | Runner false-negative suspected |
| Device state after runner fixes | BLOCKED | `adb devices -l` currently returns no devices |
| Visual audit | PARTIAL | Visual core screenshots exist; official visual audit rerun after recorder fix is blocked by missing ADB device |
| Screenrecord clips | BLOCKED | Existing `screenrecord*.mp4` files from latest run are 0 bytes; harness now sends SIGINT before pull but needs device reconnect to verify |

Required before final public release:

1. Reconnect/unlock `a12c6888629b` and confirm `adb devices -l`.
2. Rerun `device:apk-e2e-suite:run -- --id DIARY-01 --record`.
3. Rerun `device:apk-e2e-suite:run -- --only P0 --record` if DIARY-01 passes.
4. Rerun `device:visual-ui-audit:android`.
5. Confirm new MP4 evidence is non-zero and review for private information.

## 6. Fix Log

| Issue | Root cause | Minimal fix | Verification |
| --- | --- | --- | --- |
| Mobile type/lint/Jest release gates failed | Stale test helpers, unused imports, stale copy expectations | Targeted test/source cleanup only | Full code gate PASS |
| AI provider prompt test failed | Prompt missed required Vietnamese phrase | Updated prompt wording, no API schema change | AI pytest PASS |
| Cloud script tests failed | Duplicate stale test definitions | Removed duplicate stale test block | `scripts\cloud` pytest PASS |
| Mojibake guard failed | Intentional legacy mojibake literal in source | Replaced literal with Unicode escape | Mojibake guard PASS |
| Production drift | Backend and AI hosts were behind requested release source | Deployed split hosts to `d367ac67` | Public health PASS |
| Device auth rate-limit pressure | P0 suite submits repeated auth flows against 10/min auth policy | Added `device-flow-pacing` budget/wait helper | `deviceFlowPacing`, `apkE2eSuite`, `deviceAutomationMarkers` tests PASS |
| DIARY-02 food search false-negative | UI opened Food Detail; runner expected only search list, and backend write used invalid `sourceMethod` | Added Food Detail submit fallback and allowed source method mapping | Focused food-search readback PASS DEGRADED |
| DIARY-01 API readback transport false-negative | API login got `fetch failed` after UI success | Added login-only retry on transport failures | Unit/static tests PASS; device rerun blocked by missing ADB |
| Screenrecord evidence was empty | Host killed `adb shell screenrecord` before Android finalized MP4 | Signal device `screenrecord` with SIGINT before pull and fail 0-byte evidence | Unit/static tests PASS; device rerun blocked by missing ADB |

Verification after harness fixes:

```powershell
node --check .\eatfitai-mobile\scripts\real-device-adb-flow.js
node --check .\eatfitai-mobile\scripts\apk-e2e-suite.js
npm --prefix .\eatfitai-mobile test -- --runInBand __tests__/deviceAutomationMarkers.test.js __tests__/deviceFlowPacing.test.js __tests__/apkE2eSuite.test.js
git diff --check
```

Result: 16 Jest tests passed; syntax checks passed; `git diff --check` passed.

## 7. Product Video

Target: 60-75s hybrid promo, Vietnamese overlays, background music only, inspired by mobile app/UI promo motion graphics references.

| Item | Result |
| --- | --- |
| Remotion project | `eatfitai-product-video` |
| Real app screenshots copied to | `eatfitai-product-video\public\v1-real-app\` |
| Composition duration | 72 seconds |
| Render output | `eatfitai-product-video\out\eatfitai-v1-product-intro.mp4` |
| Video metadata | 1920x1080, 30fps, 72.000s |
| Output size | `41423449` bytes |
| Render command | `npm run render` |
| Video lint/typecheck | `npm run lint` PASS |
| Source policy | DRAFT ONLY | Uses screenshots from final installed APK; non-zero real screenrecord clips are still blocked |

Storyboard implemented:

| Time | Scene | Source |
| --- | --- | --- |
| 0-6s | Problem hook/product identity | Launch screenshot |
| 6-16s | Daily dashboard | Home dashboard screenshot |
| 16-28s | Diary/search/save | Food detail and diary readback screenshots |
| 28-43s | AI quick-add | MoChi quick action screenshot; actual scan review/save clip still missing |
| 43-55s | Voice/text quick add | MoChi quick action and diary screenshot |
| 55-66s | Stats/profile | Stats and profile screenshots |
| 66-72s | v1 readiness close | Device/APK proof screenshot and release facts |

Strict video acceptance remains BLOCKED until at least one non-zero real phone clip captures launch/home, diary, scan/review/save, voice/text, stats/profile, and release proof from the final installed APK.

## 8. Final Decision

| Decision item | Result |
| --- | --- |
| Code gates | PASS |
| Infra deploy | PASS |
| Cloud/API smoke | PASS |
| APK build/install | PASS |
| RC proof | PASS |
| Full real-device P0 | BLOCKED: latest suite has 1 fail; rerun blocked by ADB disconnect |
| Visual/performance evidence | BLOCKED: official rerun blocked by ADB disconnect |
| Product video | DRAFT RENDERED; final blocked by missing non-zero real phone clips |
| Known deferred/manual gaps | Google login, camera permission, barcode/scan edges, recipe detail, notification settings, admin-only paths |
| Infra risk | `GEMINI_USAGE_STATE_STORE=file` must be accepted or replaced with verified Postgres quota state |
| Final public release decision | BLOCKED |
