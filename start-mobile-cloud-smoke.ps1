. (Join-Path $PSScriptRoot '_config\dev-env.ps1')

$timestamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH-mm-ss-fffZ')
$sessionOutputDir = Join-Path $PSScriptRoot "_logs\production-smoke\$timestamp"

$env:APP_ENV = 'smoke'
$env:EXPO_PUBLIC_API_BASE_URL = 'https://eatfitai-backend.onrender.com'
$env:EXPO_PUBLIC_API_PORT = ''
$env:EXPO_PUBLIC_API_SCHEME = 'https'
$env:EXPO_PUBLIC_E2E_AUTOMATION = '0'
$env:EXPO_NO_DOTENV = '1'
$env:EATFITAI_SMOKE_OUTPUT_DIR = $sessionOutputDir

New-Item -ItemType Directory -Path $sessionOutputDir -Force | Out-Null

Set-Location (Join-Path $PSScriptRoot 'eatfitai-mobile')

try {
    & adb.exe reverse tcp:8081 tcp:8081 | Out-Null
} catch {
    Write-Warning 'adb reverse tcp:8081 tcp:8081 failed. Dev client may need manual host configuration.'
}

Write-Host "[cloud-smoke] Session output: $sessionOutputDir"

Write-Host '[cloud-smoke] Generating Expo API config for cloud target...'
node .\scripts\generate-local-ip.js

Write-Host '[cloud-smoke] Verifying API target...'
node .\scripts\check-api-target.js

Write-Host '[cloud-smoke] Running cloud health preflight...'
node .\scripts\production-smoke-preflight.js

Write-Host '[cloud-smoke] Initializing request budget...'
node .\scripts\production-smoke-budget.js init

Write-Host '[cloud-smoke] Starting Expo for production smoke session...'
Write-Host "[cloud-smoke] EXPO_PUBLIC_API_BASE_URL=$($env:EXPO_PUBLIC_API_BASE_URL)"
Write-Host '[cloud-smoke] Dotenv loading disabled for this session (EXPO_NO_DOTENV=1).'
npx.cmd expo start --clear --dev-client --port 8081
