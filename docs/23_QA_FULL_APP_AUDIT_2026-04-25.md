# EatFitAI Full App QA Audit - 2026-04-25

Cập nhật: `2026-04-25`

## 1. Phạm vi và mức bằng chứng

Báo cáo này tổng hợp audit toàn app theo các lane: mobile feature inventory, backend/API, AI quality, Android UI evidence, cleanup, docs/release gates. Mọi kết luận bên dưới chỉ dựa trên lệnh hoặc artifact đã chạy/xem trong workspace hiện tại.

Mức bằng chứng:

- **Verified**: có output lệnh hoặc artifact trực tiếp.
- **Evidence path**: có report/screenshot/logcat trong `_logs`.
- **Needs follow-up**: code/surface tồn tại nhưng chưa có runtime proof đủ chặt.

## 2. Feature Inventory

| Nhóm | Chức năng hiện tại | Trạng thái QA |
|---|---|---|
| Auth/onboarding | Intro carousel, welcome, login, register, verify email/code, forgot/reset password, Google sign-in, onboarding/target calculation. | Auth-entry chứng minh vào được login và submit; chưa chứng minh full login thành công. |
| Home | Home/dashboard ngày, quick actions, streak/water summary, tab navigation. | Cần test sau login trên thiết bị thật. |
| Diary/food/favorites/common meals | Meal diary, add food, food search/detail, custom food, favorites, common meals, add-to-diary. | Có surface mobile/backend; cần post-login E2E. |
| AI scan/recipes/nutrition | Vision scan, result review, add food from vision, recipe suggestion, nutrition insight/target, dietary restrictions/history. | Có provider/backend/mobile flow; chưa có benchmark accuracy mới. |
| Voice | Voice/text command, parse command, execute/review/confirm flow. | Cần E2E với backend/credential; không coi text-command là STT proof. |
| Stats | Daily/weekly/monthly style nutrition summaries, trends, analytics. | Cần xác nhận route week/month và test sau login. |
| Profile/settings | Profile, goals, notifications, legal/app/account settings. | Cần test sync sau login và update profile/goals. |
| Achievements/share | Streak, water, achievements/share-style surfaces. | Cần runtime proof sau login. |
| Backend admin/runtime/telemetry | Admin controllers, runtime status, health/telemetry, audit/runtime snapshot/cache. | Full backend gate hiện pass 170/170; vẫn cần thêm coverage cho nhiều admin/runtime endpoint. |

## 3. Evidence Matrix

| Khu vực | Lệnh/artifact | Kết quả | Ghi chú |
|---|---|---|---|
| Backend tests | `dotnet test .\EatFitAI_v1.sln --no-restore --nologo --verbosity minimal` | **Pass: 170/170** | Verified rerun tuần tự sau khi tránh nhiễu file-lock do chạy nhiều `dotnet test` song song. |
| Mobile typecheck | `npm --prefix .\eatfitai-mobile run typecheck` | **Pass** | Verified trong session hiện tại. |
| Mobile lint | `npm --prefix .\eatfitai-mobile run lint` | **Pass** | Verified trong session hiện tại. |
| AI provider pytest | `python -m pytest ai-provider\tests -q` | **37 passed, 2 skipped** | Unit tests pass; không suy diễn thành model accuracy. |
| Mojibake guard | `python scripts\cloud\check_mojibake.py` | **Pass** | No mojibake markers found. PowerShell display có thể render sai dù file UTF-8 đúng. |
| Android doctor | `npm --prefix .\eatfitai-mobile run device:doctor:android` | **status=degraded, passed=true** | Evidence: `_logs\real-device-adb\2026-04-25T07-42-30-228Z-doctor`; ADB online, app installed, scrcpy 3.3.4, screencap OK, UIAutomator/OEM warnings. |
| Android probe | `npm --prefix .\eatfitai-mobile run device:probe:android` | **status=degraded, passed=true** | Evidence: `_logs\real-device-adb\2026-04-25T07-42-49-689Z-probe`; launch/foreground OK, screenshot/logcat OK, UI dump degraded. |
| Login smoke | `node .\eatfitai-mobile\scripts\real-device-adb-flow.js login-smoke` | **status=degraded, passed=true** | Evidence: `_logs\real-device-adb\2026-04-25T07-43-20-446Z-login-smoke`; bounded entry proof only. |
| Scan entry | `node .\eatfitai-mobile\scripts\real-device-adb-flow.js scan-entry` | **status=degraded, passed=true** | Evidence: `_logs\real-device-adb\2026-04-25T07-44-24-409Z-scan-entry`; coordinate-tap/foreground/screenshot proof only. |
| Diary readback | `node .\eatfitai-mobile\scripts\real-device-adb-flow.js diary-readback` | **status=degraded, passed=true** | Evidence: `_logs\real-device-adb\2026-04-25T07-45-15-440Z-diary-readback`; does not create or verify backend-backed diary entry. |

## 4. AI Scorecards

| AI area | Score | Evidence basis | Strict improvement notes |
|---|---:|---|---|
| Vision scan | 6.0/10 | Provider/backend/mobile flow exists; AI pytest passes; no fresh image accuracy benchmark. | Run fixture benchmark before claiming recognition quality. Track top-1/top-3, unmapped labels, false positives, latency p50/p95. |
| Nutrition target/Gemini | 7.0/10 | Fallback architecture and tests exist. | Clamp/validate model output, record fallback reason, and compare formula results against Mifflin-St Jeor expectations. |
| Recipe/insight | 5.5/10 | Functional heuristic/LLM surfaces exist. | Add deterministic fixtures, dietary restriction negative cases, and macro-total checks. |
| Voice command | 6.0/10 | Parse/execute flow exists; full device proof missing. | Add Vietnamese command corpus and post-login execute/readback tests. |
| Runtime/telemetry | 6.8/10 | Runtime/admin surfaces exist; backend gate currently passes. | Add endpoint tests for admin/runtime surfaces and review public health metadata. |

No benchmark result is invented here. Unit tests only prove covered code paths, not food recognition quality, nutrition correctness, or full mobile workflow stability.

## 5. UI Defects And Backlog

- Intro screenshot shows a visible right-side scroll indicator/overlay. Determine whether it is ScrollView indicator, MIUI overlay, or layout artifact in a separate UI pass.
- UIAutomator is degraded on Xiaomi/MIUI: screenshots/logcat work, but XML dumps can fail. The lane now exposes `pass|degraded|fail` instead of treating UI dump loss as fully green.
- Auth-entry/login-smoke are not full login proof. They only prove entry navigation and input/tap behavior.
- Post-login flows still need device proof: Home, diary add/readback, food search/add, favorites/common meals, AI scan save/readback, voice, stats, profile/settings, achievements/share.
- Add stable accessibility labels/testIDs for critical controls if UIAutomator or screenshot assertions become release gates.

## 6. Cleanup Log

- Active Detox cleanup is present: Detox config, E2E files, Android test shim, build script, package dependency, and Gradle references are removed.
- Active code/tooling grep found no `detox|maestro|appium` references in active mobile/scripts/tools/docs index scope; historical archive docs can remain as history.
- Removed generated stale logs: `_logs\dotnet10-serena-pilot`, `_logs\token-tooling-final-trim`, `_logs\token-tooling-pilot`, and transient `_logs\real-device-adb\doctor-ui-*`.
- Preserved `_logs\real-device-adb\2026-04-25T*` because they are current audit evidence.
- Preserved `_state`, keystores, runtime quota state, uploads, fixtures, and tracked docs archive. Do not delete them without a separate owner decision.

## 7. Encoding Notes

Node/Unicode-escape checks and `scripts/cloud/check_mojibake.py` show active repo-owned source/docs are UTF-8 safe. PowerShell `Get-Content` can display Vietnamese as mojibake in this terminal, so do not use visual PowerShell output alone as corruption proof.

The token-saving tools report now uses escaped mojibake examples, so the mojibake guard does not fail on intentional documentation examples.

## 8. Release Recommendation

**Not production-ready yet.**

Current recommendation: conditional internal QA/RC only. Backend and static gates are healthier now, but production release still needs full post-login real-device evidence and AI benchmark evidence.

Do not claim full-app stability until:

1. Backend full gate remains green at final verification.
2. Hardened real-device reports stay non-failing with strict critical failure semantics.
3. Full auth with valid test account/session reaches authenticated Home.
4. Post-login flows are exercised with screenshots/logcat and backend readback where applicable.
5. AI fixture benchmarks are run before assigning model-quality claims.

## 9. Next Validation Steps

1. Add npm scripts/release-gate coverage for bounded UI modes where useful.
2. Run full auth with valid test credentials and capture authenticated Home.
3. Exercise diary add/readback, food search/add, AI scan save/readback, voice execute, stats, and profile on the real device.
4. Add fixture-based AI benchmark suites for vision, nutrition formula, voice command parsing, and recipe/insight filtering.
5. Keep cleanup whitelist-based; never delete `_state` broadly.
