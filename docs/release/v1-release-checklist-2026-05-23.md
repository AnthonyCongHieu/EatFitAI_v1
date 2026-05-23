# EatFitAI v1 Public APK Release Checklist - 2026-05-23

This file is the resume-safe source of truth for the v1 release run.
Update it after every gate, deploy, build, install, evidence capture, and video step.

## 0. Release Target

| Item | Value | Status |
| --- | --- | --- |
| Release type | Public APK v1 | LOCKED |
| Release source branch | `codex/admin-control-plane-v1` | VERIFIED |
| Release source SHA | Started at `e97f57ba459562e47f1d0849a143f401f6e4a8f0`; gate fixes are pending commit before deploy | UPDATED |
| Repo root | `E:\tool edit\eatfitai_v1` | VERIFIED |
| API base URL | `https://eatfitai-api.duckdns.org` | VERIFIED |
| AI provider URL | `https://eatfitai-ai.duckdns.org` | VERIFIED |
| Android device | `a12c6888629b`, model `2201116SG`, Android 13 | VERIFIED |
| Android package | `com.eatfitai.app` | LOCKED |
| App version | `versionName=1.0.0`, `versionCode=1` | LOCKED |
| SSH key | `$HOME\.ssh\eatfitai_lightsail_ap_southeast_1.pem` | VERIFIED |
| Video style | Hybrid 60-75s, real app footage, Vietnamese text overlay, background music only | LOCKED |

## 1. Current Production Snapshot

Captured before any deploy/build/install.

| Target | Host | Current SHA | Branch | Service | Restarts | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Backend API | `ubuntu@18.141.119.165` | `219ac572882217e89778eb7bb576b18c8e81f044` | `codex/admin-control-plane-v1` | `eatfitai-backend` | `0` | DEPLOY REQUIRED |
| AI provider | `ubuntu@3.0.208.56` | `7eb07fb8cb4dec481b235a10e22f3413693b881d` | `codex/admin-control-plane-v1` | `eatfitai-ai` | `0` | DEPLOY REQUIRED |

Health snapshot:

| Endpoint | Expected | Observed | Status |
| --- | --- | --- | --- |
| `/health/live` | 200 alive | 200 alive | PASS |
| `/health/ready` | 200 ready with Postgres ready | 200 ready | PASS |
| AI `/healthz` | 200 ok | 200 ok | PASS |
| AI `/healthz/gemini` | 200 ok | `gemini_usage_state_store=file` | P0 VERIFY |

P0 infra item:

- [ ] Decide from gate evidence whether `GEMINI_USAGE_STATE_STORE=file` is acceptable for public v1.
- [ ] If public v1 requires Postgres quota state, only change provider env when `GEMINI_USAGE_STATE_DATABASE_URL` is present and verified.
- [ ] If Postgres quota state is required but unavailable, mark release BLOCKED.

## 2. Required Environment

Set these before code, cloud, Android, and evidence gates:

```powershell
$env:ANDROID_SERIAL = "a12c6888629b"
$env:EATFITAI_ANDROID_TARGET = "real-device"
$env:EATFITAI_SMOKE_BACKEND_URL = "https://eatfitai-api.duckdns.org"
$env:EATFITAI_SMOKE_AI_PROVIDER_URL = "https://eatfitai-ai.duckdns.org"
$env:EATFITAI_RELEASE_GATE_DISPOSABLE_AUTH = "1"
$env:EATFITAI_REQUIRE_RELEASE_LIKE_BUILD = "1"
```

Production smoke credentials and any mail/test user secrets must come from existing local/CI secret sources only.
Do not write secrets into this file.

## 3. Gate Status Board

| Gate | Command or action | Status | Evidence |
| --- | --- | --- | --- |
| Freeze checklist | Create this file before deploy/build/install | PASS | `docs/release/v1-release-checklist-2026-05-23.md` |
| Git baseline | `git status --short --branch`, `git rev-parse HEAD` | PASS | Clean branch at `e97f57ba` |
| Device baseline | `adb devices -l` | PASS | `a12c6888629b device` |
| Encoding gate | UTF-8/mojibake scan | PASS | `python scripts\cloud\check_mojibake.py` |
| Secret guard | Secret/public health redaction checks | PASS | `python scripts\cloud\check_secret_tracking.py`; media egress guard PASS |
| Mobile code gate | typecheck, lint, Jest | PASS | `_logs\public-release-qa\2026-05-23T03-32-47-518Z\public-release-qa-report.json` |
| Backend code gate | `.NET` tests | PASS | 400 passed in code gate |
| AI provider gate | pytest and import checks | PASS | 268 passed, 15 skipped in code gate |
| Cloud smoke gate | production smoke with disposable cleanup | PENDING | TBD |
| API coverage gate | controller/API matrix vs tests/smoke | PENDING | TBD |
| Infra deploy | AI host then backend host, keep split topology | PENDING | TBD |
| Post-deploy health | public and private health/status checks | PENDING | TBD |
| APK build | release-like preview APK from `e97f57ba` | PENDING | TBD |
| Clean install | uninstall old APK, install new APK on real device | PENDING | TBD |
| RC proof | real-device P0 proof | PENDING | TBD |
| Full app P0 | `device:apk-e2e-suite:run -- --only P0 --record` | PENDING | TBD |
| Visual audit | real-device videos/screenshots/logcat/perf | PENDING | TBD |
| Video source capture | real app clips/screenshots only | PENDING | TBD |
| Remotion edit/render | 60-75s final product video | PENDING | TBD |
| Final release decision | PASS, BLOCKED, or DEFER | PENDING | TBD |

Gate fix log:

| Issue | Root cause | Minimal fix | Verification |
| --- | --- | --- | --- |
| `mochiTutorial.test.ts` typecheck failed | Test wrapper passed children via `React.createElement` in a way TypeScript rejected for required children | Added a test-local provider type with optional children | `npm --prefix .\eatfitai-mobile run typecheck` PASS |
| Mobile lint warnings failed max-warnings gate | Several stale unused imports/constants and formatting warnings were present | ESLint autofix plus targeted cleanup of unused code and no-shadow variable | `npm --prefix .\eatfitai-mobile run lint` PASS |
| AI availability unit test failed | Test expectations used stale copy while source returned current Vietnamese copy | Updated test expectations to match source | Focused Jest PASS, full mobile Jest PASS |
| AI provider recipe prompt test failed | Prompt required seasoning quantities but missed exact phrase `định lượng gia vị` | Updated prompt wording without changing JSON schema | `python -m pytest -q ai-provider` PASS |
| Cloud script tests failed | Duplicate stale test definitions overrode the current catalog expectations | Removed duplicate stale test block | `python -m pytest -q scripts\cloud` PASS |
| Mojibake guard failed | Intentional legacy mojibake replacement literal was present in source | Replaced literal with Unicode escape preserving behavior | `python scripts\cloud\check_mojibake.py` PASS |

## 4. Baseline Commands

Run from repo root unless noted.

```powershell
git status --short --branch
git rev-parse HEAD
adb devices -l
```

Code and release gates:

```powershell
npm --prefix .\eatfitai-mobile run qa:public-release:code
npm --prefix .\eatfitai-mobile run qa:public-release:cloud
npm --prefix .\eatfitai-mobile run qa:public-release:plan
```

If the aggregate scripts fail, run the underlying focused commands and record exact failures before fixing:

```powershell
npm --prefix .\eatfitai-mobile run typecheck
npm --prefix .\eatfitai-mobile run lint
npm --prefix .\eatfitai-mobile test -- --runInBand
dotnet test .\eatfitai-backend\EatFitAI.sln --configuration Release --no-restore
python -m pytest .\ai-provider
python .\scripts\cloud\check_mojibake.py
```

## 5. Deployment Plan

Do not run `infra/lightsail/deploy-native-single-instance.sh` as-is.
Production is currently split across two hosts.

### 5.1 AI Provider Host

Target: `ubuntu@3.0.208.56`

Required actions:

- [ ] SSH with `$HOME\.ssh\eatfitai_lightsail_ap_southeast_1.pem`.
- [ ] Back up relevant env/service files before changes.
- [ ] `git fetch origin codex/admin-control-plane-v1`.
- [ ] Reset `/opt/eatfitai/repo` to `e97f57ba459562e47f1d0849a143f401f6e4a8f0`.
- [ ] Install/update Python dependencies in the existing service venv.
- [ ] Restart `eatfitai-ai`.
- [ ] Verify `systemctl is-active eatfitai-ai`.
- [ ] Verify `systemctl show eatfitai-ai -p NRestarts --value`.
- [ ] Verify private/local health if available.
- [ ] Verify public `https://eatfitai-ai.duckdns.org/healthz`.
- [ ] Verify public `https://eatfitai-ai.duckdns.org/healthz/gemini`.
- [ ] Record `GEMINI_USAGE_STATE_STORE` result and release decision.

### 5.2 Backend API Host

Target: `ubuntu@18.141.119.165`

Required actions:

- [ ] SSH with `$HOME\.ssh\eatfitai_lightsail_ap_southeast_1.pem`.
- [ ] Back up relevant env/service files before changes.
- [ ] `git fetch origin codex/admin-control-plane-v1`.
- [ ] Reset `/opt/eatfitai/repo` to `e97f57ba459562e47f1d0849a143f401f6e4a8f0`.
- [ ] Publish `eatfitai-backend` in Release mode to the existing production publish path.
- [ ] Keep backend AI provider URL private: `http://172.26.11.92:5050`.
- [ ] Keep R2 media public base URL.
- [ ] Ensure startup schema bootstrap is disabled, or run only an explicit one-shot bootstrap with evidence.
- [ ] Restart `eatfitai-backend`.
- [ ] Verify `systemctl is-active eatfitai-backend`.
- [ ] Verify `systemctl show eatfitai-backend -p NRestarts --value`.
- [ ] Verify `https://eatfitai-api.duckdns.org/health/live`.
- [ ] Verify `https://eatfitai-api.duckdns.org/health/ready`.
- [ ] Verify backend AI status/discovery endpoint without leaking secrets.

## 6. API Coverage Matrix

Every row must be PASS, NOT PUBLIC V1, or BLOCKED before public release.

| Area | Examples | Required coverage | Status |
| --- | --- | --- | --- |
| Auth | email login/register/verify/reset, Google auth | Unit/integration plus production disposable smoke | PENDING |
| User/profile | profile, preferences, body metrics, goals | API read/write/readback | PENDING |
| Meal diary | diary CRUD, readback, date handling | API and real-device flow | PENDING |
| Food | search/detail/custom dishes/recent/common meals | API and real-device flow | PENDING |
| Favorites/user foods | favorites, user food items | API read/write/readback | PENDING |
| Water intake | CRUD/readback | API smoke | PENDING |
| Summary/analytics | daily/weekly/monthly summaries | API smoke and app stats tab | PENDING |
| Nutrition loop | insights/settings/recommendations | API smoke and app flow | PENDING |
| AI vision/nutrition | scan, review, save, quota/status | API smoke and app scan flow | PENDING |
| AI recipes/labels/corrections | recipe suggestions/details, label/correction APIs | API smoke or explicit NOT PUBLIC V1 | PENDING |
| Voice | parse/transcribe/process/review/execute/confirm weight | API smoke and app voice flow | PENDING |
| Storage/media | presign/verify, private URL rejection | API smoke/security check | PENDING |
| Notifications | push registration/settings/list | API smoke and app settings flow | PENDING |
| Subscription | subscription state/endpoints | API smoke or NOT PUBLIC V1 | PENDING |
| Support feedback | submit/list/admin visibility | API smoke | PENDING |
| Mobile config | config/version/discovery | API smoke and app launch | PENDING |
| Telemetry | accepted/rejected event contract | API smoke | PENDING |
| Health/discovery | live/ready/status | public GET smoke | PASS PARTIAL |
| Admin/control plane | authz, read-only overview, runtime, quota, audit, master data | admin authz/read-only smoke; mutating only with disposable data | PENDING |
| Internal Gemini | internal-only routes | authorization/security rejection checks | PENDING |

## 7. Android Build, Install, and Evidence

Build only after deploy and cloud gates pass.

```powershell
$env:ANDROID_SERIAL = "a12c6888629b"
$env:EATFITAI_ANDROID_TARGET = "real-device"
$env:EATFITAI_REQUIRE_RELEASE_LIKE_BUILD = "1"
npm --prefix .\eatfitai-mobile run release:gate -- android
```

Clean install because the release request explicitly requires removing the previous APK:

```powershell
adb -s a12c6888629b uninstall com.eatfitai.app
npm --prefix .\eatfitai-mobile run install:android:preview
adb -s a12c6888629b shell dumpsys package com.eatfitai.app
adb -s a12c6888629b shell monkey -p com.eatfitai.app -c android.intent.category.LAUNCHER 1
```

Required Android gates:

```powershell
npm --prefix .\eatfitai-mobile run device:rc-proof:android
npm --prefix .\eatfitai-mobile run device:apk-e2e-suite:prepare
npm --prefix .\eatfitai-mobile run device:apk-e2e-suite:run -- --only P0 --record
npm --prefix .\eatfitai-mobile run device:visual-ui-audit:android
```

Evidence folders:

- `_logs\public-release-qa\`
- `_logs\real-device-adb\`
- `_logs\apk-e2e-full\`
- `_logs\production-smoke\`

## 8. Product Video Storyboard

Use only the final APK installed on the real phone.
If a core flow cannot be captured from the real app, mark the video BLOCKED instead of faking footage.

| Time | Scene | Source asset | Text overlay | Status |
| --- | --- | --- | --- | --- |
| 0-6s | Problem hook and product identity | Real launch/home clip or screenshot | `Theo dõi dinh dưỡng không cần nhập liệu rườm rà.` | PENDING |
| 6-16s | Today dashboard | Home clip | `Mục tiêu hôm nay rõ ràng.` | PENDING |
| 16-28s | Diary/search/save/readback | Diary clip | `Tìm món, lưu bữa ăn, đọc lại kết quả.` | PENDING |
| 28-43s | AI scan/review/save | Scan clip | `Quét AI: ảnh món ăn -> gợi ý -> xác nhận.` | PENDING |
| 43-55s | Voice/text quick add | Voice clip | `Ghi nhanh bằng giọng nói hoặc câu lệnh.` | PENDING |
| 55-66s | Stats/profile/progress | Stats/profile clip | `Thống kê giúp điều chỉnh an toàn.` | PENDING |
| 66-75s | Trust/release close | Evidence or polished app montage | `EatFitAI v1 - kiểm thử trên máy thật.` | PENDING |

Remotion tasks:

- [ ] Copy approved raw captures to `eatfitai-product-video\public\captures\`.
- [ ] Update composition duration to 60-75 seconds.
- [ ] Use real `Video`/`Img` assets inside phone-style frames.
- [ ] Keep Vietnamese text overlays readable on 1920x1080.
- [ ] Generate background music at matching duration.
- [ ] Render `eatfitai-product-video\out\eatfitai-v1-product-intro.mp4`.
- [ ] Review final video for private information before sharing.

## 9. Failure Policy

- Any P0/P1 test, deploy, health, install, or encoding failure stops the release.
- Apply the smallest safe fix.
- Record root cause, minimal fix, regression risk, and verification.
- Redeploy affected host if backend/AI code or production config changed.
- Rebuild and reinstall APK after any mobile or environment fix affecting runtime behavior.
- Rerun failed gate plus adjacent flows before continuing.

## 10. Final Decision Template

Fill this before declaring release readiness.

| Decision item | Result |
| --- | --- |
| Code gates | TBD |
| Infra deploy | TBD |
| Cloud/API smoke | TBD |
| API coverage matrix | TBD |
| APK build/install | TBD |
| Real-device P0 | TBD |
| Visual/performance evidence | TBD |
| Product video | TBD |
| Known deferred items | TBD |
| Final release decision | TBD |
