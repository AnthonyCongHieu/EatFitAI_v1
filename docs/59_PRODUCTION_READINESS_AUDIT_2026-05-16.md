# Production Readiness Audit - 2026-05-16

## Baseline

- Branch: `codex/admin-control-plane-v1`.
- Working tree was already dirty before this audit. Existing modified areas: AI dataset training handoff, mobile scan UX, `apiClient` auth retry behavior, MoChi/Profile UI, `app.config.js`, and `render.yaml`.
- Existing untracked areas: `docs/plans/`, `eatfitai-mobile/__tests__/aiScanProductionUx.test.js`, and `eatfitai-mobile/src/assets/mascot/mochi/sprites/44_island_avatar.png`.
- Current production target is Lightsail/DuckDNS. Render is backup/suspended and must not be treated as the primary runtime.
- Public backend: `https://eatfitai-api.duckdns.org`.
- Public AI smoke host: `https://eatfitai-ai.duckdns.org`; backend status reports the real provider URL as private `http://172.26.11.92:5050`.
- UTF-8/mojibake guard passed before changes; mojibake seen in PowerShell output was terminal decoding, not file corruption.

## 2026-05-16 Lightsail Recheck

Fresh production smoke evidence:

- `npm --prefix .\eatfitai-mobile run smoke:preflight` wrote `_logs/production-smoke/2026-05-16T09-22-41-713Z/preflight-results.json`.
- Full disposable-account smoke wrote `_logs/production-smoke/2026-05-16T09-30-18-655Z-lightsail-full-smoke/user-api-report.json` and `ai-api-report.json`.
- Disposable smoke account cleanup returned `200`.

Observed healthy:

- DNS resolves backend to `18.141.119.165` and AI smoke host to `3.0.208.56`.
- Backend `/health/live`, `/health/ready`, and `/api/mobile/config` returned `200`.
- AI provider `/healthz` and `/healthz/gemini` returned `200`; provider is CPU-only, model loaded, Gemini configured.
- Backend `/api/ai/status` returned `200` with provider URL `http://172.26.11.92:5050`.
- Direct unauthenticated backend AI status returned `401`; direct unauthenticated provider `/detect` returned `403`.
- Auth smoke passed on repeat: register, email verify, login, refresh, protected auth route, forgot/reset/change password, cleanup.
- Local gates passed: mojibake guard, secret tracking guard, NuGet high/critical vulnerability check, backend tests, AI provider tests, mobile typecheck, lint, Jest, and media egress guard.

Observed failures / risks:

- First auth smoke had a transient `reset-password` abort at 45s, then passed on retry. Treat as a flake until Lightsail logs explain the request.
- User API smoke failed 9 production steps: profile update, user preferences get/post/get, four meal diary create variants, and meal diary not-found follow-up.
- AI API smoke attempted 36 checks: 24 passed, 12 failed, p95 latency 3592 ms. The primary scan path passed, but nutrition target/current/insights/adaptive endpoints, AI review endpoints, and several voice execution endpoints failed.
- Vision scan detected all five primary fixtures, but three labels were unmapped: `broccoli`, `fried_egg`, and `spinach`.
- Rice scan latency was 6661 ms; other primary scan latencies were 1321-2381 ms.
- Backend readiness currently only proves startup bootstrap and Postgres. It does not prove AI private provider, R2, Brevo/email, Gemini quota, or end-to-end user data flows.
- Public AI `/healthz` exposes detailed runtime and Gemini project/quota state. Keep it only as a temporary smoke surface or redact/protect it.

Likely root cause cluster:

- The live Lightsail app is reachable, but production data paths show schema/master-data drift. `/api/user/preferences` returns 500 even on GET for a new verified user, which is consistent with missing `UserPreference` table/columns or runtime repair not being enough. Meal diary/profile failures are consistent with FK/master-data drift such as activity levels or meal types not matching smoke/app assumptions. Confirm exact SQL errors from Lightsail logs using the request IDs in the smoke reports.

## Findings

- **P0 Lightsail data readiness:** Cloud health is green, but current full smoke proves several user-data endpoints return 500 in production. Do not call all functions production-ready until schema/master-data drift is fixed and user/AI smoke pass.
- **P1 image flow risk:** mobile uploaded media directly to R2 and then immediately called backend vision/voice endpoints. Backend trusted the scoped `ObjectKey`, but there was no backend confirmation that the object actually existed, had the expected content type, and stayed within production size limits before AI provider fetch.
- **P1 secret hygiene risk:** Android `google-services.json` was tracked even though the repo policy already treats Firebase runtime config as local/provider-managed. The secret tracking guard failed until this file was removed from tracking.
- **P2 repo hygiene risk:** no `.gitattributes` existed, so Git warned that many LF files would be rewritten to CRLF on Windows. This is a regression risk for UTF-8/Vietnamese text and generated evidence review.
- **P2 local gate drift:** mobile Jest and lint gates had drifted because MoChi/Stats tests did not match the current compact island avatar and confirm auto-hide behavior, and ESLint warnings were treated as release blockers through `--max-warnings=0`.
- **Remaining operational risks:** Android real-device production gates still require a device. Treat device scan/save/readback as blocked until fresh reports are present.

## Implemented Fixes

- Added `POST /api/v1/storage/verify-upload` to verify uploaded media before downstream AI processing.
- Added R2 metadata lookup through `GetObjectMetadataAsync`, using S3 HeadObject semantics.
- Added mobile verification after direct R2 PUT in `storageService.uploadMediaObject`.
- Added line-ending policy in `.gitattributes`.
- Stopped tracking Android Firebase runtime config, added `google-services.json.example`, and tightened `.gitignore`.
- Restored mobile local gates by updating the MoChi/Stats tests to match current behavior and removing low-risk lint warnings.

## Regression Risks

- Upload flows now fail earlier if R2 metadata is unavailable, content type differs from the signed request, the object is empty, or size exceeds the configured limit.
- Voice uploads also use the shared verification path. This is intentional, but production voice smoke should be run because it depends on R2 HeadObject support.
- Supabase media provider still does not support presigned upload verification. Production is expected to use R2.
- Removing tracked `google-services.json` means local Android builds need the real Firebase file supplied from secure local storage or the build provider.
- MoChi lint/test cleanup intentionally follows the current dirty branch behavior; review those UX changes separately before merging.

## Verification

Passed:

```powershell
dotnet test .\eatfitai-backend\EatFitAI.API.Tests.csproj --filter "FullyQualifiedName~StorageControllerTests|FullyQualifiedName~R2MediaStorageServiceTests"
npm --prefix .\eatfitai-mobile test -- storageService.test.ts --runInBand
python scripts\cloud\check_mojibake.py
python scripts\cloud\check_secret_tracking.py
python scripts\cloud\check_dotnet_vulnerabilities.py
dotnet test .\eatfitai-backend\EatFitAI.API.Tests.csproj
npm --prefix .\eatfitai-mobile run typecheck
npm --prefix .\eatfitai-mobile run lint
npm --prefix .\eatfitai-mobile test
npm --prefix .\eatfitai-mobile run guard:media-egress
npm --prefix .\eatfitai-mobile test -- mochiPoseCatalog.test.ts --runInBand
python -m pytest .\ai-provider\tests
```

Fresh Lightsail checks with mixed results:

```powershell
npm --prefix .\eatfitai-mobile run smoke:preflight
npm --prefix .\eatfitai-mobile run smoke:auth:api
npm --prefix .\eatfitai-mobile run smoke:user:api
npm --prefix .\eatfitai-mobile run smoke:ai:api
```

Blocked until device is available:

```powershell
npm --prefix .\eatfitai-mobile run smoke:infra:gate -- _logs\production-smoke\<timestamp>
npm --prefix .\eatfitai-mobile run device:backend-frontend-live-check:android
npm --prefix .\eatfitai-mobile run device:scan-save-readback:android
npm --prefix .\eatfitai-mobile run release:gate -- all
```
