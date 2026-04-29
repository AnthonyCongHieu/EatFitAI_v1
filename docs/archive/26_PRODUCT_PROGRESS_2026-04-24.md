# Product Progress 2026-04-24

## Summary

This snapshot records the current execution state after the latest stabilization, Render rollout, and cloud smoke work on `2026-04-24`.

- Active branch at time of writing: `hieu_deploy/production`
- Current origin/live commit: `b8b726dc` (`fix(smoke): match verification email by expiry`)
- Render status at verification time:
  - `eatfitai-backend` = `live` on `b8b726dc`
  - `eatfitai-ai-provider` = `live` on `b8b726dc`
- Cloud proof closed in this run:
  - `smoke:render:verify` = pass
  - `smoke:preflight` = pass
  - `smoke:auth:api` = pass
- Important caveat still open:
  - `smoke:ai:api` is not yet closed because the smoke script is currently failing on a UTF-8 BOM while reading JSON fixture data; this is a harness/parser issue, not proof of a live provider outage
- Android real-device certification is still not closed end-to-end in this snapshot
- Render free-plan limitations still remain outside code scope:
  - cold start
  - sleep
  - no commercial SLA

## What was completed in this cycle

### 1. Release gate and Android automation hardening already pushed before the final cloud verification

| Commit | Scope | Why it mattered |
|---|---|---|
| `8aa774e3` | `chore: harden production release gates` | Tightened release gate behavior so cloud/device checks are more deterministic |
| `4b78ca37` | `fix(android): require explicit release gate target` | Prevented ambiguous Android release gate execution |
| `e2989236` | `test(android): add real-device automation lanes` | Added real-device test lanes needed for release-style evidence collection |
| `c8fe0f95` | `fix(android): harden MIUI real-device helpers` | Stabilized MIUI helper scripts, improved device selection, scrcpy wrapper behavior, and Maestro helper process handling |

### 2. Auth/cloud reliability fixes pushed during this execution chain

| Commit | Scope | Why it mattered |
|---|---|---|
| `24400c36` | `fix(smoke): harden auth cleanup flow` | Reduced false negatives around cleanup verification and made account cleanup evidence more trustworthy |
| `893fc986` | `fix(smoke): cover telemetry cleanup edge cases` | Tightened telemetry cleanup and mailbox-selection edge handling in auth smoke |
| `f547d0cf` | `fix(api): wrap profile delete transaction in execution strategy` | Fixed the backend-side transactional cleanup path so account deletion could complete reliably against the production database/runtime |
| `b8b726dc` | `fix(smoke): match verification email by expiry` | Solved the resend-verification mailbox race by matching the verification email against the exact expiry timestamp returned by the API |

## Detailed status by area

### Auth and account lifecycle

The main production-facing auth blocker in this run was no longer the backend contract itself. After `f547d0cf`, the backend was able to complete profile/account cleanup correctly, and the remaining instability was in the smoke harness choosing the wrong verification email when multiple mailbox messages existed close together.

What changed:

- `../../eatfitai-mobile/scripts/lib/disposable-mail.js`
  - Added `introIncludes` support so the selector can match the verification email body more precisely
  - Preserved ordering safely when timestamps tie
- `../../eatfitai-mobile/scripts/production-smoke-auth-api.js`
  - Added `formatMailTimestamp()`
  - Matched the resend verification email using the exact `verificationCodeExpiresAt` value returned by the backend

Why this mattered:

- Earlier auth smoke attempts on `2026-04-24` could pick an older verification email from the same mailbox and then fail verification even though the backend was healthy
- After the selector fix, auth smoke passed both before push and after push against the live Render backend

Verification outcome:

- Auth smoke pass before push:
  - [auth-api-report.json](../../_logs/production-smoke/auth-api-2026-04-24T10-17-38-691Z/auth-api-report.json)
- Auth smoke pass after push/live:
  - [auth-api-report.json](../../_logs/production-smoke/auth-api-2026-04-24T10-23-00-722Z/auth-api-report.json)

Key observed result from the passing live run:

- `passed = true`
- `failureCount = 0`
- cleanup delete request returned `200`
- cleanup payload confirmed:
  - no surviving access token
  - no surviving refresh token
  - message `Tai khoan da duoc xoa thanh cong`

Additional safety verification:

- The final auth report was scanned for obvious token/password leakage patterns after the smoke run
- No unintended secret/token matches were found in the resulting report artifact

### Render deploy and cloud runtime

The repo and Render deployment are now aligned on the same commit.

Verified state at the end of this run:

- local branch `hieu_deploy/production` is in sync with `origin/hieu_deploy/production`
- latest pushed commit is `b8b726dc`
- Render API verification confirmed:
  - backend `live` on `b8b726dc`
  - aiProvider `live` on `b8b726dc`

Cloud gates closed successfully after the live rollout:

- Render deployment verification:
  - [render-verify.json](../../_logs/production-smoke/2026-04-24T10-24-23-595Z/render-verify.json)
- Preflight verification:
  - [preflight-results.json](../../_logs/production-smoke/2026-04-24T10-24-23-308Z/preflight-results.json)

Important preflight confirmations from the pass:

- `backendLive = 200`
- `backendReady = 200`
- `aiProviderHealthz = 200`
- `authEnabled = true`
- `aiStatus = 200`
- `refresh = 200`

This means the deployment chain currently has evidence for:

- Render auto-deploy reaching the expected commit
- public health endpoints being healthy
- auth being enabled on the live backend
- refresh token flow being reachable
- backend-to-ai-provider health communication being up

### Android automation, MIUI, and device-control path

The Android/device work in this cycle focused on reducing MIUI-specific friction before re-entering full release certification.

What was hardened in `c8fe0f95`:

- `../../eatfitai-mobile/scripts/open-scrcpy-miui.ps1`
  - added serial-aware handling
  - refuses ambiguous multi-device states when a serial is not explicit
  - improved process-liveness checks instead of relying on brittle early window detection
- `../../eatfitai-mobile/scripts/run-maestro-miui.ps1`
  - auto-detects a single ADB device when safe
  - refuses multi-device ambiguity without an explicit serial
  - fixes MIUI prompt text handling
  - reads process output asynchronously to avoid deadlock behavior

What was verified:

- PowerShell parsing for the updated helper scripts
- scrcpy wrapper behavior on a real connected device path:
  - the wrapper correctly recognized an already-running scrcpy session instead of incorrectly failing early

What is still not closed:

- full real-device release-like certification
- final device evidence bundle with screenshots/logcat for the complete release gate path
- final decision on primary E2E stack for long-lived device automation after MIUI friction

### AI/provider deep smoke status

This area is partially verified but not fully closed.

What is already proven:

- AI provider health endpoint is healthy in preflight
- backend `aiStatus` request returned `200`
- live Render service for the AI provider is on the expected commit

What is not yet proven in this snapshot:

- `smoke:ai:api` full pass

Current blocker:

- the `smoke:ai:api` run failed locally in the harness with:
  - `SyntaxError: Unexpected token` caused by a UTF-8 BOM while parsing JSON fixture input
- the failing script is:
  - `../../eatfitai-mobile/scripts/production-smoke-ai-api.js`
- the immediate failing area is the `readJsonIfExists()` path while loading fixture/manifest JSON

Interpretation:

- this failure does **not** currently prove the live AI provider is broken
- it **does** mean the AI API smoke lane cannot yet be counted as passing evidence for this release snapshot

### Documentation and traceability

This report is intentionally being written as a dated snapshot because:

- `docs/STABILIZATION_PLAN.md` currently shows mojibake/encoding corruption and is risky to extend directly
- `docs/README.md` also shows encoding damage
- a dated snapshot keeps this run auditable without adding more risk to already-corrupted files

## Evidence timeline for 2026-04-24

### Passing artifacts

- Render verify pass:
  - [render-verify.json](../../_logs/production-smoke/2026-04-24T10-24-23-595Z/render-verify.json)
- Preflight pass:
  - [preflight-results.json](../../_logs/production-smoke/2026-04-24T10-24-23-308Z/preflight-results.json)
- Auth smoke pass before push:
  - [auth-api-report.json](../../_logs/production-smoke/auth-api-2026-04-24T10-17-38-691Z/auth-api-report.json)
- Auth smoke pass after push/live:
  - [auth-api-report.json](../../_logs/production-smoke/auth-api-2026-04-24T10-23-00-722Z/auth-api-report.json)

### Earlier failed debug attempts that led to the final fix

- Mailbox mismatch / wrong verification message selected:
  - [auth-api-report.json](../../_logs/production-smoke/auth-api-2026-04-24T10-09-55-863Z/auth-api-report.json)
- Retry/wait behavior still not selecting the correct resend message reliably:
  - [auth-api-report.json](../../_logs/production-smoke/auth-api-2026-04-24T10-10-57-137Z/auth-api-report.json)

These failures are still valuable evidence because they explain why `b8b726dc` was necessary and what exact race condition it removed.

## Current ready / not-ready split

### Ready with evidence in this snapshot

- Git origin contains the latest stabilization fixes
- Render backend is live on the expected commit
- Render AI provider is live on the expected commit
- Cloud deployment verification passes
- Cloud preflight verification passes
- Live auth API smoke passes
- Account cleanup from auth smoke completes with HTTP `200`

### Improved but not closed

- Android real-device release certification
- MIUI helper reliability in a full end-to-end lane
- deep AI API smoke beyond health/status
- full release-gate evidence bundle that combines device and cloud proof in one final signoff package

### Still outside code-only closure

- Render free-plan uptime/SLA limitations
- operational monitoring/alerting/backup/secret rotation runbook execution on the actual services

## Practical readiness reading

Compared to the earlier `89% production-ready` working estimate, this run materially improved confidence in the cloud auth/deploy side because the following are now backed by fresh evidence on the live stack:

- current commit reached both Render services
- health and readiness are green
- auth verification/resend flow is stable under the updated smoke selector
- cleanup/delete path now completes successfully

This snapshot still should **not** be treated as `95%+ fully closed production readiness` because the following remain open:

- `smoke:ai:api` is not yet green
- Android real-device certification is not yet fully rerun to completion after the latest changes
- Render free-tier operational caveats still apply

## Next actions from this exact state

1. Make the smoke JSON readers BOM-safe, starting with `production-smoke-ai-api.js`, then rerun `smoke:ai:api`.
2. Re-enter the real-device release-like lane using the hardened MIUI/scrcpy helpers and collect the final evidence bundle.
3. Re-check lint warning count and unresolved moderate npm advisories if the goal is to move the readiness score again.
4. Close the external ops tasks that code cannot finish:
   - monitoring
   - alerting
   - backup posture
   - secret rotation confirmation
   - paid-instance/SLA decision
