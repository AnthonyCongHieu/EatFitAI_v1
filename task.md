# Security Remediation - Task Tracker

## Phase 1 - Secret Rotation & Git Hygiene
- [x] Replace secrets in `appsettings.Development.json` with placeholders
- [x] Update `.gitignore` to prevent future secret commits
- [x] Remove hardcoded demo credential fallbacks in `Program.cs`
- [x] Clean demo credential fallback in `ScanDemoReliabilitySeeder.cs`
- [x] Create `docs/SECRETS_SETUP.md` developer guide

## Phase 2 - Admin Auth: HttpOnly Cookie Session
- [x] Create `src/app/api/auth/session/route.ts`
- [x] Modify `login/page.tsx` - remove JS cookie, use session API
- [x] Modify `apiClient.ts` - remove cookie reading/Bearer fallback
- [x] Update proxy routes to read HttpOnly cookie server-side

## Phase 3 - Fail-Closed Startup Contracts
- [x] `EncryptionService.cs` - throw on missing key
- [x] `app.py` - deny internal requests when token unset
- [x] `admin-access.ts` - remove default email fallback

## Phase 4 - Endpoint Hardening
- [x] `AdminController.cs` - remove `AllowAnonymous` from keep-alive, strip inventory
- [x] `runtime-config/route.ts` - add auth, strip infra details
- [x] `keep-alive/route.ts` - add auth, reduce payload
- [x] `HealthController.cs` - add true readiness endpoint
- [x] `test-control/route.ts` - add production guard

## Phase 5 - Error Response Standardization
- [x] Create `ErrorResponseHelper.cs`
- [x] Fix `AIController.cs` - remove raw 500/503/504 error detail leaks
- [x] Fix `AuthController.cs` - remove raw 500/503 leaks while keeping intentional auth/validation messages
- [x] Fix `FoodController.cs` - remove raw 500 error detail leaks
- [x] Fix `NutritionController.cs` - remove raw backend/provider error detail leaks
- [x] Fix `VoiceController.cs` - remove raw provider/detail payload leaks

## Phase 6 - Re-Audit & Verification
- [x] Run `dotnet test`
- [x] Run `python -m py_compile`
- [x] Run admin `npm run typecheck` + `npm run build`
- [x] Run `git grep` to verify no tracked default secrets remain
- [x] Create remediation report doc

## Phase 7 - Security Automation & Live Rollout
- [x] Create `tools/security-ops/targets.json`
- [x] Create `tools/security-ops/security_ops.py`
- [x] Create `tools/security-ops/README.md` + `.env.example`
- [x] Create `docs/21_SECURITY_LIVE_ROLLOUT_RUNBOOK_2026-04-16.md`
- [x] Add JWT previous-key validation test
- [x] Add Render env contract for `AIProvider__InternalToken`
- [x] Remove remaining raw provider/detail leaks in `AIController.cs`, `AdminAIController.cs`, and `AdminRuntimeController.cs`
- [x] Execute live Supabase DB password rotation
- [x] Execute live zero-downtime JWT rotation
- [x] Execute live AI provider internal token rotation
- [ ] Execute live Firebase restriction update
- [ ] Execute git history rewrite on mirror clone

## Notes

- Live mutations completed in this pass:
  - Render shared internal token rotated and verified healthy.
  - Supabase DB password rotated and synced to Render backend.
  - Render `Jwt__Key` rotated and `Jwt__PreviousKeys` populated on live env.
  - Vercel production env synced for `API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL`, `AUTH_COOKIE_NAME`, and `NEXT_PUBLIC_APP_NAME`.
- Remaining external blocker:
  - Firebase restriction still needs `GOOGLE_OAUTH_ACCESS_TOKEN` or a working `gcloud auth` session.
- GitHub note:
  - `EatFitAI_Admin` still returns `422 Secret scanning is not available for this repository`.
- History rewrite note:
  - The automation targets were narrowed to avoid deleting tracked `.env.example` files.
  - Destructive force-push history rewrite has not been executed yet in this pass.
