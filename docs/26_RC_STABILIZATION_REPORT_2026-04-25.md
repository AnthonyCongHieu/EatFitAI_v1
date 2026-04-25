# RC Phase 2 Stabilization Report - 2026-04-25

Cập nhật: `2026-04-25T16:35:00+07:00`

Kết luận ngắn: **chưa đạt internal RC**. Code baseline hiện xanh, nhưng RC bị chặn bởi Android authenticated proof chưa vào Home, cloud release gate fail do Render latest deploy `build_failed`, và smoke seed/demo account fail `401 Email chưa được xác minh`.

## 1. Executive Status

| Lane | Status | Evidence |
|---|---|---|
| Code baseline | Pass | `npm --prefix .\eatfitai-mobile run release:gate -- code` pass, report `_logs/production-smoke/2026-04-25T09-33-11-148Z/release-gate-report.json`. |
| Android device readiness | Degraded pass | Device `a12c6888629b` online; doctor/probe pass degraded due UIAutomator warnings. |
| Android authenticated proof | Fail | `device:login-real:android` fail, report `_logs/real-device-adb/2026-04-25T09-26-43-338Z-login-real/report.json`; screenshot remains login screen. |
| Cloud/API RC gate | Fail | `release:gate -- cloud` fail at Render verify, report `_logs/production-smoke/2026-04-25T09-34-16-268Z/release-gate-report.json`. |
| API readback | Blocked | Seed/demo login fails `401 Email chưa được xác minh`; user/AI smoke cannot create authenticated readback. |
| AI benchmark | Done with concerns | Offline deterministic benchmark generated, but live AI/model validation not attempted. |
| UI backlog | Open | Auth/login and UIAutomator evidence issues are release-blocking for RC proof. |

Release recommendation: **Hold internal RC** until authenticated account/seed, Render latest deploy, and live readback evidence are fixed.

## 2. Implemented Changes

- Extended `eatfitai-mobile/scripts/real-device-adb-flow.js` with RC modes: `login-real`, `home-smoke`, `food-diary-readback`, `scan-save-readback`, `voice-text-readback`, `stats-profile-smoke`.
- Added safe credential resolution from `EATFITAI_DEVICE_LOGIN_*`, fallback `EATFITAI_SMOKE_*`, then `EATFITAI_DEMO_*`; report masks secrets and does not write passwords/tokens.
- Extended Android report fields: `status`, `criticalFailures`, `warnings`, `evidence`, `authenticated`, `flowAssertions`, `apiReadbacks`, `uiDefects`.
- Hardened Android proof semantics: critical Home/authenticated proof now requires UI markers and cannot pass only from foreground+screenshot.
- Refined logcat crash detection so AndroidRuntime noise from shell/UIAutomator does not falsely count as an EatFitAI app crash.
- Added `eatfitai-mobile/scripts/ai-benchmark.js`, `npm run benchmark:ai`, and `tools/fixtures/scan-demo/ai-benchmark-manifest.json`.
- Added official nutrition references to AI benchmark metadata: USDA FoodData Central API Guide and NIH ODS DRI references.
- Updated `product-release-gate.js` so cloud gate includes seed/auth/user/AI smoke and AI benchmark.
- Fixed `production-smoke-ai-api.js` so login/fatal errors make `passed: false` and Windows exits cleanly without native assertion noise.
- Fixed Jest open handle in `CommonMealTemplateScreen.test.tsx` by setting React Query `gcTime: Infinity` for the test client.

## 3. Code Gates

| Command | Result |
|---|---|
| `dotnet test .\EatFitAI_v1.sln --no-restore --nologo --verbosity minimal` | Pass: 170/170 backend tests. |
| `npm --prefix .\eatfitai-mobile run typecheck` | Pass. |
| `npm --prefix .\eatfitai-mobile run lint` | Pass, including direct AI provider guard. |
| `npm --prefix .\eatfitai-mobile test -- --runInBand --watch=false --no-cache --detectOpenHandles` | Pass: 28 suites, 104 tests; open-handle warning resolved. |
| `python -m pytest ai-provider\tests -q` | Pass: 37 passed, 2 skipped. |
| `python scripts\cloud\check_mojibake.py` | Pass: no mojibake markers. |
| `python scripts\cloud\check_secret_tracking.py` | Pass: no tracked secret files/local backend secrets. |
| `npm --prefix .\eatfitai-mobile run release:gate -- code` | Pass; artifact `_logs/production-smoke/2026-04-25T09-33-11-148Z/release-gate-report.json`. |

## 4. Android Evidence

| Command | Result | Artifact |
|---|---|---|
| `adb devices` | Pass: `a12c6888629b device`. | Terminal output. |
| `npm --prefix .\eatfitai-mobile run device:doctor:android` | Degraded pass; scrcpy/screenshot OK, UIAutomator warning. | `_logs/real-device-adb/2026-04-25T09-20-26-231Z-doctor/report.json`. |
| `npm --prefix .\eatfitai-mobile run device:probe:android` | Degraded pass after crash detector fix; no critical failures. | `_logs/real-device-adb/2026-04-25T09-21-55-212Z-probe/report.json`. |
| `npm --prefix .\eatfitai-mobile run device:login-real:android` | Fail; app foreground and screenshot captured, but Home markers unavailable and screenshot is still Login. | `_logs/real-device-adb/2026-04-25T09-26-43-338Z-login-real/report.json`. |
| `npm --prefix .\eatfitai-mobile run release:gate -- device` | Fail because latest device evidence is `login-real` fail. | `_logs/production-smoke/2026-04-25T09-34-09-081Z/release-gate-report.json`. |

Critical Android blocker:

- Screenshot `_logs/real-device-adb/2026-04-25T09-26-43-338Z-login-real/login-real-home-after-login.png` shows the Login screen after submit, not authenticated Home.
- `report.json` now correctly records `status: fail`, `authenticated: false`, and critical failure `login-real-home-after-login-bounded-screen-evidence failed`.
- Post-login flows were not run as RC proof because login/Home proof is not established. Running diary/scan/voice/stats readback after failed auth would create misleading evidence.

## 5. Cloud And API Evidence

| Command | Result | Artifact |
|---|---|---|
| `npm --prefix .\eatfitai-mobile run smoke:preflight` | Pass: backend ready, AI health reachable, auth enabled. | `_logs/production-smoke/2026-04-25T09-20-26-004Z/preflight-results.json`. |
| `npm --prefix .\eatfitai-mobile run smoke:seed:cloud` | Fail: `401 Email chưa được xác minh`. | Terminal output. |
| `npm --prefix .\eatfitai-mobile run smoke:auth:api` | Pass: disposable auth flow and cleanup pass. | `_logs/production-smoke/2026-04-25T09-20-26-004Z/auth-api-report.json`. |
| `npm --prefix .\eatfitai-mobile run smoke:user:api` | Fail: reset login `401 Email chưa được xác minh`. | `_logs/production-smoke/2026-04-25T09-30-18-040Z/user-api-report.json`. |
| `npm --prefix .\eatfitai-mobile run smoke:ai:api` | Fail: login `401`, report now correctly sets `passed: false`. | `_logs/production-smoke/2026-04-25T09-30-18-040Z/ai-api-report.json`. |
| `npm --prefix .\eatfitai-mobile run release:gate -- cloud` | Fail at Render verify. | `_logs/production-smoke/2026-04-25T09-34-16-268Z/release-gate-report.json`. |

Render blocker:

- `_logs/production-smoke/2026-04-25T09-34-16-268Z/render-verify.json` reports backend and AI provider latest deploy status `build_failed`.
- Expected commit was `112da721996c583485c5d11b9dfc649e69b5fd1b`; both services match the branch/commit but latest deploy did not build.
- Cloud preflight can still pass against the currently live deployment, but RC cannot pass while the latest intended deploy is failed.

## 6. AI Benchmark

Command: `npm --prefix .\eatfitai-mobile run benchmark:ai`

Latest artifact: `_logs/ai-benchmark/2026-04-25T09-32-15-325Z/ai-benchmark-report.json`

| Area | Result |
|---|---|
| Vision | Degraded: fixture manifest exists and deterministic expectations are recorded, but live model calls were not attempted. |
| Nutrition target | Static formula/reference checks present; FoodData-style reference comparison passes in offline mode. |
| Voice parsing | Degraded: corpus exists, but live parser/API execution is blocked by authenticated account failure. |
| Recipe/insight | Offline schema/safety checks only; no live LLM/API proof. |
| Latency | No network latency measured; `networkCallsAttempted: false`. |
| Recommendation | `DONE_WITH_CONCERNS`, hold live AI release gate. |

External references used for benchmark/QA:

- [USDA FoodData Central API Guide](https://fdc.nal.usda.gov/api-guide.html)
- [NIH ODS Nutrient Recommendations and Databases](https://ods.od.nih.gov/HealthInformation/nutrientrecommendations/)
- [Android UI Automator documentation](https://developer.android.com/training/testing/other-components/ui-automator)
- [Android Debug Bridge documentation](https://developer.android.com/tools/adb)

## 7. UI Backlog

| Severity | Area | Finding | Evidence |
|---|---|---|---|
| P0 | Auth/RC proof | Login submit does not reach authenticated Home for the smoke credential currently available to automation. This may be an account verification problem rather than a UI bug, but it blocks RC proof either way. | `login-real-home-after-login.png` under the `2026-04-25T09-26-43-338Z-login-real` artifact. |
| P1 | Android automation evidence | UIAutomator dump intermittently fails on the Xiaomi device; degraded screenshots/logcat are acceptable for non-critical probes but not for login/Home proof. | Doctor/probe/login-real reports listed above. |
| P1 | Cloud/deploy | Latest Render deploy for backend and AI provider is `build_failed`; live health alone is not enough for RC. | `render-verify.json`. |
| P1 | API readback | Seeded account/readback flows fail because the smoke/demo email is not verified. | `user-api-report.json`, `ai-api-report.json`. |
| P2 | Post-login UI | Home/diary/scan/voice/stats/profile visual QA remains unverified in Phase 2 because authenticated proof is blocked. | Not run as RC proof. |

## 8. Cleanup And Tooling Verification

- Active `package.json` no longer has Appium/Maestro/Detox npm scripts.
- `Test-Path .\tools\appium`, `Test-Path .\eatfitai-mobile\.maestro`, and `Test-Path .\eatfitai-mobile\scripts\run-maestro.js` all returned `False`.
- `git ls-files` still lists deleted Detox tracked files until the deletion is staged/committed: `eatfitai-mobile/detox.config.js` and `eatfitai-mobile/android/app/src/androidTest/java/com/eatfitai/app/DetoxTest.java`.
- Historical archive docs still mention Appium/Maestro/Detox by design; active execution path is ADB + UIAutomator best-effort + screenshots + logcat + scrcpy.
- `_logs/real-device-adb/2026-04-25T*` evidence was preserved.

## 9. Open Blockers Before Internal RC

1. Fix or provide a verified seed/demo account so `smoke:seed:cloud`, `smoke:user:api`, `smoke:ai:api`, and `device:login-real:android` can authenticate.
2. Fix Render latest deploy failures for backend and AI provider, then rerun `release:gate -- cloud`.
3. Once login reaches Home, run post-login Android flows: `home-smoke`, `food-diary-readback`, `scan-save-readback`, `voice-text-readback`, `stats-profile-smoke`.
4. Require API readback for every write flow before marking it pass.
5. Run live AI/API benchmark after authenticated cloud smoke is green; offline benchmark is not enough for RC.
6. Re-run `release:gate -- code`, `release:gate -- device`, and `release:gate -- cloud`; only then consider full `release:gate -- all`.

## 10. RC Unblock Update - 2026-04-25T18:05:00+07:00

This update supersedes the earlier Render/device blocker status for the active dev workspace, but it does not mark RC as pass.

Render target correction:

- Old services in `My Workspace` remain quota-blocked by `pipeline_minutes_exhausted` and are no longer the active RC target: `srv-d7arf2svjg8s73em138g` and `srv-d7arf2kvjg8s73em1360`.
- Active services are now the `eatfitai-dev` workspace services:
  - backend `srv-d7m33abrjlhs739qve7g`, `https://eatfitai-backend-dev.onrender.com`.
  - AI provider `srv-d7m33fjeo5us73ejbv4g`, `https://eatfitai-ai-provider-dev.onrender.com`.
- Latest active dev deploys are `live` at commit `112da721996c583485c5d11b9dfc649e69b5fd1b`.
- `smoke:render:verify` now fails if the local worktree is dirty or HEAD is not pushed, so it cannot falsely pass a deploy that does not include local RC changes.
- Current official cloud gate remains fail because local changes are not committed/pushed/deployed yet: `_logs/production-smoke/2026-04-25T11-16-18-462Z/release-gate-report.json`.

Verified evidence:

| Lane | Result | Artifact |
|---|---|---|
| Code gate | Pass after fixing strict UTF-8 validation in `EncryptionService` previous-key fallback. | `_logs/production-smoke/2026-04-25T11-15-12-432Z/release-gate-report.json` |
| Dev Render service mapping | Pass for service/owner/root/docker/deploy, then blocked by dirty local worktree freshness guard. | `_logs/production-smoke/2026-04-25T10-58-10-874Z/render-verify.json` |
| Dev preflight | Pass: backend live/ready 200, AI healthz 200, auth login/refresh 200. | `_logs/production-smoke/2026-04-25T10-45-08-727Z/preflight-results.json` |
| Verified seed/demo account | Pass: profile, diary, nutrition, favorites, relogin readback true. | `_logs/production-smoke/2026-04-25T10-58-10-874Z/demo-seed.json` |
| Android RC proof | Pass across `login-real`, `home-smoke`, `food-diary-readback`, `scan-save-readback`, `voice-text-readback`, `stats-profile-smoke`. | `_logs/real-device-adb/2026-04-25T10-49-38-918Z-rc-proof/report.json` |
| Release gate device | Pass using latest RC proof evidence. | `_logs/production-smoke/2026-04-25T10-57-54-518Z/release-gate-report.json` |
| Release gate cloud | Fail intentionally at Render freshness because local changes are dirty and not deployed. | `_logs/production-smoke/2026-04-25T11-16-18-462Z/release-gate-report.json` |

Remaining cloud/API blockers on active dev services:

- `smoke:auth:api` fail: password reset mailbox did not receive/read reset email; register, verification, login, refresh, logout, and cleanup passed. Artifact: `_logs/production-smoke/2026-04-25T11-00-43-233Z-dev-cloud-followup/auth-api-report.json`.
- `smoke:user:api` fail: 6 backend 500s remain around preferences, user food update/delete, and meal diary update. Artifact: `_logs/production-smoke/2026-04-25T11-05-27-228Z-dev-user-ai-followup/user-api-report.json`.
- `smoke:ai:api` fail: 4 failures remain around rice vision detect/history/unmapped stats and voice execute diary readback. Artifact: `_logs/production-smoke/2026-04-25T11-05-27-228Z-dev-user-ai-followup/ai-api-report.json`.
- Mojibake is visible in generated response-message artifacts for Vietnamese API text. Treat this as an encoding regression risk before final RC evidence publication.

Release recommendation remains: **Hold internal RC**.

Required next step before rerunning final gates:

1. Commit the intended RC changes.
2. Push the branch.
3. Deploy the new commit to the active `eatfitai-dev` Render services.
4. Rerun `release:gate -- code`, `release:gate -- device`, and `release:gate -- cloud` independently.
5. Only run `release:gate -- all` after those three independent gates pass.
