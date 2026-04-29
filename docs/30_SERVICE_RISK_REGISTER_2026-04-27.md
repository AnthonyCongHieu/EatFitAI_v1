# EatFitAI Service Risk Register

Ngày lập: 2026-04-27
Phạm vi: all-in production risk register cho security, quota/cost, availability, performance, data loss, vendor lock-in, operational drift và rollout.
Nguồn: repo hiện tại, Render API read-only, tài liệu chính thức của provider. Không ghi raw token/key/connection string vào tài liệu này.

## Executive Summary

EatFitAI hiện có kiến trúc mobile -> ASP.NET backend -> Supabase/Postgres/Auth, Cloudflare R2 media, Python AI provider/Gemini, Brevo email, Firebase/Google mobile services và Expo/EAS release tooling. Sự cố Supabase media egress đã được giảm ở nguồn chính bằng R2 media offload, nhưng vận hành production vẫn còn các rủi ro đáng chú ý.

Top risks cần xử lý trước public production:

| Ưu tiên | Rủi ro | Trạng thái |
| --- | --- | --- |
| Critical | Các token/key từng được dán vào chat cần rotate/revoke | Open |
| Critical | Production Render đang bị chặn deploy do `pipeline_minutes_exhausted`; dev live ở commit cũ hơn branch | Open |
| High | R2 đang dùng `r2.dev`, thiếu custom domain/WAF/cache controls cho production | Open |
| High | Preview và production mobile cùng trỏ Supabase project; dễ tạo drift hoặc test ảnh hưởng production data/quota | Open |
| High | Supabase backup/restore/PITR chưa được vận hành hóa cho dữ liệu người dùng | Open |
| High | Gemini quota hiện là bottleneck sớm; local gate `GEMINI_RPD_LIMIT=20` mỗi project phù hợp beta, không đủ public scale | Open |

Render read-only check ngày 2026-04-27:

- `eatfitai-backend`: plan `free`, latest deploy `build_failed`, recent event có `pipeline_minutes_exhausted`.
- `eatfitai-backend-dev`: plan `free`, latest deploy `live`, commit live `6de1c278`, trong khi branch đã đi tiếp.
- Không thực hiện deploy/restart/env mutation trong lần rà soát này.

## Service Inventory

| Service | Vai trò | Evidence | Env/owner | Criticality |
| --- | --- | --- | --- | --- |
| Render web service `eatfitai-backend` | Public ASP.NET API, auth, user data, media processor, admin APIs | `render.yaml`, `eatfitai-backend/Program.cs` | Production, project owner | Critical |
| Render web service `eatfitai-ai-provider` | Python/Flask AI provider, YOLO, Gemini proxy | `render.yaml`, `ai-provider/app.py`, `ai-provider/gemini_pool.py` | Production, project owner | High |
| Render web service `eatfitai-backend-dev` | Dev/staging backend smoke target | Render API read-only, mobile smoke scripts | Dev/internal | High |
| Supabase | Postgres/Auth/current source of truth, legacy Storage, model bucket for AI provider | `appsettings*.json`, `render.yaml`, `ai-provider/app.py` | Shared project unless separated later | Critical |
| Cloudflare R2 `eatfitai-media` | Primary public media offload for catalog/avatar/user-food variants | `render.yaml`, `Media__Provider=r2`, docs/29 migration evidence | Dev/internal beta public URL | High |
| Firebase + Google | Crashlytics, Google Sign-In/OAuth IDs, Android config | `eatfitai-mobile/package.json`, `app.config.js`, `eas.json`, auth docs | Mobile | High |
| Expo/EAS | Mobile build profiles, public env injection, preview/production release | `eatfitai-mobile/eas.json`, `app.config.js` | Release pipeline | High |
| Gemini API | Nutrition, meal insight, cooking, voice parsing, AI key pool | `render.yaml`, `ai-provider/gemini_pool.py`, backend Gemini admin APIs | AI provider/backend | High |
| Brevo | Transactional email for reset/verification | `render.yaml`, `appsettings*.json`, `EmailService` | Backend | Medium |
| Vercel/admin target | Admin/ops frontend target and allowlisted origin | `appsettings.Production.json`, docs archive | Admin/ops | Medium |
| GitHub Actions | CI build/test gate | `.github/workflows/ci.yml` | Repo owner | Medium |

## Trust Boundaries

| Boundary | Data/asset crossing | Existing controls | Main risk |
| --- | --- | --- | --- |
| Mobile -> backend API | JWT, profile, diary, search, uploads, telemetry | JWT auth, rate limiting, request size limits on large upload paths | token theft, API abuse, quota amplification |
| Mobile -> Supabase public URL | Supabase URL is public in `EXPO_PUBLIC_SUPABASE_URL` | Intended public identifier only | confusing public URL with secret; shared env drift |
| Backend -> Supabase Postgres/Auth/legacy Storage | PII, nutrition logs, admin state, service role storage access | env secrets, PostgreSQL SSL, health checks | data loss, key compromise, shared project blast radius |
| Backend -> R2 | optimized media objects and public URLs | R2 access key env, WebP variants, immutable cache headers | token leak, public object abuse, custom domain gap |
| Backend -> AI provider | meal images, nutrition context, internal token | `AI_PROVIDER_INTERNAL_TOKEN`, AI rate limits | internal token leak, image/PII leakage, AI quota drain |
| AI provider -> Gemini | prompt/user nutrition context, model outputs | key pool, RPM/TPM/RPD gates, cooldowns | quota exhaustion, prompt/data governance |
| AI provider -> Supabase model bucket | private model weights download | Supabase service key env | service key blast radius, cold-start/model availability |
| Backend -> Brevo | email address, reset/verification codes | Brevo API key env, transactional email API | email abuse, sender reputation, account rate limits |
| GitHub/Render/EAS -> deployed artifacts | build env, secrets, release config | secret envs, CI checks | stale env, failed deploy, accidental public exposure |

## Risk Register

Severity is based on likelihood x impact after current controls.

| ID | Service | Risk | Impact | Likelihood | Severity | Evidence | Mitigation / next action | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SR-01 | Cross-service secrets | Supabase, Render, Cloudflare R2 credentials were shared in chat and must be considered exposed. | Full service takeover or data/media mutation if reused. | High until rotated. | Critical | Conversation history; `check_secret_tracking.py` only verifies repo cleanliness, not chat exposure. | Rotate/revoke Supabase token, Render API key, Cloudflare token, R2 S3 access key; record rotation date in a private ops log. | Project owner | Open |
| SR-02 | Render | Production deploy is blocked by `pipeline_minutes_exhausted`; critical fixes cannot roll out. | Stale production code, inability to ship emergency fixes. | High, observed. | Critical | Render API read-only: production latest deploy `build_failed`; event `pipeline_minutes_exhausted`; `render.yaml` uses plan `free`. | Restore build minutes or upgrade plan; redeploy `eatfitai-backend`; add release gate that fails if latest production deploy is not `live` for current commit. | Project owner | Open |
| SR-03 | Render | Free web service behavior is not production-grade. | Cold starts, downtime risk, ephemeral filesystem loss, bandwidth/build-minute constraints. | High. | High | `render.yaml` plan `free`; Render docs note free web services spin down and count against included pipeline minutes/bandwidth. | Use paid plan for public production backend and AI provider; move durable state out of service filesystem. | Project owner | Open |
| SR-04 | Render/AI provider | AI provider stores runtime usage state and uploaded temp files under local `uploads/`. | quota state loss after restart, inconsistent throttling, temporary data residue. | Medium. | High | `GEMINI_USAGE_STATE_PATH=uploads/gemini-usage-state.json`; `ai-provider/app.py` creates `uploads`. | Store Gemini usage state in DB/Redis/Supabase table; enforce upload cleanup TTL; do not rely on Render filesystem for durable state. | Backend/AI | Open |
| SR-05 | Supabase | Preview and production mobile builds point at the same Supabase project. | dev/smoke can affect production data, auth users and quota. | High. | High | `eatfitai-mobile/eas.json` preview and production both use `https://bjlmndmafrajjysenpbm.supabase.co`. | Create separate Supabase dev/staging/prod projects or hard gates that prevent destructive smoke against production data. | Project owner | Open |
| SR-06 | Supabase | Media egress incident can recur from stale app versions, legacy URLs, or non-catalog paths. | quota exhaustion, grace-period pressure, service throttling. | Medium. | High | docs/29 shows R2 migration done; production not yet redeployed with latest `imageVariants`; Supabase egress dashboard requires monitoring. | Monitor cached egress hourly for 72h and daily for 7 days; keep `EXPO_PUBLIC_MEDIA_BUDGET_MODE=placeholder` as emergency brake; block release if Supabase Storage path is primary. | Backend/mobile | Monitor |
| SR-07 | Supabase | Backup/restore process is not operationalized for user data. | data loss or long downtime during restore. | Medium. | High | No repo runbook for scheduled off-site DB dump; Supabase docs recommend free-tier projects maintain exports. | Add backup runbook: weekly `pg_dump`/Supabase CLI export, encrypted off-site storage, restore rehearsal; evaluate Pro/PITR before public launch. | Project owner | Open |
| SR-08 | Supabase | Service role key is used by backend and AI provider storage/model flows. | broad data/storage access if leaked. | Medium. | High | `Supabase__ServiceRoleKey`, `SUPABASE_SERVICE_KEY` in `render.yaml`; `ai-provider/app.py` downloads model from private bucket. | Scope usage to server-only env; rotate after exposure; prefer dedicated storage keys or signed URL flow where possible; avoid logging env. | Backend/AI | Open |
| SR-09 | Cloudflare R2 | `r2.dev` public bucket URL is suitable for dev/internal beta but not production. | weaker edge controls, no WAF/bot/custom caching policy, URL churn. | High while public URL is used. | High | docs/29 records public development URL; Cloudflare docs state custom domain is needed for WAF/cache/access controls. | Configure custom domain for R2 bucket before public production; update `Media__PublicBaseUrl`; keep `r2.dev` only for internal beta. | Project owner | Open |
| SR-10 | Cloudflare R2 | R2 operation costs can grow through public image reads/HEADs or dashboard browsing. | unexpected Class B cost, budget drift. | Medium. | Medium | R2 pricing docs: Class A mutates/lists, Class B reads/HEAD/GET; free tier limits are monthly. | Track Class A/B metrics weekly; cache immutable variants; avoid excessive HEAD probes; add budget alarms/manual dashboard cadence. | Project owner | Monitor |
| SR-11 | Cloudflare R2 | R2 access key is bucket write-capable. | object overwrite/defacement/data deletion if compromised. | Medium. | High | R2 env keys in `render.yaml`; earlier key was shared in chat. | Rotate key; create least-privilege bucket-only token; separate migration key from runtime key; keep DeleteObject disabled if operationally possible. | Project owner | Open |
| SR-12 | Backend uploads | Authenticated users can upload media/AI images up to MB-scale limits. | storage/request cost, CPU pressure from image processing, AI provider load. | Medium. | Medium | Avatar/user-food request size limits; media processor max upload 8 MB; AI scan routes up to 25 MB. | Add per-user daily upload counters; reject repeated failed uploads; track R2 object growth and AI image size histograms. | Backend | Open |
| SR-13 | Gemini | Gemini quota is the likely first product bottleneck. | AI features unavailable or poor UX during public beta. | High. | High | `GEMINI_RPD_LIMIT=20`, RPM 5, TPM 250000 in `render.yaml`; `gemini_pool.py` enforces cooldown/quota states. | Define user-level AI quotas, cache repeated prompts, expose clear quota UX, decide paid Gemini budget before public production. | AI/product | Open |
| SR-14 | Gemini/admin | Admin runtime key management endpoints are powerful. | AI key theft, unauthorized key deletion, disabled AI runtime. | Low to medium due auth policies. | High | `AdminAIController` uses `RuntimeKeysManage/Delete`; backend has admin capability policies. | Audit admin membership; require MFA/strong auth externally; log all key mutations; rehearse key disable/rollback. | Backend/admin | Open |
| SR-15 | Google/Firebase | OAuth client ID and package/SHA drift can break Google Sign-In. | login outage for Google users. | Medium. | Medium | `app.config.js` requires Google env for production; docs/AUTH_AND_INFRA records Google credentials steps. | Maintain credential matrix for web/android/iOS/debug/release; verify release SHA-1/SHA-256 before store build. | Mobile | Open |
| SR-16 | Firebase | Firebase Crashlytics is no-cost, but adding paid Firebase products later changes billing risk. | accidental Blaze costs if Storage/Functions/Hosting are added. | Low now. | Medium | Current mobile deps include Firebase app/crashlytics only; docs/29 says not to use Firebase Storage by default. | Keep Firebase limited to Crashlytics/Google integration unless a new risk review approves paid products. | Mobile | Monitor |
| SR-17 | Expo/EAS | `EXPO_PUBLIC_*` values are embedded in the app bundle and must never contain secrets. | secret disclosure in distributed APK/IPA. | Medium. | High | `app.config.js`, `eas.json`; Expo docs state public-prefixed vars are exposed/plain text. | Keep only public identifiers in `EXPO_PUBLIC_*`; keep API keys/server secrets in Render/EAS secret env only if not public-prefixed. | Mobile/release | Monitor |
| SR-18 | Expo/EAS | Preview and production build profiles can drift or point at wrong backend. | wrong environment release, smoke traffic to prod, broken auth/media. | Medium. | High | `eas.json` hardcodes preview backend dev and production backend prod; smoke scripts contain guards. | Add prebuild check that prints API/Supabase/R2 target and fails if profile-target mismatch; keep `smoke:guard:media-egress`. | Mobile/release | Open |
| SR-19 | Brevo | Forgot-password/verification endpoints can be abused to send email. | sender reputation damage, rate-limit 429, account suspension. | Medium. | Medium | Auth endpoints are anonymous with `AuthPolicy`; Brevo API key in env; Brevo docs define 429/rate limits. | Add per-email and per-IP cooldowns if not already sufficient; monitor bounce/complaint metrics; handle Brevo 429 explicitly. | Backend | Open |
| SR-20 | Vercel/admin origins | Wildcard Vercel/onrender origins are allowed in production CORS. | broader browser-origin attack surface if a preview/admin app is compromised. | Medium. | Medium | `appsettings.Production.json` allows `https://*.onrender.com` and `https://*.vercel.app`. | Replace broad wildcards with exact admin/custom domains before public production; keep preview-only origins out of prod. | Backend/admin | Open |
| SR-21 | GitHub Actions | CI currently covers build/test but not all production risk gates. | regressions merge without quota/security/runbook evidence. | Medium. | Medium | `.github/workflows/ci.yml`; release scripts exist in mobile package. | Add CI docs gate for risk register/mojibake/secret scan; keep release gate manual until provider quotas are stable. | Repo owner | Open |
| SR-22 | Observability | No unified service budget/usage dashboard across Supabase, R2, Render, Gemini and Brevo. | late detection of quota/cost incidents. | High. | High | Usage is checked manually in dashboard screenshots/docs; no central budget doc except media egress reports. | Add weekly ops checklist and threshold table below; optionally automate read-only usage snapshots when APIs support it. | Project owner | Open |

## Cost And Quota Watchlist

| Provider | Current known risk | Trigger | Action |
| --- | --- | --- | --- |
| Render | Free plan build pipeline minutes exhausted. | Any production deploy status not `live` for current commit; `pipeline_minutes_exhausted` event. | Stop release, restore quota/upgrade, redeploy, verify `/health/ready`. |
| Supabase | Free cached/uncached egress limits are small; media incident already occurred. | cached egress > 60 percent monthly quota or any app primary URL returning Supabase Storage media. | Keep R2 primary, enable media budget mode, audit top media paths. |
| Supabase DB/Auth | Single shared project and unclear off-site backup cadence. | DB size trend > 60 percent free quota, backup not tested in last 30 days. | Export DB, rehearse restore, evaluate Pro/PITR. |
| Cloudflare R2 | Class A/B operation growth and public `r2.dev` use. | Class B approaches 50 percent free tier or public launch planned. | Add custom domain, monitor ops, avoid repeated HEAD/read probes. |
| Gemini | Low local RPD/RPM limits and provider quota uncertainty. | 429/quota errors, RPD usage > 60 percent, AI success rate < 95 percent. | Reduce AI calls, cache, raise budget/paid quota, show user-facing quota UX. |
| Brevo | Transactional email rate/sender reputation. | 429, bounce/complaint spike, reset spam. | Add cooldowns, monitor Brevo dashboard, pause abused endpoint if needed. |
| Expo/EAS | Public env variables and profile drift. | Build profile target differs from intended backend/Supabase; secrets added to `EXPO_PUBLIC_*`. | Fail build preflight; move secrets to server-side env only. |
| Firebase/Google | OAuth client/SHA drift. | Google login failure after release build or package/signing change. | Verify OAuth client matrix and release fingerprints before store rollout. |

## Production Readiness Checklist

Before public production:

- [ ] Rotate/revoke exposed Supabase, Render and Cloudflare/R2 credentials.
- [ ] Redeploy `eatfitai-backend` after Render pipeline minutes recover; confirm latest production deploy is `live` on current commit.
- [ ] Move R2 from `r2.dev` to a custom domain and update `Media__PublicBaseUrl`.
- [ ] Replace broad production CORS wildcards with exact approved domains.
- [ ] Split Supabase dev/staging/production or document why shared project remains acceptable for beta.
- [ ] Add off-site DB backup/export runbook and complete one restore rehearsal.
- [ ] Add weekly quota review for Render, Supabase, R2, Gemini and Brevo.
- [ ] Confirm no `EXPO_PUBLIC_*` variable contains private keys, service-role keys, API tokens or secrets.
- [ ] Verify Google OAuth web/android/iOS client IDs and release SHA fingerprints.
- [ ] Define AI usage policy: per-user daily AI budget, graceful quota UX and paid quota decision.
- [ ] Keep media release gate: no primary catalog thumbnail > `100 KB`, no detail image > `350 KB`, no primary Supabase Storage URL.
- [ ] Keep `python scripts\cloud\check_mojibake.py`, `python scripts\cloud\check_secret_tracking.py` and `git diff --check` in release checklist.

## Notes On Existing Controls

Controls already present in the repo:

- Backend has JWT auth, admin authorization policies, rate limiting policies, health checks, request logging and security headers in `Program.cs`.
- AI provider internal endpoints require `AI_PROVIDER_INTERNAL_TOKEN`.
- Media pipeline now creates optimized `thumb` and `medium` variants with R2 support.
- Mobile smoke/release scripts include media egress guard behavior.
- Repo secret scan and mojibake scan exist under `scripts/cloud`.

Important gaps:

- Provider dashboards are still mostly manual; alerts are not unified.
- Production deploy is currently blocked by Render quota.
- Production app has R2 thumbnail data through DB migration, but needs redeploy for full latest runtime shape such as `imageVariants`.

## Sources

Access date for all sources: 2026-04-27.

- Render Free plan: https://render.com/docs/free
- Render Build Pipeline: https://render.com/docs/build-pipeline
- Render environment variables and secrets: https://render.com/docs/configure-environment-variables
- Render secrets handling article: https://render.com/articles/how-render-handles-secrets-and-environment-variables
- Supabase egress usage: https://supabase.com/docs/guides/platform/manage-your-usage/egress
- Supabase egress troubleshooting: https://supabase.com/docs/guides/troubleshooting/all-about-supabase-egress-a_Sg_e
- Supabase Storage scaling: https://supabase.com/docs/guides/storage/production/scaling
- Supabase Database Backups: https://supabase.com/docs/guides/platform/backups
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare R2 public buckets: https://developers.cloudflare.com/r2/data-access/public-buckets/
- Expo EAS environment variables: https://docs.expo.dev/eas/environment-variables
- Expo `eas.json` build profiles: https://docs.expo.dev/build/eas-json/
- Expo environment variables: https://docs.expo.dev/guides/environment-variables/
- Firebase pricing: https://firebase.google.com/pricing
- Firebase pricing plans: https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- Google Sign-In backend authentication: https://developers.google.com/identity/sign-in/android/backend-auth
- Google Identity Services for Android: https://developers.google.com/identity/sign-in/android/sign-in-identity
- Gemini API rate limits: https://ai.google.dev/gemini-api/docs/quota
- Brevo API rate limits: https://developers.brevo.com/docs/api-limits
- Brevo transactional email API: https://developers.brevo.com/docs/send-a-transactional-email
- Vercel environment variables: https://vercel.com/docs/environment-variables
- GitHub Actions encrypted secrets: https://docs.github.com/en/actions/reference/encrypted-secrets
