# EatFitAI

EatFitAI is a Windows-first development workspace for a nutrition tracking app with:

- `eatfitai-mobile`: Expo / React Native client
- `eatfitai-backend`: ASP.NET Core 9 Web API
- `ai-provider`: local Python AI service for vision + Ollama-backed AI flows

## Canonical local setup

Use [SETUP_GUIDE.md](/D:/EatFitAI_v1/SETUP_GUIDE.md) as the single source of truth for local environment setup.

Key defaults:

- Node `20.x`
- .NET SDK `9.0.306`
- Python `3.11`
- Java `17`
- SQL Server 2022 Developer (local instance)
- Android emulator first, physical device as fallback
- Backend secrets stored in `dotnet user-secrets`

## Quick local profile

1. Restore or verify the local SQL Server database.
2. Configure backend `user-secrets`.
3. Start `ai-provider` on `http://127.0.0.1:5050`.
4. Start backend on `http://localhost:5247`.
5. Start mobile with `.env.development` pointing to `http://10.0.2.2:5247`.

## One-command physical device start

For Android physical device on the same LAN, use:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Start-EatFitAI-PhysicalDeviceLane.ps1
```

Disable voice STT warm-up if you only need non-voice flows:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Start-EatFitAI-PhysicalDeviceLane.ps1 -EnableStt:$false
```

This script:

- detects the current LAN IPv4
- rewrites `eatfitai-mobile\.env.development` to the current backend LAN URL
- starts `ai-provider`
- starts backend with `EatFitAI.API.csproj`
- starts Expo LAN mode for the phone

## Environment helper docs

- [SETUP_GUIDE.md](/D:/EatFitAI_v1/SETUP_GUIDE.md)
- [docs/README.md](/D:/EatFitAI_v1/docs/README.md)
- [docs/04_ENVIRONMENT_EXECUTION_PLAN.md](/D:/EatFitAI_v1/docs/04_ENVIRONMENT_EXECUTION_PLAN.md)
- [docs/11_RESULT_E2E_PRODUCTION_SMOKE.md](/D:/EatFitAI_v1/docs/11_RESULT_E2E_PRODUCTION_SMOKE.md)
- [docs/06_RUNTIME_AUDIT_SNAPSHOT_2026-03-14.md](/D:/EatFitAI_v1/docs/06_RUNTIME_AUDIT_SNAPSHOT_2026-03-14.md)
- [docs/07_NOTION_PLAN_GAP_AND_2PERSON_RESTRUCTURE_2026-03-14.md](/D:/EatFitAI_v1/docs/07_NOTION_PLAN_GAP_AND_2PERSON_RESTRUCTURE_2026-03-14.md)
- [JWT_CONFIGURATION.md](/D:/EatFitAI_v1/JWT_CONFIGURATION.md)
- [SECRETS_CHECKLIST.md](/D:/EatFitAI_v1/SECRETS_CHECKLIST.md)
- [ai-provider/README.md](/D:/EatFitAI_v1/ai-provider/README.md)
- [tools/appium/README.md](/D:/EatFitAI_v1/tools/appium/README.md)

## Current planning and audit docs

- Runtime truth snapshot: [docs/06_RUNTIME_AUDIT_SNAPSHOT_2026-03-14.md](/D:/EatFitAI_v1/docs/06_RUNTIME_AUDIT_SNAPSHOT_2026-03-14.md)
- Notion gap analysis and 2-person restructure proposal: [docs/07_NOTION_PLAN_GAP_AND_2PERSON_RESTRUCTURE_2026-03-14.md](/D:/EatFitAI_v1/docs/07_NOTION_PLAN_GAP_AND_2PERSON_RESTRUCTURE_2026-03-14.md)
- Documentation index: [docs/README.md](/D:/EatFitAI_v1/docs/README.md)

## Local verification

Run the Windows preflight after the basic tools are installed:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Invoke-DevPreflight.ps1
```

To restore the SQL snapshot in a portable way:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Restore-EatFitAI-PortableSnapshot.ps1
```

## Notes

- `sqdate13thang3t.sql` is kept as a snapshot reference, not as the canonical bootstrap flow.
- Backend machine-specific values must stay in `user-secrets`, not in tracked JSON files.
- Appium + MCP is supported through the emulator-first lane described in `tools/appium`.
- Production Result smoke should use `start-mobile-cloud-smoke.ps1` so the session targets Render without changing the local default lane.
