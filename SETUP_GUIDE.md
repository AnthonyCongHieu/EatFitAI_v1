# EatFitAI Windows Setup Guide

This is the canonical onboarding guide for local development.

## 0. One-command bootstrap

If the machine already has the required base runtimes installed, bootstrap the portable dev environment with:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Setup-WindowsPortableDevEnvironment.ps1
```

This provisions the Appium lane, repairs the Android SDK command-line toolchain, creates the standard AVD, and runs the repo preflight.

## 1. Required versions

- Node `20.x`
- .NET SDK `9.0.306`
- Python `3.11`
- Java `17`
- SQL Server 2022 Developer
- Android Studio with:
  - `cmdline-tools`
  - `platform-tools`
  - `emulator`
  - Android 14 / API 34 / Google APIs Play Store / x86_64 system image

Version pin files in this repo:

- `.nvmrc`
- `.python-version`
- `global.json`

## 2. Backend secrets

Backend secrets must be stored per machine with `dotnet user-secrets`.

Project:

```powershell
dotnet user-secrets list --project .\eatfitai-backend\EatFitAI.API.csproj
```

Required keys:

- `ConnectionStrings:DefaultConnection`
- `Jwt:Key`
- `Smtp:Host`
- `Smtp:Port`
- `Smtp:User`
- `Smtp:Password`
- `Smtp:FromEmail`

Detailed commands are documented in [JWT_CONFIGURATION.md](/D:/EatFitAI_v1/JWT_CONFIGURATION.md).

## 3. Local SQL Server

The canonical local database is `EatFitAI` on a local SQL Server instance.

Important:

- `sqdate13thang3t.sql` is a raw snapshot and contains machine-specific MDF/LDF paths.
- Use the portable restore script instead of importing the raw file directly.

Portable restore:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Restore-EatFitAI-PortableSnapshot.ps1
```

Verify database health:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Test-EatFitAIDatabase.ps1
```

## 4. AI provider

Create a local env file from the example:

```powershell
Copy-Item .\ai-provider\.env.example .\ai-provider\.env
```

Expected local defaults:

- `OLLAMA_URL=http://localhost:11434`
- `OLLAMA_MODEL=qwen2.5:3b`

`best.pt` should live in `ai-provider\` and is not committed to git.

Start AI provider:

```powershell
cd .\ai-provider
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Health check:

```powershell
curl http://127.0.0.1:5050/healthz
```

## 5. Backend

Start backend:

```powershell
cd .\eatfitai-backend
dotnet restore
dotnet run
```

Expected local URL:

- `http://localhost:5247`

## 6. Mobile

Create local mobile env if needed:

```powershell
Copy-Item .\eatfitai-mobile\.env.development.example .\eatfitai-mobile\.env.development
```

Default emulator config:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5247
```

Start mobile:

```powershell
cd .\eatfitai-mobile
npm install
npm run dev
```

## 7. Android emulator-first lane

Recommended AVD:

- Device: `Pixel 7`
- API: `34`
- Image: `Google APIs Play Store x86_64`

Provision or repair the Android SDK command-line toolchain, required packages, and AVD with:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Install-AndroidSdkComponents.ps1 -PersistUserEnvironment
```

The emulator is the default dev + Appium lane.
Use a physical device only for sanity checks, camera validation, and live demo rehearsal.

## 8. Appium + MCP

The repo includes an Appium smoke lane in `tools/appium`.

Local setup:

```powershell
npm install -g appium
appium driver install uiautomator2
cd .\tools\appium
npm install
```

Then start Appium:

```powershell
appium
```

See [tools/appium/README.md](/D:/EatFitAI_v1/tools/appium/README.md) for selectors, env vars, and smoke flow details.

## 9. One-command preflight

Run the preflight before coding on a fresh machine:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Invoke-DevPreflight.ps1
```

The environment is considered ready only when the preflight reports:

- toolchain present
- `ollama` present
- user-secrets present
- SQL Server reachable
- `EatFitAI` database present
- AI provider health reachable
- backend buildable
- Android tooling available
- Android AVD available
- Appium tooling available
