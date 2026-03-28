# Suggested commands for EatFitAI on Windows

## General Windows shell
- List files: `Get-ChildItem -Force`
- Recursive search: `Get-ChildItem -Recurse`
- Find text: `Select-String -Path .\* -Pattern "text" -CaseSensitive`
- Git status: `git status --short`

## Repo-wide environment/bootstrap
- Portable bootstrap: `powershell -ExecutionPolicy Bypass -File .\tools\dev\Setup-WindowsPortableDevEnvironment.ps1`
- Preflight: `powershell -ExecutionPolicy Bypass -File .\tools\dev\Invoke-DevPreflight.ps1`
- Portable DB restore: `powershell -ExecutionPolicy Bypass -File .\tools\dev\Restore-EatFitAI-PortableSnapshot.ps1`
- DB health check: `powershell -ExecutionPolicy Bypass -File .\tools\dev\Test-EatFitAIDatabase.ps1`
- Move Android/Ollama storage to D: `powershell -ExecutionPolicy Bypass -File .\tools\dev\Relocate-WindowsDevStorage.ps1`
- Android/Appium setup: `powershell -ExecutionPolicy Bypass -File .\tools\dev\Install-AndroidSdkComponents.ps1 -PersistUserEnvironment`
- Appium setup: `powershell -ExecutionPolicy Bypass -File .\tools\dev\Install-Appium.ps1`

## Backend (`eatfitai-backend`)
- Restore: `dotnet restore .\eatfitai-backend\EatFitAI.API.csproj`
- Run: `dotnet run --project .\eatfitai-backend\EatFitAI.API.csproj`
- Test: `dotnet test .\eatfitai-backend\EatFitAI.API.Tests.csproj`
- User secrets: `dotnet user-secrets list --project .\eatfitai-backend\EatFitAI.API.csproj`

## Mobile (`eatfitai-mobile`)
- Install deps: `cd .\eatfitai-mobile; npm install`
- Dev server: `cd .\eatfitai-mobile; npm run dev`
- Emulator lane: `cd .\eatfitai-mobile; npm run dev:emulator`
- Android build/run: `cd .\eatfitai-mobile; npm run android`
- Lint: `cd .\eatfitai-mobile; npm run lint`
- Typecheck: `cd .\eatfitai-mobile; npm run typecheck`
- Tests: `cd .\eatfitai-mobile; npm run test`
- Generate API/types: `cd .\eatfitai-mobile; npm run typegen`
- Appium smoke through mobile script: `cd .\eatfitai-mobile; npm run appium:smoke`

## AI provider (`ai-provider`)
- Create env file: `Copy-Item .\ai-provider\.env.example .\ai-provider\.env`
- Create venv: `cd .\ai-provider; python -m venv venv`
- Activate venv: `cd .\ai-provider; .\venv\Scripts\Activate.ps1`
- Install deps: `cd .\ai-provider; pip install -r requirements.txt`
- Run service: `cd .\ai-provider; python app.py`
- Health check: `curl http://127.0.0.1:5050/healthz`

## Appium lane (`tools/appium`)
- Install deps: `cd .\tools\appium; npm install`
- Start server: `appium`
- Smoke: `cd .\tools\appium; npm run smoke:android`
