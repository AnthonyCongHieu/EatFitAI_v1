# EatFitAI Rubric, Production Audit, and Fix Checklist

Updated: `2026-04-30`

Scope: `D:\EatFitAI_v1` backend/mobile/AI provider and `D:\EatFitAI_Admin` admin dashboard. This document reuses the existing research and audit files instead of replacing them.

## Source documents reused

- `docs/29_MEDIA_EGRESS_AND_PRODUCTION_COST_STRATEGY_2026-04-27.md`
- `docs/30_SERVICE_RISK_REGISTER_2026-04-27.md`
- `docs/31_STRICT_PRODUCTION_QA_AUDIT_2026-04-27.md`
- `docs/34_SYSTEM_AUDIT_AND_ROADMAP.md`
- `docs/38_IMPROVEMENT_ROADMAP_2026-04-28.md`
- `docs/39_TEST_CASE_MATRIX_2026-04-28.md`
- `D:\EatFitAI_Admin\docs\04_ADMIN_AUDIT_SCORECARD_2026-04-13.md`
- `D:\EatFitAI_Admin\docs\08_POSTFIX_LIVE_REAUDIT_OFFICIAL_2026-04-14.md`

## Current evidence snapshot

| Area | Evidence | Result |
|---|---|---|
| Root branch | `git branch --show-current` | `hieu_deploy/production` |
| Admin branch | Created for this work | `codex/admin-egress-audit` |
| Recent production-smoke logs | Latest 10 smoke folders scanned for `supabase.co/storage/v1/object` | Latest 6 runs after `2026-04-26T05-24-47Z` show `0`; bad run `2026-04-26T05-23-32Z` had `81` hits |
| Live user/admin API readback | 11 authenticated GET endpoints scanned | `0` Supabase Storage URL hits |
| Production DB legacy URLs | Direct DB scan | `UserFoodItem.ThumbnailUrl=24`, `Users.AvatarUrl=3`, `AILog.InputData=38`, `AILog.OutputData=38` |
| Supabase storage objects | `storage.objects` summary | Only `ml-models`, `object_count=1`, `total_bytes=0` |
| Supabase storage logs | Sample logs for `/object/info/ml-models/best.pt` | Repeats are not hourly; observed gaps are about 180, 133, 209, 134, 139, and 5 minutes |
| Cloudflare MCP | R2 bucket read attempted through configured MCP | Blocked by Cloudflare API auth error; do not paste exposed token into docs or logs |

## 5 review findings status

| Finding | Required fix | Current status | Evidence / test target |
|---|---|---|---|
| P1 Voice accepts arbitrary `AudioUrl` | Backend accepts scoped `ObjectKey`; legacy `AudioUrl` only if it resolves under `Media:PublicBaseUrl` and current `voice/{userId:N}/...` | Implemented in working tree | `VoiceControllerTests.TranscribeWithProvider_*` |
| P1 AI provider audio SSRF/size guard | HTTPS, media-host allowlist, no credentials, private IP block, no redirects, content-type check, stream byte counter | Implemented in working tree | `ai-provider/tests/test_remote_image_url_safety.py` |
| P2 Production CORS wildcard | Remove wildcard Vercel origin with credentialed CORS | Implemented in working tree | `ProductionCorsConfigurationTests` |
| P2 Supabase health config-only | Real HTTPS dependency check with timeout, no secret leak | Implemented in working tree | `SupabaseHealthCheckTests` |
| P2 Runtime schema bootstrap repeats | Gate startup DDL and keep one-shot command path | Implemented in working tree | `SchemaBootstrapStartupGateTests` |

## Supabase egress root cause

Root cause was not normal database/auth traffic. The GB-scale overage came from earlier live API responses that exposed public Supabase Storage URLs for `avatarUrl`, `thumbNail`, `thumbnailUrl`, and `foodItemThumbNail`. Some legacy thumbnails were documented as multi-MB files, so a small number of UI/smoke loads could push cached egress above the Free Plan quota.

Current interpretation:

- Cached Egress `8.64 GB / 5 GB` is cumulative for the billing period `31 Mar 2026 - 30 Apr 2026`; it does not drop after code is fixed.
- Current sample readback shows API responses no longer leak Supabase Storage URLs.
- Small daily increases can still come from dashboard refresh delay, auth/API checks, admin keep-alive, or old clients/bots requesting cached URLs.
- Legacy Supabase URLs still exist in production DB and should be migrated/sanitized so future code paths cannot re-expose them.
- The latest storage log sample for `/object/info/ml-models/best.pt` is not the admin keep-alive path. It is a Supabase Storage metadata/info lookup for the legacy model bucket, most likely from an old AI provider deployment/env, a manual model script, or Supabase dashboard/storage inspection.
- AI provider config/docs were tightened so Supabase model download is treated as removed: `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` are no longer advertised for the AI provider in `render.yaml`, `.env.example`, or README, and the legacy Supabase model upload script was deleted.

Admin mitigation implemented in `D:\EatFitAI_Admin`:

- `/api/keep-alive` no longer directly pings Supabase `/auth/v1/health` by default.
- It delegates Supabase health to backend dependency health and keeps direct Supabase ping behind `ADMIN_KEEPALIVE_DIRECT_SUPABASE=1`.
- Added `src/app/api/keep-alive/route.test.ts` to ensure default keep-alive only calls backend and AI provider.

## Rubric scorecard

This is a conservative engineering score, not a final defense score.

| Rubric item | Current score | Reason | Required lift |
|---|---:|---|---|
| Khảo sát | 0.5 / 1 | Has market/technical docs, but lacks formal survey evidence | Add user survey or structured stakeholder interview result |
| Phân tích | 0.9 / 1 | Architecture/userflow/AI docs are strong | Keep traceability from goals to features |
| Thiết kế | 0.9 / 1 | UML and deployment docs exist | Update diagrams after R2/ObjectKey/security changes |
| Cài đặt | 0.85 / 1 | Most features run, but live quota/security issues remain | Finish P0/P1 fixes and evidence gates |
| Mục tiêu | 0.9 / 1 | Goal is clear and feasible for beta | Tie goals to measurable acceptance criteria |
| Kiểm thử | 0.8 / 1 | Backend/AI/mobile/admin tests exist | Add final cross-flow E2E proof matrix |
| Đánh giá kết quả | 0.8 / 1 | Many audit docs exist | Add concise before/after interpretation with charts/screenshots |
| Ứng dụng & sáng tạo | 0.85 / 1 | AI nutrition, voice, R2 architecture are practical | Add competitor comparison and commercial model |
| Thuyết trình | 1.3 / 2 | Strong docs, but presentation evidence not in repo | Create final slides/demo script/Q&A sheet |

Estimated total now: `7.8 / 10`. Target after P0/P1 and presentation pack: `8.8+ / 10`.

## Expanded production scorecard

| Area | Current | Target | Weak points |
|---|---:|---:|---|
| Security | 7.5 | 9.0 | Exposed session tokens must be rotated; AI/media rate limits need final proof |
| Privacy / PII | 7.5 | 8.5 | Log masking exists; need final scan of logs/docs for secrets/PII |
| Reliability | 7.0 | 8.5 | Render cold start, provider quota, dependency health coverage |
| Scalability | 6.0 | 8.0 | Free-tier constraints, no formal load test, Gemini free-pool risk |
| Cost control | 7.5 | 9.0 | Egress root cause mostly fixed; need live monitoring guard |
| UI/UX | 7.5 | 8.5 | Cold-start loading states and error recovery still uneven |
| Userflow | 8.0 | 8.8 | Main flows documented; needs final real-device proof per path |
| Maintainability | 8.0 | 9.0 | Many docs/tests; need avoid duplicate stale docs |
| Observability | 6.5 | 8.5 | Logs exist; need structured request/cost dashboards |
| Commercial readiness | 6.5 | 8.0 | Needs paid-tier plan, pricing/revenue model, and operational runbook |

## Work checklist

### P0 - must finish before claiming production/beta-ready

- [x] Snapshot git/log/docs state.
- [x] Verify latest smoke logs and live readback for Supabase Storage URL leaks.
- [x] Add admin keep-alive mitigation to avoid recurring direct Supabase health ping.
- [x] Add admin keep-alive unit test.
- [x] Run backend tests: `dotnet test eatfitai-backend\EatFitAI.API.Tests.csproj --no-restore` -> `215 passed`.
- [x] Run AI provider tests: `python -m unittest discover -s tests` -> `49 passed`.
- [x] Run mobile typecheck and tests: `npm run typecheck`, `npm test -- --runInBand` -> `165 passed`.
- [x] Run admin tests and typecheck: `npm test`, `npm run typecheck` -> `36 passed`.
- [x] Run `git diff --check` in both repos -> no whitespace errors; Windows LF/CRLF warnings only.
- [ ] Rotate/revoke exposed Render, Supabase, Brevo, Cloudflare API/R2 tokens.

### P1 - root-cause cleanup

- [ ] Add/execute a backup-first migration to rewrite legacy Supabase Storage URLs in production DB after verifying matching R2 objects.
- [ ] Sanitize admin AI log previews so embedded historical media URLs cannot become clickable/rendered media.
- [ ] Add live response guard script that fails if any user/admin API returns `supabase.co/storage/v1/object`.
- [ ] Add R2 dependency health check or smoke check to backend/admin system health.
- [ ] Add rate limit/concurrency guard for AI-heavy endpoints.

### P2 - rubric and demo quality

- [ ] Update UML/deployment diagrams to show R2 ObjectKey media flow and AI provider SSRF guard.
- [ ] Add formal user survey or stakeholder interview summary.
- [ ] Add competitor comparison: MyFitnessPal, Lose It!, Yazio, plus Vietnam-market gap.
- [ ] Add final demo script and expected Q&A for the defense panel.
- [ ] Add cold-start/loading-state UX proof for scan and voice flows.
- [ ] Add load test smoke for health/search/AI endpoints with safe request budgets.

## Acceptance gates

The project cannot be called production-ready until all of these are true:

1. No live sampled API response contains `supabase.co/storage/v1/object`.
2. No production credentialed CORS wildcard exists.
3. Voice/audio and image remote media paths reject SSRF/private/redirect/oversize inputs.
4. Supabase health check fails closed when dependency is down or config is placeholder.
5. Production schema bootstrap does not run DDL unless explicitly gated.
6. Exposed cloud/API tokens are rotated.
7. Backend, AI provider, mobile, and admin verification commands have fresh passing evidence or documented blockers.
