# What to do when a task is completed

- Run only the checks relevant to the area you touched, but always verify the closest adjacent flow.
- Backend changes:
  - `dotnet build .\eatfitai-backend\EatFitAI.API.csproj`
  - `dotnet test .\eatfitai-backend\EatFitAI.API.Tests.csproj`
- Mobile changes:
  - `cd .\eatfitai-mobile; npm run lint`
  - `cd .\eatfitai-mobile; npm run typecheck`
  - `cd .\eatfitai-mobile; npm run test`
- AI provider changes:
  - start the service locally when feasible: `cd .\ai-provider; python app.py`
  - verify `curl http://127.0.0.1:5050/healthz`
- Environment/setup changes:
  - `powershell -ExecutionPolicy Bypass -File .\tools\dev\Invoke-DevPreflight.ps1`
- Mobile end-to-end/smoke relevant changes:
  - `cd .\eatfitai-mobile; npm run appium:smoke`
- Before closing a task, call out any pre-existing failures separately from new failures.
- Existing docs already mention that build health may not be fully green at baseline; do not assume every failing test or typecheck was introduced by the current change.
- Re-check encoding before finishing if you touched Vietnamese text or older markdown files with visible mojibake.
