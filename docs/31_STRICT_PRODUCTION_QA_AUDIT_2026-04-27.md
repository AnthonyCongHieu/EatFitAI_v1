# Strict Production QA Audit - EatFitAI - 2026-04-27

Cap nhat: `2026-04-27 18:03 +07:00`

Repo: `E:\tool edit\eatfitai_v1`

Device: Xiaomi `2201116SG`, serial `a12c6888629b`, package `com.eatfitai.app`

Backend target: `https://eatfitai-backend-dev.onrender.com`

Follow-up scope sau audit ban dau:

- Dieu khien thiet bi that bang ADB va anh chup `exec-out` de khong day lui anh trong Google Photos.
- Mo gallery tren man Scan, chon anh bo ma user da dat san, va ghi nhan AI tra label dung nhung dinh duong rong.
- Fix code backend/mobile ngay trong repo cho cac loi scan result va media URL leak da phat hien.
- Chua claim live production da fix cho den khi backend duoc redeploy va mobile build moi duoc cai lai/verify tren device.

## 1. Verdict

**Ket luan: NOT PRODUCTION READY.**

Ly do chinh:

- **P0 Release blocker:** `npm run release:gate -- device` fail vi latest `login-real` report fail.
- **P1 Notification blocker:** Android notification permission dang bi chan tren thiet bi that: `POST_NOTIFICATION: ignore`, `POST_NOTIFICATIONS: granted=false`, app notification importance `NONE`.
- **P1 AI provider stability blocker:** earlier manual camera scan returned `AI tam offline` and `/api/ai/status` reported dev/production AI provider `DOWN`; later gallery flow returned a label, so availability is intermittent or cache-dependent and still needs fresh live health proof.
- **P1 AI quality gap:** follow-up gallery scan da nhan `Thit bo`, nhung raw result tra `0 kcal / 100g` va macro `0g`, nen production logic khong duoc phep tu luu neu chua map vao catalog dinh duong hop le.
- **P1 Supabase cached egress follow-up:** dashboard van tang sau media fix; live API sample con tra mot so `user-food` thumbnail tu Supabase Storage. Repo da fix serialization path, nhung live can redeploy/readback moi duoc dong.
- **P1 RC automation risk:** UIAutomator tren MIUI flaky/degraded; `login-real` co false-negative/automation mismatch va co lan focus roi ve MIUI launcher.
- **P2 Performance risk:** mot so API warm/live calls vuot nguong warning 2.5s; da co 1 lan `api-login` timeout 30s roi pass khi rerun 90s.

Tinh trang tot:

- Static/API gates deu pass.
- Khong thay crash logcat cua `com.eatfitai.app` trong cac mode pass.
- Home, tab navigation, diary, food search write, scan-save backend write, voice execute, stats/profile, backend/frontend live check deu co evidence pass nhung o trang thai **degraded** do UIAutomator.
- Backend code da them resolver chung de API khong tra primary media URL Supabase Storage cho user-food/search/recent/favorites/custom-dish/meal-diary/profile/admin.
- Mobile image helper da bo cach tu dung Supabase Storage URL tu thumbnail tuong doi; runtime image URL di qua media public base/R2.
- Scan mapping da duoc sua theo logic catalog chinh: confidence du nguong + catalog ID + calories/macro hop le moi duoc coi la matched; cache cu cua vision detect duoc remap lai.
- Mobile scan review/quick-add da chan selected item co dinh duong rong thay vi luu `0 kcal`.

## 2. Environment And Tooling

| Hang muc | Ket qua | Ghi chu |
|---|---:|---|
| Git worktree | Clean truoc khi tao report | Chi them file report nay. |
| Branch | `hieu_deploy/production` | Khong tao branch moi. |
| .NET SDK | `9.0.306` | Khop `global.json` SDK 9. |
| .NET Runtime 10 | Installed `Microsoft.NETCore.App 10.0.7` | Cai bang `winget install Microsoft.DotNet.Runtime.10`. Serena MCP trong phien hien tai van can refresh/restart de thay runtime moi. |
| Node | `v24.13.0` | `package.json` yeu cau `20.x`; gate van pass nhung day la environment drift. |
| npm | `11.6.2` | Hoat dong voi repo. |
| Python | `3.11.9` | AI pytest pass. |
| ADB | Device online | `a12c6888629b device product:veux_global model:2201116SG`. |

## 3. Static And API Gates

| Gate | Command | Result | Score |
|---|---|---:|---:|
| Mobile lint | `npm run lint` | PASS, no direct AI provider URL found | 9/10 |
| Mobile typecheck | `npm run typecheck` | PASS | 9/10 |
| Mobile Jest | `npm run test` | PASS, 39 suites / 166 tests | 9/10 |
| Backend tests | `dotnet test .\EatFitAI_v1.sln --no-restore --nologo --verbosity minimal` | PASS, 196/196 after follow-up fixes | 9/10 |
| AI provider tests | `python -m pytest ai-provider\tests -q` | PASS, 37 passed / 2 skipped | 8/10 |
| Mojibake guard | `python scripts\cloud\check_mojibake.py` | PASS | 9/10 |
| Secret guard | `python scripts\cloud\check_secret_tracking.py` | PASS | 9/10 |
| Media egress guard | `npm run guard:media-egress` | PASS for non-production target | 8/10 |
| NuGet vulnerability guard | `python scripts\cloud\check_dotnet_vulnerabilities.py` | PASS, no high/critical findings | 9/10 |
| Follow-up targeted backend tests | `dotnet test ... --filter "FullyQualifiedName~AiFoodMapServiceTests|...|UserServiceTests"` | PASS, 56/56 | 9/10 |
| Follow-up mobile media/scan-review tests | `npm --prefix .\eatfitai-mobile test -- imageHelpers.test.ts visionReview.test.ts` | PASS, 10/10 | 9/10 |
| Follow-up mobile lint/typecheck | `npm --prefix .\eatfitai-mobile run lint`, `npm --prefix .\eatfitai-mobile run typecheck` | PASS | 9/10 |
| Cloudflare R2 API check | Cloudflare API: `GET /r2/buckets`, managed domain | PASS: bucket `eatfitai-media`, `r2.dev` enabled, no custom domain | 8/10 |

Static gates are healthy. They do **not** prove mobile runtime stability or AI result quality.

## 4. Real-Device Evidence Matrix

| Flow | Latest evidence | Runtime result | Strict score | Decision |
|---|---|---:|---:|---|
| Doctor | `_logs\real-device-adb\2026-04-27T08-06-55-050Z-doctor\report.json` | PASS degraded | 7/10 | Accept as device-ready, not release-clean. |
| Probe | `_logs\real-device-adb\2026-04-27T08-12-51-350Z-probe\report.json` | PASS degraded | 7/10 | App launches, screenshot/logcat OK. |
| Login real | `_logs\real-device-adb\2026-04-27T08-22-28-984Z-login-real\report.json` | FAIL | 4/10 | Release blocker. Latest official mode cannot prove authenticated Home. |
| Home smoke | `_logs\real-device-adb\2026-04-27T08-16-16-106Z-home-smoke\report.json` | PASS degraded | 7/10 | Authenticated Home accepted by foreground+screenshot. |
| Full tab UI | `_logs\real-device-adb\2026-04-27T08-16-25-463Z-full-tab-ui-smoke\report.json` | PASS degraded | 6.5/10 | Home, Voice, Scan, Stats, Profile reachable; marker proof degraded. |
| Food diary readback | `_logs\real-device-adb\2026-04-27T08-21-47-121Z-food-diary-readback\report.json` | PASS degraded | 7/10 | Rerun pass; first run had 30s API login timeout. |
| Food search add/readback | `_logs\real-device-adb\2026-04-27T08-17-35-476Z-food-search-ui-readback\report.json` | PASS degraded | 7/10 | UI add creates backend row `3201`; API durations include warning-level calls. |
| Scan save/readback | `_logs\real-device-adb\2026-04-27T08-18-14-374Z-scan-save-readback\report.json` | PASS degraded | 6/10 | Backend deterministic save/readback works; not real camera AI proof. |
| Voice text/readback | `_logs\real-device-adb\2026-04-27T08-18-32-741Z-voice-text-readback\report.json` | PASS degraded | 6.5/10 | Text command execute works; not STT/audio proof. |
| Stats/profile | `_logs\real-device-adb\2026-04-27T08-18-51-245Z-stats-profile-smoke\report.json` | PASS degraded | 7/10 | Summary/profile API readback pass. |
| Backend/frontend live | `_logs\real-device-adb\2026-04-27T08-19-12-375Z-backend-frontend-live-check\report.json` | PASS degraded | 7/10 | Home/Voice/Scan/Stats/Profile screenshots + API readback pass. |
| Manual ADB follow-up | `_logs\real-device-adb\2026-04-27Tmanual-followup-cache-ui` | MIXED | 5/10 | Direct screenshot/tap verified Home, Diary, Voice, Stats, Profile; Scan needed camera permission and then returned `AI tam offline`. |
| Official device gate | `_logs\production-smoke\2026-04-27T08-23-48-652Z\release-gate-report.json` | FAIL | 0/10 | Fails because latest `login-real` failed. |

## 5. Workflow And API Readback Details

| Workflow | Evidence detail | Result |
|---|---|---|
| Food diary read | `api-login` 200 in 1508ms; diary readback 200 in 614ms; count `22` | PASS degraded. |
| Food search write | baseline count `19`, after-add count `20`, new ID `[3201]`; add confirmed by backend | PASS degraded. |
| Scan save | food search `Banana` found `foodItemId=32`; write 201 in 3206ms; new `mealDiaryId=3202`; marker found in readback | PASS degraded, but this is backend save proof, not AI vision recognition proof. |
| Voice text execute | execute 200 in 1372ms, `success=true`; diary count `21 -> 22` | PASS degraded, but this is text command proof, not microphone/STT proof. |
| Stats/profile | summary 200 in 1758ms; profile 200 in 932ms | PASS degraded. |
| Live check | diary 423ms, summary 1564ms, profile 646ms | PASS degraded. |

Crash evidence:

- `crash-logcat.txt` is empty in pass/degraded modes checked.
- No verified `com.eatfitai.app` crash was found during this audit.

Manual direct-control evidence added after the first report:

| Manual check | Evidence | Result |
|---|---|---|
| Home after force-stop/relaunch | `2026-04-27Tmanual-followup-cache-ui\02-after-wait.png` | PASS: authenticated Home visible. |
| Diary via `XEM TAT CA` | `2026-04-27Tmanual-followup-cache-ui\03-after-view-all.png` | PASS: diary screen reachable and entries visible. |
| Voice tab | `2026-04-27Tmanual-followup-cache-ui\06-tab-voice-exact.png` | PASS UI: voice command screen visible; no microphone/STT proof. |
| Stats tab | `2026-04-27Tmanual-followup-cache-ui\06-tab-stats-exact.png` | PASS UI: day stats visible. |
| Profile tab | `2026-04-27Tmanual-followup-cache-ui\06-tab-profile-exact.png` | PASS UI: profile visible; avatar image visible. |
| Scan permission state | `2026-04-27Tmanual-followup-cache-ui\07-scan-from-profile.png` | WEAK: screen blocks on `Can quyen camera` until permission is granted. |
| Scan camera after permission | `2026-04-27Tmanual-followup-cache-ui\09-scan-after-permission-button.png` | PASS UI: real camera preview opens. |
| Scan capture result | `2026-04-27Tmanual-followup-cache-ui\10-scan-after-shutter.png` | FAIL: result sheet says `AI tam offline`; no food recognition result. |

Additional gallery-scan follow-up using user-provided images:

| Manual check | Evidence | Result |
|---|---|---|
| Open Scan -> gallery | `_logs\real-device-adb\2026-04-27Tgallery-scan-followup\07-gallery-reopened-after-upload.png` | PASS UI: Google Photos picker shows uploaded beef/chicken images. |
| Select beef image | `_logs\real-device-adb\2026-04-27Tgallery-scan-followup\10-beef-scan-result-after-wait.png` | FAIL quality: AI labels `Thit bo`, but calories/protein/carb/fat are all `0`. |
| Review before save | `_logs\real-device-adb\2026-04-27Tgallery-scan-followup\11-after-add-beef-to-diary.png` | WEAK: item is `Can review`; default selection count is `0`. Correctly not ready to save raw. |
| Manual catalog remap | `_logs\real-device-adb\2026-04-27Tgallery-scan-followup\16-after-select-catalog-beef.png` | PASS: selecting `Thit bo nac (song)` maps to `187 kcal/100g`. |
| Save mapped beef | `_logs\real-device-adb\2026-04-27Tgallery-scan-followup\17-after-save-mapped-beef.png` | PASS UI/readback direction: app returns to diary after mapped save. |

Root cause from this flow: AI label recognition can be correct while backend mapping still returns `FoodItemId=null` or invalid nutrition. Production logic must map the detected label to a trusted catalog item or keep the item unresolved; it must not save zero-nutrition scan results.

AI health readback:

- `https://eatfitai-backend-dev.onrender.com/api/ai/status`: `state=DOWN`, provider `https://eatfitai-ai-provider-dev.onrender.com`, message reports health check HTTP `502`.
- `https://eatfitai-backend.onrender.com/api/ai/status`: `state=DOWN`, provider `https://eatfitai-ai-provider.onrender.com`, message reports health check HTTP `502`.
- Direct `healthz` probes to both AI providers timed out at 30s from the QA machine.

## 6. Notification Audit

Evidence folder:

`_logs\real-device-adb\2026-04-27T08-21-00-notification-audit`

Important files:

- `04-notification-current-pulled.png`
- `appops-post-notification.txt`
- `dumpsys-notification-after-toggle.txt`
- `notification-logcat-tail.txt`

Findings:

| Check | Evidence | Result |
|---|---|---:|
| Notifications UI reachable | `04-notification-current-pulled.png` shows screen `Thong bao` with toggles | PASS UI-only |
| Android appop | `POST_NOTIFICATION: ignore` | FAIL |
| Package permission | `android.permission.POST_NOTIFICATIONS: granted=false` | FAIL |
| Notification service app settings | `AppSettings: com.eatfitai.app ... importance=NONE` | FAIL |
| Scheduled EatFitAI alarms/channels | No `meal-reminders`, `water-reminder`, `weekly-review`, `com.eatfitai.app` scheduled alarm evidence found | FAIL/UNKNOWN |
| UI quality | Chat/mascot overlay covers lower-right notification content/toggles | WEAK |

Strict decision: **Notification feature is not production-ready on this device.** The app UI can show toggles as ON, but Android-level permission/appops blocks delivery. A production user would reasonably think reminders are enabled while the OS is blocking them.

## 7. Performance Notes

Startup from ADB `am start -W` is acceptable in the sampled runs:

- Probe: `993ms`
- Login-real latest: `687ms`
- Home smoke: `734ms`
- Full tab UI: `695ms`
- Food search: `719ms`
- Backend/frontend live check: `692ms`

API warning samples:

- `food-search-ui-readback` API login: `3742ms` WARN.
- `food-search-ui-baseline-readback`: `3696ms` WARN.
- `scan-save-readback-write`: `3206ms` WARN.
- First `food-diary-readback` API login timed out at `30004ms`; rerun passed with longer timeout.

Strict threshold used:

- Non-AI API warm call: warn above `2500ms`, fail on timeout or above `10000ms`.
- Current result: performance is usable but not production-clean because of API spikes and one observed timeout.

## 8. Supabase Cached Egress Follow-Up

User supplied Supabase usage screenshots after the earlier media egress fix:

- Cached Egress: `7.71 GB / 5 GB (154%)`, overage `2.71 GB`.
- Uncached Egress: about `2.02 GB / 5 GB`.
- 2026-04-27 chart still shows cached egress activity, roughly `65.54 MB` on that day.

Live API sampling after the report found:

| Endpoint | Backend | Evidence | Result |
|---|---|---|---|
| `/api/food/search?q=banana&limit=10` | dev + production | `thumbNail` and `imageVariants`/fallback URLs point to `pub-9081bce8ff6b4db5b4403ca7adae7b80.r2.dev` | Catalog sample OK. |
| `/api/favorites` | dev + production | favorite thumbnail points to R2 | Favorite catalog sample OK. |
| `/api/profile` | production | `avatarUrl` points to R2 | Avatar sample OK. |
| `/api/user-food-items?page=1&pageSize=20` | production | 3 of 5 sampled `thumbnailUrl` values point to `bjlmndmafrajjysenpbm.supabase.co/storage/v1/object/public/user-food/...` | FAIL: stale user-food media still uses Supabase Storage. |
| `/api/food/recent?limit=20` | production | 3 sampled recent `thumbnailUrl` values point to Supabase Storage | FAIL: recent/user-food path can still generate cached egress. |
| `/api/food/search-all?q=a&limit=20` | production | 1 of 20 sampled URLs points to Supabase Storage | WEAK: mixed catalog/user result path still leaks Supabase media. |

Likely root cause:

- The earlier fix covered catalog/R2 migration and new upload paths, but it did not fully rewrite or retire old `user-food` rows that already contained Supabase public Storage URLs.
- Supabase dashboard is cumulative within the billing cycle and refreshes hourly, so it can keep showing growth from old traffic even after the main catalog path is fixed.
- Stale installed app builds can still contain `EXPO_PUBLIC_SUPABASE_URL` and local fallback logic. If any API row returns a relative/legacy media path, mobile can still construct a Supabase Storage URL.
- Supabase cached egress is CDN cache-hit traffic, not evidence that the app is bypassing cache. Cache hits are still counted as Cached Egress by Supabase.

Strict decision: **cached egress is not closed.** Catalog evidence improved, but `user-food` and recent-food media paths still need a migration/cleanup proof before production.

Follow-up code fix applied in repo:

| Path | Fix |
|---|---|
| `eatfitai-backend/Services/MediaUrlResolver.cs` | New resolver rewrites legacy Supabase public Storage URLs under `user-food/` and `food-images/` to configured media public base when safe. |
| `eatfitai-backend/Services/UserFoodItemService.cs` | Normalizes list/get/create/update `thumbnailUrl` and `imageVariants`. |
| `eatfitai-backend/Services/FoodService.cs` | Normalizes catalog/user thumbnails in search, detail, barcode, recent, and search-all responses. |
| `eatfitai-backend/Controllers/FavoritesController.cs` | Normalizes favorite thumbnails and variants. |
| `eatfitai-backend/Services/CustomDishService.cs` | Normalizes custom-dish ingredient thumbnails. |
| `eatfitai-backend/Services/MealDiaryService.cs` | Normalizes diary `FoodItemThumbNail`/`PhotoUrl` and fills user-food thumbnail for diary rows. |
| `eatfitai-backend/Services/UserService.cs` | Normalizes profile/avatar URL on profile read/update/avatar upload return. |
| `eatfitai-backend/Controllers/AdminController.cs` | Normalizes admin user avatar URL responses. |
| `eatfitai-backend/Controllers/AdminMealController.cs` | Normalizes admin meal photo URL responses. |
| `eatfitai-mobile/src/utils/imageHelpers.ts` | Replaces mobile Supabase URL construction with media public base/R2 URL construction and rewrites legacy Supabase object URLs. |
| `eatfitai-mobile/app.config.js`, `eas.json`, `scripts/build-android-preview.ps1`, `scripts/validate-release-config.js`, `scripts/automation-doctor.js` | Preview/production build/release config now requires `EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL` instead of `EXPO_PUBLIC_SUPABASE_URL`. |

Strict live status after code fix: **not yet closed live** until backend redeploy is done and these API samples return `0` `*.supabase.co/storage/v1/object` URLs. Existing Supabase dashboard counters are cumulative by billing cycle, so the graph will not drop immediately even after correct deploy.

Required validation:

1. Rewrite existing `user-food` public URLs from Supabase Storage to R2 or replace them with optimized R2 variants.
2. Query all user-food, recent-food, favorites, diary, profile/avatar, search/detail endpoints and require `0` primary media URLs with `*.supabase.co/storage/v1/object`.
3. Add a release guard that fails production/smoke if API samples expose Supabase Storage media while egress lockdown is active.
4. Recheck Supabase dashboard hourly for 24-72h and again after the next billing cycle starts; do not call the issue fixed from a single API sample.

## 9. Result Quality Assessment

| Area | Score | Why |
|---|---:|---|
| Auth/session | 5/10 | App authenticated in Home evidence, but latest `login-real` and official device gate fail. |
| Home/dashboard | 7/10 | Home visible and functional in screenshots, but marker proof degraded. |
| Diary/food | 7/10 | Backend readback and real UI add are proven; API latency spikes remain. |
| AI scan | 4/10 | Gallery flow can return a label, but raw beef result returned `0 kcal`; repo fix now blocks/remaps invalid nutrition, but updated build/live backend not yet proven on device. |
| Voice | 6.5/10 | Backend text-command execute/readback works, but no microphone/STT proof. |
| Stats/profile | 7/10 | API readback pass; UI proof degraded. |
| Notifications | 3/10 | UI exists, but OS permission/appops block delivery. |
| Automation/release gate | 4/10 | Most mode reports pass/degraded, but official device gate fails due `login-real`. |

## 10. Production Blockers And Backlog

| Priority | Item | Evidence | Required fix/validation |
|---|---|---|---|
| P0 | Device release gate fails | `_logs\production-smoke\2026-04-27T08-23-48-652Z\release-gate-report.json` | Make `login-real` deterministic or change RC proof to accept already-authenticated Home with reliable evidence. Gate must pass. |
| P1 | Notifications blocked by OS | `appops-post-notification.txt`, package permission dump | Request permission clearly, detect denied/blocked state, surface UI warning, verify channel/schedule/cancel. |
| P1 | AI provider down for scan | Manual scan screenshot `10-scan-after-shutter.png`; `/api/ai/status` returns `DOWN` for dev and production | Restore AI provider health, keep provider warm, make scan fail reason explicit, rerun real camera/gallery scan with mapped result. |
| P1 | Supabase cached egress still has live leak paths | Production API sample: `/api/user-food-items`, `/api/food/recent`, `/api/food/search-all?q=a` include Supabase Storage user-food URLs | Repo resolver fix added. Must redeploy backend, run live API readback across user-food/search/recent/favorites/diary/custom-dish/profile, then monitor dashboard for 24-72h. |
| P1 | `login-real` automation unsafe on authenticated state | Latest `login-real` ended with focus on MIUI launcher | Separate fresh-login test from session-restore test; avoid blind coordinate taps when already authenticated. |
| P1 | AI scan lacks production-quality result proof | Gallery scan recognized beef but returned `0 kcal`; save worked only after manual catalog remap | Repo fix added: catalog resolution requires confidence + valid nutrition; mobile blocks invalid nutrition saves. Must reinstall/redeploy and repeat gallery beef/chicken scan. |
| P1 | Voice lacks STT proof | `voice-text-readback` is text command only | Add microphone permission/STT test or explicitly scope voice as text-only. |
| P2 | UIAutomator unreliable on Xiaomi/MIUI | All real-device modes degraded | Keep screenshot/logcat/API readback as primary, but improve stable accessibility markers and fallback logic. |
| P2 | API latency spikes | 3.2s-3.7s calls and one 30s timeout | Warm backend, measure p50/p95, isolate Render cold start vs endpoint slowness. |
| P2 | Notification screen visual obstruction | `04-notification-current-pulled.png` | Ensure chat/mascot overlay does not cover toggles/content on settings screens. |
| P2 | Node engine drift | Node `v24.13.0`, package engine `20.x` | Use Node 20 for release gates or update engine policy after compatibility review. |
| P3 | Serena MCP runtime refresh | .NET 10 installed but MCP still saw old list in-session | Restart/refresh Serena MCP process and re-run semantic overview. |

## 11. Final Decision

EatFitAI is suitable for continued internal QA/RC only.

It is **not acceptable for production release** until:

1. `npm run release:gate -- device` passes with latest reports.
2. Notification permission/channel/schedule/cancel are proven on a real Android device.
3. AI provider health is restored and real camera/gallery scan returns a mapped result.
4. Supabase cached egress leak paths are closed and monitored for 24-72h.
5. Fresh login and already-authenticated session restore are tested separately.
6. AI vision and voice have real result-quality evidence, not only deterministic backend write/readback.
7. API latency spikes and the observed timeout are explained or reduced.

No production claim should be made from this audit because the strict release gate failed.
