# Security Live Rotation Update - 2026-04-16

## Completed live actions

- GitHub:
  - `EatFitAI_v1` has `secretScanning=enabled` and `pushProtection=enabled`.
  - `EatFitAI_Admin` still returns `422 Secret scanning is not available for this repository`.
- Render:
  - Shared internal token was rotated for backend `AIProvider__InternalToken` and AI provider `AI_PROVIDER_INTERNAL_TOKEN`.
  - Backend `Jwt__Key` was rotated.
  - Backend `Jwt__PreviousKeys` is now present in live env.
- Supabase:
  - Database password rotation completed through the Management API.
  - Render backend connection string was updated and backend health recovered after deploy.
- Vercel:
  - Production env sync completed for:
    - `API_BASE_URL`
    - `NEXT_PUBLIC_API_BASE_URL`
    - `AUTH_COOKIE_NAME`
    - `NEXT_PUBLIC_APP_NAME`

## Live verification snapshot

- Backend readiness:
  - `https://eatfitai-backend.onrender.com/health/ready` returned `200`.
- AI provider health:
  - `https://eatfitai-ai-provider.onrender.com/healthz` returned `200`.
- Inventory status:
  - Render backend shows configured fingerprints for:
    - `ConnectionStrings__DefaultConnection`
    - `AIProvider__InternalToken`
    - `Jwt__Key`
    - `Jwt__PreviousKeys`
  - Supabase project `bjlmndmafrajjysenpbm` is `ACTIVE_HEALTHY`.
  - Vercel project `prj_Z1FYSyVnmdQUy7YVRSaFgWK9kNkr` is reachable with `8` env entries in inventory.

## Code re-applied to match live rollout

- Backend JWT validation now uses a key ring so `Jwt:PreviousKeys` can validate grace-window tokens.
- Unit coverage includes `ValidateTokenAsync_TokenSignedByPreviousKey_ReturnsTrue`.
- `render.yaml` now declares:
  - `Jwt__PreviousKeys`
  - `AIProvider__InternalToken`
- Raw upstream error detail was removed from:
  - `AIController.cs`
  - `AdminAIController.cs`
  - `AdminRuntimeController.cs`
- `tools/security-ops/security_ops.py` now:
  - sends a stable browser-like `User-Agent` for Supabase Management API calls
  - avoids duplicated Vercel targets when `--target production` is passed
- `tools/security-ops/targets.json` now uses narrower history-rewrite globs:
  - `**/.env`
  - `**/.env.local`
  - `**/.env.*.local`

## Remaining blocker

- Firebase restriction is still blocked because there is no `GOOGLE_OAUTH_ACCESS_TOKEN` or working `gcloud auth` session on this machine.
- Release SHA-1 is already known from repo docs:
  - `83:FF:A6:99:53:2E:D1:05:1A:38:53:5C:7B:01:E2:1D:5F:41:C5:1F`

## History rewrite status

- Planning and target cleanup were updated.
- Destructive force-push history rewrite was intentionally not executed in this pass.
- Reason:
  - `google-services.json` is still present in current `HEAD`, and the Firebase restriction lane has not been completed yet.
  - Running a broad rewrite before the Google lane is complete would create unnecessary deployment and developer workflow risk.
